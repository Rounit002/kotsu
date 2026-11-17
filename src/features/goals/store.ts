import { userStore } from '../../data/persist'
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
