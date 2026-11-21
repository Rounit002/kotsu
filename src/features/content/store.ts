import { userStore } from '../../data/persist'
import { mirror } from '../../data/sync'
import type { ContentCategory, ContentIdea } from '../../domain/types'

interface ContentState {
  categories: ContentCategory[]
  ideas: ContentIdea[]
  /** Returns the new category's id, so it can be opened straight away. */
  addCategory: (name: string) => string
  renameCategory: (id: string, name: string) => void
  /** Removes the category and every idea kept in it. */
  removeCategory: (id: string) => void
  addIdea: (categoryId: string, text: string) => void
  updateIdea: (id: string, patch: Partial<Pick<ContentIdea, 'text' | 'done'>>) => void
  removeIdea: (id: string) => void
}

export const useContent = userStore<ContentState>('content', (set) => ({
  categories: [],
  ideas: [],

  addCategory: (name) => {
    const category = { id: crypto.randomUUID(), name, createdAt: Date.now() }
    set((s) => ({ categories: [...s.categories, category] }))
    return category.id
  },
  renameCategory: (id, name) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),
  removeCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id), ideas: s.ideas.filter((i) => i.categoryId !== id) })),

  addIdea: (categoryId, text) =>
    set((s) => ({ ideas: [{ id: crypto.randomUUID(), categoryId, text, done: false, createdAt: Date.now() }, ...s.ideas] })),
  updateIdea: (id, patch) => set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),
}))

const iso = (ms: number) => new Date(ms).toISOString()

mirror<ContentState, ContentCategory, { id: string; name: string; created_at: string }>({
  table: 'content_categories',
  store: useContent,
  records: (state) => state.categories,
  restore: (categories) => ({ categories: categories.sort((a, b) => a.createdAt - b.createdAt) }),
  toRow: ({ id, name, createdAt }) => ({ id, name, created_at: iso(createdAt) }),
  fromRow: ({ id, name, created_at }) => ({ id, name, createdAt: Date.parse(created_at) }),
})

mirror<ContentState, ContentIdea, { id: string; category_id: string; text: string; done: boolean; created_at: string }>({
  table: 'content_ideas',
  store: useContent,
  records: (state) => state.ideas,
  restore: (ideas) => ({ ideas: ideas.sort((a, b) => b.createdAt - a.createdAt) }),
  toRow: ({ id, categoryId, text, done, createdAt }) => ({ id, category_id: categoryId, text, done, created_at: iso(createdAt) }),
  fromRow: ({ id, category_id, text, done, created_at }) => ({ id, categoryId: category_id, text, done, createdAt: Date.parse(created_at) }),
})
