import { userStore } from '../../data/persist'
import { mirror } from '../../data/sync'
import { daysBetween, type ISODate } from '../../domain/dates'
import type { CarryLink, Priority, Routine, Task, TaskStatus } from '../../domain/types'

/** What a task looks like in the list — one tone per task, mirrored by the legend. */
export type TaskTone = 'open' | 'done' | 'missed' | 'carried' | 'carried-in'

export const toneOf = (t: Task): TaskTone =>
  t.carriedTo ? 'carried' : t.status !== 'open' ? t.status : t.carriedFrom ? 'carried-in' : 'open'

/** Only unfinished tasks that have not already moved on can be carried. */
export const canCarry = (t: Task) => t.status !== 'done' && !t.carriedTo

export const isPending = (t: Task) => t.status === 'open' && !t.carriedTo

/** A day has 24 hours to plan; a task carried away no longer takes any of them. */
export const DAY_MINUTES = 24 * 60
export const plannedMinutes = (tasks: Task[]) => tasks.reduce((sum, t) => sum + (t.carriedTo ? 0 : (t.minutes ?? 0)), 0)

/** High first, then medium, then goals with none, then low; ties keep the order they were added. */
const RANK: Record<Priority | 'none', number> = { high: 0, medium: 1, none: 2, low: 3 }
const byPriority = (a: Task, b: Task) => RANK[a.priority ?? 'none'] - RANK[b.priority ?? 'none'] || a.createdAt - b.createdAt

const fallsOn = (r: Routine, date: ISODate) =>
  date >= r.starts && !(r.ends && date >= r.ends) && !r.skipped.includes(date) && (r.every === 'day' || daysBetween(date, r.starts) % 7 === 0)

/**
 * The same id for the same repeating goal on the same day, on every device (a 128-bit hash
 * written as a uuid), so two devices filling in one day write to one row, not two.
 */
const occurrenceId = (routineId: string, date: ISODate) => {
  let [a, b, c, d] = [1779033703, 3144134277, 1013904242, 2773480762]
  for (const ch of `${routineId}/${date}`) {
    const k = ch.charCodeAt(0)
    ;[a, b, c, d] = [b ^ Math.imul(a ^ k, 597399067), c ^ Math.imul(b ^ k, 2869860233), d ^ Math.imul(c ^ k, 951274213), a ^ Math.imul(d ^ k, 2716044179)]
  }
  const hex = [a, b, c, d].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * A repeating goal's day exists only on screen until something is done to it (marked,
 * noted, carried); then it is saved like any other task. Nothing is written just by looking.
 */
const occurrence = (r: Routine, date: ISODate): Task => ({
  id: occurrenceId(r.id, date),
  date,
  title: r.title,
  note: '',
  status: 'open',
  minutes: r.minutes,
  priority: r.priority,
  routineId: r.id,
  createdAt: r.createdAt,
})

export const tasksOn = (tasks: Record<string, Task>, routines: Record<string, Routine>, date: ISODate) => {
  const saved = Object.values(tasks).filter((t) => t.date === date)
  const here = new Set(saved.map((t) => t.routineId))
  const due = Object.values(routines).filter((r) => !here.has(r.id) && fallsOn(r, date))
  return [...saved, ...due.map((r) => occurrence(r, date))].sort(byPriority)
}

const newTask = (date: ISODate, title: string, extra: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  date,
  title,
  note: '',
  status: 'open',
  createdAt: Date.now(),
  ...extra,
})

type Editable = Partial<Pick<Task, 'title' | 'note' | 'status' | 'minutes' | 'priority'>>

interface PlannerState {
  tasks: Record<string, Task>
  routines: Record<string, Routine>
  add: (date: ISODate, title: string) => void
  update: (task: Task, patch: Editable) => void
  /** Deletes a task; for a repeating goal, takes only that day off. */
  remove: (task: Pick<Task, 'id' | 'date' | 'routineId'>) => void
  /** Copies the task and its note to `toDate`; the original stays behind, marked as carried. */
  carry: (task: Task, toDate: ISODate) => void
  /** Makes the task repeat from its day on, changes how often, or stops it (`null`). */
  repeat: (task: Task, every: Routine['every'] | null) => void
}

