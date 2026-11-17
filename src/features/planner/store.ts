import { userStore } from '../../data/persist'
import { mirror } from '../../data/sync'
import type { ISODate } from '../../domain/dates'
import type { CarryLink, Task, TaskStatus } from '../../domain/types'

/** What a task looks like in the list — one tone per task, mirrored by the legend. */
export type TaskTone = 'open' | 'done' | 'missed' | 'carried' | 'carried-in'

export const toneOf = (t: Task): TaskTone =>
  t.carriedTo ? 'carried' : t.status !== 'open' ? t.status : t.carriedFrom ? 'carried-in' : 'open'

/** Only unfinished tasks that have not already moved on can be carried. */
export const canCarry = (t: Task) => t.status !== 'done' && !t.carriedTo

export const isPending = (t: Task) => t.status === 'open' && !t.carriedTo

export const tasksOn = (tasks: Record<string, Task>, date: ISODate) =>
  Object.values(tasks)
    .filter((t) => t.date === date)
    .sort((a, b) => a.createdAt - b.createdAt)

const newTask = (date: ISODate, title: string, extra: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  date,
  title,
  note: '',
  status: 'open',
  createdAt: Date.now(),
  ...extra,
})

interface PlannerState {
  tasks: Record<string, Task>
  add: (date: ISODate, title: string) => void
  update: (id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'status'>>) => void
  remove: (id: string) => void
  /** Copies the task and its note to `toDate`; the original stays behind, marked as carried. */
  carry: (id: string, toDate: ISODate) => void
}

export const usePlanner = userStore<PlannerState>('planner', (set) => ({
  tasks: {},

  add: (date, title) =>
    set((s) => {
      const task = newTask(date, title)
      return { tasks: { ...s.tasks, [task.id]: task } }
    }),

  update: (id, patch) => set((s) => (s.tasks[id] ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], ...patch } } } : s)),

  remove: (id) =>
    set((s) => {
      const { [id]: gone, ...tasks } = s.tasks
      if (!gone) return s
      // Clear the link on the other end so no task points at a deleted one.
      const unlink = (link: CarryLink | undefined, side: 'carriedFrom' | 'carriedTo') => {
        if (link && tasks[link.taskId]) tasks[link.taskId] = { ...tasks[link.taskId], [side]: undefined }
      }
      unlink(gone.carriedFrom, 'carriedTo')
      unlink(gone.carriedTo, 'carriedFrom')
      return { tasks }
    }),

  carry: (id, toDate) =>
    set((s) => {
      const from = s.tasks[id]
      if (!from || !canCarry(from) || toDate <= from.date) return s
      const copy = newTask(toDate, from.title, { note: from.note, carriedFrom: { taskId: id, date: from.date } })
      const carried = { ...from, carriedTo: { taskId: copy.id, date: toDate } }
      return { tasks: { ...s.tasks, [id]: carried, [copy.id]: copy } }
    }),
}))

/** A task as the `tasks` table stores it (supabase/migrations). */
interface TaskRow {
  id: string
  date: ISODate
  title: string
  note: string
  status: TaskStatus
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
    carriedFrom: link(row.carried_from_id, row.carried_from_date),
    carriedTo: link(row.carried_to_id, row.carried_to_date),
    createdAt: Date.parse(row.created_at),
  }),
})
