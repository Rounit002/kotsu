import { useState } from 'react'
import { addDays, formatDate, isISODate, type ISODate } from '../../domain/dates'
import type { Task } from '../../domain/types'
import { build } from '../../ui/build'
import { Chips } from '../../ui/controls'
import { CarryIcon, DeleteIcon } from '../../ui/icons'
import { useSelectedDate } from './selection'
import { canCarry, DAY_MINUTES, usePlanner } from './store'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** Hours and minutes, up to the day's 24 hours. Zero clears it. */
function Duration({ minutes = 0, onChange }: { minutes?: number; onChange: (minutes: number | undefined) => void }) {
  const [h, m] = [Math.floor(minutes / 60), minutes % 60]
  const set = (hours: number, mins: number) => onChange(Math.min(hours * 60 + mins, DAY_MINUTES) || undefined)
  return (
    <div className="row duration">
      <select className="input" aria-label="Hours" value={h} onChange={(e) => set(Number(e.target.value), m)}>
        {HOURS.map((n) => (
          <option key={n} value={n}>
            {n} h
          </option>
        ))}
      </select>
      <select className="input" aria-label="Minutes" value={m} disabled={h === 24} onChange={(e) => set(h, Number(e.target.value))}>
        {MINUTES.map((n) => (
          <option key={n} value={n}>
            {n} min
          </option>
        ))}
      </select>
    </div>
  )
}

/** Jumps the planner to the other end of a carry. */
const DateLink = ({ date }: { date: ISODate }) => (
  <button className="link" onClick={() => useSelectedDate.getState().select(date)}>
    {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}
  </button>
)

/** What fills the right-hand pane for one goal: rename, write a note, carry it forward, or delete it. */
export function TaskDetail({ task }: { task: Task }) {
  const { update, remove, carry, repeat } = usePlanner.getState() // actions never change
  const every = usePlanner((s) => (task.routineId && s.routines[task.routineId]?.every) || 'never')
  const weekday = formatDate(task.date, { weekday: 'long' })
  const nextDay = addDays(task.date, 1)
  const [target, setTarget] = useState(nextDay)
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <input
        className="detail-title"
        aria-label="Goal"
        value={task.title}
        onChange={(e) => update(task, { title: e.target.value })}
        {...build('print')}
      />

      <label className="field" {...build('print', 0, 2)}>
        <span className="label">Note</span>
        <textarea
          className="input"
          value={task.note}
          placeholder="Context, the next step, why it matters…"
          onChange={(e) => update(task, { note: e.target.value })}
        />
      </label>

      <div className="detail-pair" {...build('print', 0, 3)}>
        <div className="field">
          <span className="label">Repeats</span>
          <Chips
            label="Repeats"
            value={every}
            onChange={(every) => repeat(task, every === 'never' ? null : every)}
            options={[
              { value: 'never', label: 'No' },
              { value: 'day', label: 'Every day' },
              { value: 'week', label: `Every ${weekday}` },
            ]}
          />
        </div>
        <div className="field">
          <span className="label">Priority</span>
          <Chips
            label="Priority"
            value={task.priority ?? 'none'}
            onChange={(p) => update(task, { priority: p === 'none' ? undefined : p })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
        </div>
        <div className="field">
          <span className="label">Duration</span>
          <Duration minutes={task.minutes} onChange={(minutes) => update(task, { minutes })} />
        </div>
      </div>

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
          <button className="link" onClick={() => remove({ id: task.carriedTo!.taskId, date: task.carriedTo!.date })}>
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
              <button className="btn btn-primary" disabled={!isISODate(target) || target <= task.date} onClick={() => carry(task, target)}>
                <CarryIcon size={16} />
                Carry
              </button>
            </div>
          </section>
        )
      )}

      <button
        className="btn btn-danger detail-delete"
        onClick={() => (confirming ? remove(task) : setConfirming(true))}
        {...build('stamp', 0, 9)}
      >
        <DeleteIcon size={16} />
        {confirming ? 'Click again to confirm' : task.routineId ? 'Remove from this day' : 'Delete'}
      </button>
    </>
  )
}
