import type { AuthProviderId, PlanId } from '../config/features'
import type { ISODate } from './dates'

export type TaskStatus = 'open' | 'done' | 'missed'

/** One end of a carry: the task on the other date. */
export interface CarryLink {
  taskId: string
  date: ISODate
}

export interface Task {
  id: string
  date: ISODate
  title: string
  note: string
  status: TaskStatus
  carriedFrom?: CarryLink
  carriedTo?: CarryLink
  /** How long it should take. */
  minutes?: number
  /** Set when this is one day of a repeating goal. */
  routineId?: string
  createdAt: number
}

/** A goal that comes back every day, or every week on the weekday it started. */
export interface Routine {
  id: string
  title: string
  every: 'day' | 'week'
  minutes?: number
  starts: ISODate
  /** The first day it no longer appears; open-ended until it is stopped. */
  ends?: ISODate
  /** Days it was taken off one at a time. */
  skipped: ISODate[]
  createdAt: number
}

/** A place you post to — YouTube, X, Instagram — and the ideas kept for it. */
export interface ContentCategory {
  id: string
  name: string
  createdAt: number
}

export interface ContentIdea {
  id: string
  categoryId: string
  text: string
  /** Made and posted. */
  done: boolean
  createdAt: number
}

export type GoalScope = 'year' | 'month' | 'week'

export interface Goal {
  id: string
  scope: GoalScope
  /** `2026` for a year, `2026-11` for a month, the Monday's date for a week. */
  period: string
  title: string
  done: boolean
  createdAt: number
}

/** A lesson in our own words, with who it was learned from and where that is documented. */
export interface Lesson {
  text: string
  from: string
  source: string
}

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  providers: AuthProviderId[]
  plan: PlanId
  createdAt: number
}
