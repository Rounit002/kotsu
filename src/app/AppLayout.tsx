import './app.css'

import { useState } from 'react'
import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { can, type FeatureId } from '../config/features'
import { inYear, isISODate, today, yearOf } from '../domain/dates'
import { AccountDialog } from '../features/account/AccountDialog'
import { useDisplayName, usePlan } from '../features/account/store'
import { GoalsDialog } from '../features/goals/GoalsDialog'
import { build, usePhase } from '../ui/build'
import { Stepper } from '../ui/controls'
import { DarkIcon, GoalIcon, HomeIcon, LightIcon } from '../ui/icons'
import { Lens } from '../ui/Lens'
import { Menu } from '../ui/Menu'
import { ScenePicker } from './scenes/ScenePicker'
import { useScene } from './scenes/useScene'
import { Wall } from './scenes/Wall'

const VIEWS: { label: string; feature: FeatureId; to: string }[] = [
  { label: 'Daily', feature: 'dailyView', to: '/daily' },
  { label: 'Weekly', feature: 'weeklyView', to: '/weekly' },
  { label: 'Monthly', feature: 'monthlyView', to: '/monthly' },
]

/** The date being planned, when a planner view is open. */
const useActiveDate = () => {
  const date = useMatch('/daily/:date')?.params.date
  return isISODate(date) ? date : null
}

function ViewMenu() {
  const plan = usePlan()
  return (
    <Menu label="Daily" {...build('stamp', 10)}>
      {VIEWS.map((view, i) =>
        can(view.feature, plan) ? (
          <NavLink key={view.to} to={view.to} className="menu-item" role="menuitem" {...build('print', 8 + i)}>
            {view.label}
          </NavLink>
        ) : (
          <button key={view.to} className="menu-item" role="menuitem" disabled {...build('print', 8 + i)}>
            {view.label} <span className="label">Soon</span>
          </button>
        ),
      )}
    </Menu>
  )
}

/** The frame around every page: the wall, the glass bar, the page, and the two boxes that open over it. */
export function AppLayout() {
  const [panel, setPanel] = useState<'goals' | 'account' | null>(null)
  const activeDate = useActiveDate()
  const navigate = useNavigate()
  const name = useDisplayName()
  const phase = usePhase(2400)
  const { theme, time, place, toggleTheme, choosePlace } = useScene()
  const close = () => setPanel(null)

  return (
    <>
      <Lens />
      <Wall place={place} time={time} />
      <header className="topbar glass" data-phase={phase} {...build('frame')}>
        <div className="row">
          <Link to="/" className="icon-btn" aria-label="Home" {...build('stamp', 9)}>
            <HomeIcon />
          </Link>
          <ViewMenu />
          <button className="topbar-meta" onClick={() => setPanel('account')} {...build('stamp', 11)}>
            <span className="label">Name</span>
            <strong>{name || 'Add your name'}</strong>
          </button>
        </div>

        <button className="btn btn-tonal" onClick={() => setPanel('goals')} {...build('stamp', 12)}>
          <GoalIcon size={16} />
          Goals
        </button>

        <div className="topbar-end">
          <div className="topbar-meta" {...build('stamp', 13)}>
            <span className="label">Year</span>
            {activeDate ? (
              <Stepper value={yearOf(activeDate)} label="year" onChange={(y) => navigate(`/daily/${inYear(activeDate, y)}`)} />
            ) : (
              <strong>{yearOf(today())}</strong>
            )}
          </div>
          <ScenePicker place={place} time={time} onChoose={choosePlace} />
          <button
            className="icon-btn"
            aria-label={theme === 'dark' ? 'Switch to day (light mode)' : 'Switch to night (dark mode)'}
            onClick={toggleTheme}
            {...build('stamp', 15)}
          >
            {theme === 'dark' ? <LightIcon /> : <DarkIcon />}
          </button>
        </div>
      </header>

      <Outlet />

      <GoalsDialog open={panel === 'goals'} anchor={activeDate ?? today()} onClose={close} />
      <AccountDialog open={panel === 'account'} onClose={close} />
    </>
  )
}