export const usePlanner = userStore<PlannerState>('planner', (set) => ({
  tasks: {},
  routines: {},

  add: (date, title) =>
    set((s) => {
      const task = newTask(date, title)
      return { tasks: { ...s.tasks, [task.id]: task } }
    }),

  update: (task, patch) =>
    set((s) => {
      const routine = task.routineId ? s.routines[task.routineId] : undefined
      // Renaming, re-timing or re-ranking one day of a repeating goal changes the days still to come too.
      const shared = Object.fromEntries(Object.entries(patch).filter(([key]) => ['title', 'minutes', 'priority'].includes(key)))
      return {
        tasks: { ...s.tasks, [task.id]: { ...(s.tasks[task.id] ?? task), ...patch } },
        routines: routine && Object.keys(shared).length ? { ...s.routines, [routine.id]: { ...routine, ...shared } } : s.routines,
      }
    }),

  remove: ({ id, date, routineId }) =>
    set((s) => {
      const { [id]: gone, ...tasks } = s.tasks
      // Clear the link on the other end so no task points at a deleted one.
      const unlink = (link: CarryLink | undefined, side: 'carriedFrom' | 'carriedTo') => {
        if (link && tasks[link.taskId]) tasks[link.taskId] = { ...tasks[link.taskId], [side]: undefined }
      }
      unlink(gone?.carriedFrom, 'carriedTo')
      unlink(gone?.carriedTo, 'carriedFrom')
      const routine = routineId ? s.routines[routineId] : undefined
      return {
        tasks,
        routines: routine ? { ...s.routines, [routine.id]: { ...routine, skipped: [...routine.skipped, date] } } : s.routines,
      }
    }),

  carry: (task, toDate) =>
    set((s) => {
      const from = s.tasks[task.id] ?? task
      if (!canCarry(from) || toDate <= from.date) return s
      const copy = newTask(toDate, from.title, { note: from.note, minutes: from.minutes, priority: from.priority, carriedFrom: { taskId: from.id, date: from.date } })
      const carried = { ...from, carriedTo: { taskId: copy.id, date: toDate } }
      return { tasks: { ...s.tasks, [from.id]: carried, [copy.id]: copy } }
    }),

  repeat: (task, every) =>
    set((s) => {
      const current = task.routineId ? s.routines[task.routineId] : undefined
      if ((current?.every ?? null) === every) return s
      // A change counts from this day on: the old rhythm ends here, and a new one starts here.
      const routines = { ...s.routines }
      if (current && current.starts >= task.date) delete routines[current.id]
      else if (current) routines[current.id] = { ...current, ends: task.date }
      const next: Routine | undefined = every
        ? { id: crypto.randomUUID(), title: task.title, every, minutes: task.minutes, priority: task.priority, starts: task.date, skipped: [], createdAt: task.createdAt }
        : undefined
      if (next) routines[next.id] = next
      // Later days of the old rhythm that were saved but never touched go with it.
      const untouched = (t: Task) => !!current && t.routineId === current.id && t.date > task.date && t.status === 'open' && !t.note
      const tasks = Object.fromEntries(Object.entries(s.tasks).filter(([, t]) => !untouched(t)))
      tasks[task.id] = { ...(s.tasks[task.id] ?? task), routineId: next?.id }
      return { tasks, routines }
    }),
}))

/** A task as the `tasks` table stores it (supabase/migrations). */
interface TaskRow {
  id: string
  date: ISODate
  title: string
  note: string
  status: TaskStatus
  minutes: number | null
  priority: Priority | null
  routine_id: string | null
  carried_from_id: string | null
  carried_from_date: ISODate | null
  carried_to_id: string | null
  carried_to_date: ISODate | null
  created_at: string
}

const link = (taskId: string | null, date: ISODate | null): CarryLink | undefined => (taskId && date ? { taskId, date } : undefined)

mirror<PlannerState, Task, TaskRow>({
  table: 'tasks',
  store: usePlanner,
  records: (state) => Object.values(state.tasks),
  restore: (tasks) => ({ tasks: Object.fromEntries(tasks.map((t) => [t.id, t])) }),
  toRow: (t) => ({
    id: t.id,
    date: t.date,
    title: t.title,
    note: t.note,
    status: t.status,
    minutes: t.minutes ?? null,
    priority: t.priority ?? null,
    routine_id: t.routineId ?? null,
    carried_from_id: t.carriedFrom?.taskId ?? null,
    carried_from_date: t.carriedFrom?.date ?? null,
    carried_to_id: t.carriedTo?.taskId ?? null,
    carried_to_date: t.carriedTo?.date ?? null,
    created_at: new Date(t.createdAt).toISOString(),
  }),
  fromRow: (row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    note: row.note,
    status: row.status,
    minutes: row.minutes ?? undefined,
    priority: row.priority ?? undefined,
    routineId: row.routine_id ?? undefined,
    carriedFrom: link(row.carried_from_id, row.carried_from_date),
    carriedTo: link(row.carried_to_id, row.carried_to_date),
    createdAt: Date.parse(row.created_at),
  }),
})

/** A repeating goal as the `routines` table stores it. */
interface RoutineRow {
  id: string
  title: string
  every: Routine['every']
  minutes: number | null
  priority: Priority | null
  starts: ISODate
  ends: ISODate | null
  skipped: ISODate[]
  created_at: string
}

mirror<PlannerState, Routine, RoutineRow>({
  table: 'routines',
  store: usePlanner,
  records: (state) => Object.values(state.routines),
  restore: (routines) => ({ routines: Object.fromEntries(routines.map((r) => [r.id, r])) }),
  toRow: (r) => ({
    id: r.id,
    title: r.title,
    every: r.every,
    minutes: r.minutes ?? null,
    priority: r.priority ?? null,
    starts: r.starts,
    ends: r.ends ?? null,
    skipped: r.skipped,
    created_at: new Date(r.createdAt).toISOString(),
  }),
  fromRow: (row) => ({
    id: row.id,
    title: row.title,
    every: row.every,
    minutes: row.minutes ?? undefined,
    priority: row.priority ?? undefined,
    starts: row.starts,
    ends: row.ends ?? undefined,
    skipped: row.skipped,
    createdAt: Date.parse(row.created_at),
  }),
})
