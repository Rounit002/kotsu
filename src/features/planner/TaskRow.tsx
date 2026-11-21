import { formatDate, formatMinutes, type ISODate } from '../../domain/dates'
import type { Task, TaskStatus } from '../../domain/types'
import { build } from '../../ui/build'
import { CloseIcon, DoneIcon, NoteIcon, RepeatIcon } from '../../ui/icons'
import { toneOf, usePlanner } from './store'

const short = (date: ISODate) => formatDate(date, { day: 'numeric', month: 'short' })

const MARKS = [
  { status: 'done', label: 'Mark as done', Icon: DoneIcon },
  { status: 'missed', label: 'Mark as not done', Icon: CloseIcon },
] as const

interface Props {
  task: Task
  /** Its turn when the day is laid out. */
  order: number
  selected: boolean
  onSelect: () => void
}

export function TaskRow({ task, order, selected, onSelect }: Props) {
  const update = usePlanner((s) => s.update)
  // Pressing the active mark again clears it.
  const mark = (status: TaskStatus) => update(task, { status: task.status === status ? 'open' : status })

  return (
    <li className="task" data-tone={toneOf(task)} data-selected={selected || undefined} {...build('print', 24 + order, 4 + order)}>
      {MARKS.map(({ status, label, Icon }) => (
        <button
          key={status}
          className="mark"
          data-tone={status}
          aria-label={label}
          aria-pressed={task.status === status}
          disabled={!!task.carriedTo}
          onClick={() => mark(status)}
        >
          <Icon size={14} bold />
        </button>
      ))}
      <button className="task-main" onClick={onSelect}>
        <span className="task-title">{task.title || 'Untitled'}</span>
        {task.note && <NoteIcon size={15} />}
        {task.routineId && <RepeatIcon size={15} />}
        {!!task.minutes && <span className="task-tag task-time">{formatMinutes(task.minutes)}</span>}
        {task.carriedTo ? (
          <span className="task-tag">→ {short(task.carriedTo.date)}</span>
        ) : (
          task.carriedFrom && <span className="task-tag">from {short(task.carriedFrom.date)}</span>
        )}
      </button>
    </li>
  )
}
