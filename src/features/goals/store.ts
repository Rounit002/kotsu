import { userStore } from '../../data/persist'
import { mirror } from '../../data/sync'
import type { Goal, GoalScope } from '../../domain/types'

interface GoalsState {
  goals: Goal[]
  add: (scope: GoalScope, period: string, title: string) => void
  update: (id: string, patch: Partial<Pick<Goal, 'title' | 'done'>>) => void
  remove: (id: string) => void
}

export const useGoals = userStore<GoalsState>('goals', (set) => ({
  goals: [],
  add: (scope, period, title) =>
    set((s) => ({
      goals: [...s.goals, { id: crypto.randomUUID(), scope, period, title, done: false, createdAt: Date.now() }],
    })),
  update: (id, patch) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
  remove: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
}))

/** A goal as the `goals` table stores it (supabase/migrations). */
type GoalRow = Omit<Goal, 'createdAt'> & { created_at: string }

mirror<GoalsState, Goal, GoalRow>({
  table: 'goals',
  store: useGoals,
  records: (state) => state.goals,
  restore: (goals) => ({ goals: goals.sort((a, b) => a.createdAt - b.createdAt) }),
  toRow: ({ createdAt, ...goal }) => ({ ...goal, created_at: new Date(createdAt).toISOString() }),
  fromRow: ({ id, scope, period, title, done, created_at }) => ({ id, scope, period, title, done, createdAt: Date.parse(created_at) }),
})
