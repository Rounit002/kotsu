import './planner.css'

import { useMemo, useRef, useState } from 'react'
import { formatDate, today, type ISODate } from '../../domain/dates'
import { build, Typed, usePhase } from '../../ui/build'
import { AddInput } from '../../ui/controls'
import { DateRail } from './DateRail'
import { useSelectedDate } from './selection'
import { tasksOn, usePlanner, type TaskTone } from './store'
import { TaskDetail } from './TaskDetail'
import { TaskRow } from './TaskRow'

const LEGEND: [TaskTone, string][] = [
  ['done', 'Done'],
  ['missed', 'Not done'],
  ['carried', 'Carried to a later date'],
  ['carried-in', 'Carried in from an earlier date'],
]

/** When the day's title starts typing while the page is still being built. */
const TITLE_DELAY = 1450

export function DailyPage() {
  const date = useSelectedDate((s) => s.date)
  const phase = usePhase(3400)

  return (
    <main className="daily" data-phase={phase}>
      <DateRail selected={date} />

      <section className="day glass" {...build('frame', 5)}>
        {/* Keyed by date: switching day rebuilds what is inside the pane, not the pane. */}
        <Day key={date} date={date} titleDelay={phase === 'opening' ? TITLE_DELAY : 0} />
      </section>

      <footer className="legend glass" aria-label="What the colours mean" {...build('frame', 7)}>
        {LEGEND.map(([tone, label], i) => (
          <span key={tone} className="row" {...build('print', 26 + i)}>
            <i className="swatch" data-tone={tone} />
            {label}
          </span>
        ))}
        <span className="row" {...build('print', 30)}>
          <i className="dot" />
          Day has open goals
        </span>
      </footer>
    </main>
  )
}

function Day({ date, titleDelay }: { date: ISODate; titleDelay: number }) {
  const all = usePlanner((s) => s.tasks)
  const add = usePlanner((s) => s.add)
  const tasks = useMemo(() => tasksOn(all, date), [all, date])
  const [selectedId, setSelectedId] = useState<string>()
  // Goals already here when the day opens are laid down one after another; later ones land at once.
  const [atOpen] = useState(() => new Set(tasks.map((t) => t.id)))
  const detail = useRef<HTMLElement>(null)

  const selected = tasks.find((t) => t.id === selectedId)
  const done = tasks.filter((t) => t.status === 'done').length

  const select = (id: string) => {
    setSelectedId(id)
    detail.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) // on a phone it sits below the list
  }

  return (
    <>
      <header className="day-head">
        <h1>
          <Typed text={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} delay={titleDelay} />
        </h1>
        <p className="muted" {...build('print', 22, 5)}>
          {date === today() && 'Today · '}
          {tasks.length ? `${done} of ${tasks.length} done` : 'Nothing planned yet'}
        </p>
      </header>

      <div className="day-body">
        <div className="day-list">
          <h2 className="label" {...build('print', 22, 2)}>
            Goals / To-do
          </h2>
          <AddInput placeholder="Add a goal or to-do" onAdd={(title) => add(date, title)} {...build('print', 23, 3)} />
          <ul className="tasks">
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                order={atOpen.has(task.id) ? Math.min(i, 8) : 0}
                selected={task.id === selectedId}
                onSelect={() => select(task.id)}
              />
            ))}
          </ul>
        </div>

        <aside className="detail glass inset" aria-label="Goal details" ref={detail} {...build('frame', 23, 3)}>
          {selected ? (
            <TaskDetail key={selected.id} task={selected} />
          ) : (
            <p className="muted detail-empty" {...build('print', 32, 22)}>
              {tasks.length ? 'Select a goal to add a note or carry it to another day.' : 'Goals you add will appear on the left.'}
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
