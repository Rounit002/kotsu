import { useState } from 'react'
import { addDays, formatDate, isISODate, type ISODate } from '../../domain/dates'
import type { Task } from '../../domain/types'
import { build } from '../../ui/build'
import { CarryIcon, DeleteIcon } from '../../ui/icons'
import { useSelectedDate } from './selection'
import { canCarry, usePlanner } from './store'

/** Jumps the planner to the other end of a carry. */
const DateLink = ({ date }: { date: ISODate }) => (
  <button className="link" onClick={() => useSelectedDate.getState().select(date)}>
    {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}
  </button>
)

/** What fills the right-hand pane for one goal: rename, write a note, carry it forward, or delete it. */
export function TaskDetail({ task }: { task: Task }) {
  const update = usePlanner((s) => s.update)
  const remove = usePlanner((s) => s.remove)
  const carry = usePlanner((s) => s.carry)
  const nextDay = addDays(task.date, 1)
  const [target, setTarget] = useState(nextDay)
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <input
        className="detail-title"
        aria-label="Goal"
        value={task.title}
        onChange={(e) => update(task.id, { title: e.target.value })}
        {...build('print')}
      />

      <label className="field" {...build('print', 0, 2)}>
        <span className="label">Note</span>
        <textarea
          className="input"
          value={task.note}
          placeholder="Context, the next step, why it matters…"
          onChange={(e) => update(task.id, { note: e.target.value })}
        />
      </label>

      {task.carriedFrom && (
        <p className="detail-status" data-tone="carried-in" {...build('print', 0, 4)}>
          <span>
            Carried in from <DateLink date={task.carriedFrom.date} />
          </span>
        </p>
      )}

      {task.carriedTo ? (
        <p className="detail-status" data-tone="carried" {...build('print', 0, 5)}>
          <span>
            Carried to <DateLink date={task.carriedTo.date} />
          </span>
          <button className="link" onClick={() => remove(task.carriedTo!.taskId)}>
            Undo
          </button>
        </p>
      ) : (
        canCarry(task) && (
          <section className="field" {...build('print', 0, 5)}>
            <h3 className="label">Carry forward</h3>
            <p className="muted">Not finished? Move it, note included, to the next day or any later date. It stays here, marked as carried.</p>
            <div className="row">
              <input
                type="date"
                className="input"
                aria-label="Carry to date"
                min={nextDay}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <button className="btn btn-primary" disabled={!isISODate(target) || target <= task.date} onClick={() => carry(task.id, target)}>
                <CarryIcon size={16} />
                Carry
              </button>
            </div>
          </section>
        )
      )}

      <button
        className="btn btn-danger detail-delete"
        onClick={() => (confirming ? remove(task.id) : setConfirming(true))}
        {...build('stamp', 0, 9)}
      >
        <DeleteIcon size={16} />
        {confirming ? 'Click again to delete' : 'Delete'}
      </button>
    </>
  )
}
