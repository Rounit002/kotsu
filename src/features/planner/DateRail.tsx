import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { daysBetween, daysByMonth, formatDate, MONTHS, today, yearOf, type ISODate } from '../../domain/dates'
import { build } from '../../ui/build'
import { useSelectedDate } from './selection'
import { isPending, usePlanner } from './store'

interface DayProps {
  date: ISODate
  /** Its turn in the build: days land outwards from the selected one. Far-off days (never on screen at first) get none. */
  order: number | null
  selected: boolean
  isToday: boolean
  pending: boolean
}

/** How many days either side of the selected one take part in the opening; the rest are simply there. */
const NEARBY = 12

/** Memoised: a year is 365 of these, and only the ones that change should re-render. */
const RailDay = memo(function RailDay({ date, order, selected, isToday, pending }: DayProps) {
  return (
    <button
      className="rail-day"
      onClick={() => useSelectedDate.getState().select(date)}
      aria-current={selected ? 'date' : undefined}
      data-today={isToday || undefined}
      data-pending={pending || undefined}
      {...(order !== null && build('stamp', 14 + order, order))}
    >
      {/* Read aloud as "Tue 17", under its month's heading — the same words that are on screen. */}
      <span className="rail-dow">{formatDate(date, { weekday: 'short' })}</span>{' '}
      <span className="rail-num">{Number(date.slice(8))}</span>
    </button>
  )
})

/** Every date of the selected year, scrollable, with the chosen day kept in view. */
export function DateRail({ selected }: { selected: ISODate }) {
  const tasks = usePlanner((s) => s.tasks)
  const pending = useMemo(() => new Set(Object.values(tasks).filter(isPending).map((t) => t.date)), [tasks])
  const year = yearOf(selected)
  const months = useMemo(() => daysByMonth(year), [year])
  // The day the build radiates from — fixed per year, so picking another day never replays it.
  const origin = useMemo(() => selected, [year])
  const scroller = useRef<HTMLDivElement>(null)
  const now = today()

  // Returns nothing on purpose: newer browsers hand back a Promise from scrollIntoView, which an effect must not return.
  const reveal = (position: ScrollLogicalPosition) => {
    scroller.current?.querySelector('[aria-current]')?.scrollIntoView({ block: position, inline: position })
  }

  useLayoutEffect(() => reveal('center'), [year]) // jump there when the year opens…
  useEffect(() => reveal('nearest'), [selected]) // …then only nudge if the day is off-screen

  return (
    <nav className="rail glass" aria-label="Dates" {...build('frame', 3)}>
      <h2 className="label rail-title" {...build('print', 13)}>
        Dates
      </h2>
      <div className="rail-scroll" ref={scroller}>
        {months.map((days, month) => (
          <section key={month}>
            <h3 className="label rail-month" {...build('stamp', 13)}>
              {MONTHS[month]}
            </h3>
            {days.map((date) => (
              <RailDay
                key={date}
                date={date}
                order={Math.abs(daysBetween(date, origin)) <= NEARBY ? Math.abs(daysBetween(date, origin)) : null}
                selected={date === selected}
                isToday={date === now}
                pending={pending.has(date)}
              />
            ))}
          </section>
        ))}
      </div>
    </nav>
  )
}
