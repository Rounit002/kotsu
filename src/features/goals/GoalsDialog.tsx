import './goals.css'

import { useMemo, useState, type ReactNode } from 'react'
import { addDays, formatDate, monthKey, monthOf, MONTHS, weeksOfMonth, weekStart, yearOf, type ISODate } from '../../domain/dates'
import type { GoalScope } from '../../domain/types'
import { build } from '../../ui/build'
import { AddInput, Chips, Stepper } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { CloseIcon, DoneIcon } from '../../ui/icons'
import { useGoals } from './store'

const dayMonth = (date: ISODate) => formatDate(date, { day: 'numeric', month: 'short' })

interface ColumnProps {
  scope: GoalScope
  period: string
  heading: string
  title: string
  picker: ReactNode
  /** Its turn when the box builds itself. */
  beat: number
}

/** One horizon of goals. Year, month and week are the same list with a different period. */
function GoalColumn({ scope, period, heading, title, picker, beat }: ColumnProps) {
  const { goals: all, add, update, remove } = useGoals()
  const goals = useMemo(() => all.filter((g) => g.scope === scope && g.period === period), [all, scope, period])

  return (
    <section className="goal-col" {...build('print', beat)}>
      <header>
        <p className="label">{heading}</p>
        <h3>{title}</h3>
      </header>
      {picker}
      <AddInput placeholder={`Add a goal for the ${scope}`} onAdd={(text) => add(scope, period, text)} />
      <ul className="goal-list">
        {goals.map((goal) => (
          <li key={goal.id} className="goal" data-done={goal.done || undefined} {...build('print')}>
            <button
              className="mark"
              data-tone="done"
              aria-label={goal.done ? 'Mark as not reached' : 'Mark as reached'}
              aria-pressed={goal.done}
              onClick={() => update(goal.id, { done: !goal.done })}
            >
              <DoneIcon size={14} bold />
            </button>
            <input aria-label="Goal" value={goal.title} onChange={(e) => update(goal.id, { title: e.target.value })} />
            <button className="icon-btn" aria-label="Delete goal" onClick={() => remove(goal.id)}>
              <CloseIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!goals.length && <p className="muted">Nothing set yet.</p>}
    </section>
  )
}

/** Year → month → week, side by side, so each goal is written in sight of the one above it. */
function GoalsBoard({ anchor }: { anchor: ISODate }) {
  const [year, setYear] = useState(yearOf(anchor))
  const [month, setMonth] = useState(monthOf(anchor))
  const [pickedWeek, setWeek] = useState(weekStart(anchor))

  const weeks = weeksOfMonth(year, month)
  const week = weeks.includes(pickedWeek) ? pickedWeek : weeks[0]

  return (
    <div className="goals-board">
      <GoalColumn
        scope="year"
        beat={11}
        period={String(year)}
        heading="Year"
        title={String(year)}
        picker={<Stepper value={year} label="year" onChange={setYear} />}
      />
      <GoalColumn
        scope="month"
        beat={14}
        period={monthKey(year, month)}
        heading="Month"
        title={formatDate(`${monthKey(year, month)}-01`, { month: 'long', year: 'numeric' })}
        picker={<Chips label="Month" value={month} onChange={setMonth} options={MONTHS.map((label, value) => ({ value, label }))} />}
      />
      <GoalColumn
        scope="week"
        beat={17}
        period={week}
        heading="Week"
        title={`${dayMonth(week)} – ${dayMonth(addDays(week, 6))}`}
        picker={
          <Chips
            label="Week"
            value={week}
            onChange={setWeek}
            options={weeks.map((w) => ({ value: w, label: `${Number(w.slice(8))}–${Number(addDays(w, 6).slice(8))}` }))}
          />
        }
      />
    </div>
  )
}

/** Opens on the period of the day being planned, so goals and days stay in step. */
export function GoalsDialog({ open, anchor, onClose }: { open: boolean; anchor: ISODate; onClose: () => void }) {
  return (
    <Dialog open={open} title="Goals" width="68rem" onClose={onClose}>
      <GoalsBoard anchor={anchor} />
    </Dialog>
  )
}
