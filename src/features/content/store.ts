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
  updateIdea: (id: string, patch: Partial<Pick<ContentIdea, 'text'>>) => void
  /** Done moves it to the Done list with today's date; undone puts it back at the top. */
  toggleDone: (id: string) => void
  /** Puts these ideas in this order. */
  reorder: (ids: string[]) => void
  removeIdea: (id: string) => void
}

const place = (i: ContentIdea) => i.position ?? -i.createdAt

/** A category's ideas still to make, in the order they were put in. */
export const openIdeas = (ideas: ContentIdea[], categoryId: string) =>
  ideas.filter((i) => i.categoryId === categoryId && !i.done).sort((a, b) => place(a) - place(b))

/** A category's done ideas, most recently done first. */
export const doneIdeas = (ideas: ContentIdea[], categoryId: string) =>
  ideas.filter((i) => i.categoryId === categoryId && i.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))

/** Just above the first idea still to make. */
const top = (ideas: ContentIdea[], categoryId: string) => {
  const first = openIdeas(ideas, categoryId)[0]
  return first ? place(first) - 1 : 0
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
    set((s) => ({
      ideas: [{ id: crypto.randomUUID(), categoryId, text, done: false, position: top(s.ideas, categoryId), createdAt: Date.now() }, ...s.ideas],
    })),
  updateIdea: (id, patch) => set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  toggleDone: (id) =>
    set((s) => ({
      ideas: s.ideas.map((i) =>
        i.id !== id ? i : i.done ? { ...i, done: false, doneAt: undefined, position: top(s.ideas, i.categoryId) } : { ...i, done: true, doneAt: Date.now() },
      ),
    })),
  reorder: (ids) =>
    set((s) => {
      const at = new Map(ids.map((id, n) => [id, n]))
      // Only ideas whose place really changed are touched, so only they are sent.
      return { ideas: s.ideas.map((i) => (at.has(i.id) && i.position !== at.get(i.id) ? { ...i, position: at.get(i.id) } : i)) }
    }),
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

interface IdeaRow {
  id: string
  category_id: string
  text: string
  done: boolean
  done_at: string | null
  position: number | null
  created_at: string
  updated_at?: string
}

mirror<ContentState, ContentIdea, IdeaRow>({
  table: 'content_ideas',
  store: useContent,
  records: (state) => state.ideas,
  restore: (ideas) => ({ ideas }),
  toRow: (i) => ({
    id: i.id,
    category_id: i.categoryId,
    text: i.text,
    done: i.done,
    done_at: i.doneAt ? iso(i.doneAt) : null,
    position: i.position ?? null,
    created_at: iso(i.createdAt),
  }),
  fromRow: (row) => ({
    id: row.id,
    categoryId: row.category_id,
    text: row.text,
    done: row.done,
    // An app from before done dates only marks it done; its last change is the nearest date there is.
    doneAt: row.done ? Date.parse(row.done_at ?? row.updated_at ?? row.created_at) : undefined,
    position: row.position ?? undefined,
    createdAt: Date.parse(row.created_at),
  }),
})
