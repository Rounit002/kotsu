import './content.css'

import { useMemo, useState, type ReactNode } from 'react'
import { formatDate, toISO } from '../../domain/dates'
import type { ContentIdea } from '../../domain/types'
import { build } from '../../ui/build'
import { AddInput } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { CloseIcon, DeleteIcon, DoneIcon, GripIcon } from '../../ui/icons'
import { useSortable } from '../../ui/sortable'
import { doneIdeas, openIdeas, useContent } from './store'

/** Offered while there are no categories yet, so the first one is a click away. */
const STARTERS = ['YouTube', 'X', 'Instagram']

/** "21 Nov", with the year only when it is not this one. */
const doneOn = (ms: number) => {
  const date = new Date(ms)
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  return formatDate(toISO(date), { day: 'numeric', month: 'short', year })
}

/** One idea: its tick, its text (growing as it is written), and a way to delete it. */
function Idea({ idea, children }: { idea: ContentIdea; children?: ReactNode }) {
  const { updateIdea, toggleDone, removeIdea } = useContent.getState()
  return (
    <li className="idea" data-sort-id={idea.id} data-done={idea.done || undefined} {...build('print')}>
      {children}
      <button
        className="mark"
        data-tone="done"
        aria-label={idea.done ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={idea.done}
        onClick={() => toggleDone(idea.id)}
      >
        <DoneIcon size={14} bold />
      </button>
      <textarea aria-label="Idea" rows={1} value={idea.text} onChange={(e) => updateIdea(idea.id, { text: e.target.value })} />
      {idea.done && idea.doneAt && (
        <time className="idea-date" dateTime={new Date(idea.doneAt).toISOString()}>
          {doneOn(idea.doneAt)}
        </time>
      )}
      <button className="icon-btn" aria-label="Delete idea" onClick={() => removeIdea(idea.id)}>
        <CloseIcon size={16} />
      </button>
    </li>
  )
}

/** The ideas kept for one category: the ones still to make in the order you put them, then the done ones. */
function Ideas({ categoryId }: { categoryId: string }) {
  const all = useContent((s) => s.ideas)
  const category = useContent((s) => s.categories.find((c) => c.id === categoryId))
  const { addIdea, reorder, renameCategory, removeCategory } = useContent.getState() // actions never change
  const todo = useMemo(() => openIdeas(all, categoryId), [all, categoryId])
  const done = useMemo(() => doneIdeas(all, categoryId), [all, categoryId])
  const byId = useMemo(() => new Map(todo.map((i) => [i.id, i])), [todo])
  const sortable = useSortable(
    todo.map((i) => i.id),
    reorder,
  )
  const [confirming, setConfirming] = useState(false)
  if (!category) return null
  const count = todo.length + done.length

  return (
    <section className="ideas" {...build('print', 14)}>
      <header className="ideas-head">
        <input
          className="ideas-name"
          aria-label="Category name"
          value={category.name}
          onChange={(e) => renameCategory(category.id, e.target.value)}
        />
        <button className="btn btn-danger" onClick={() => (confirming ? removeCategory(category.id) : setConfirming(true))}>
          <DeleteIcon size={16} />
          {confirming ? `Delete it and its ${count} ideas?` : 'Delete category'}
        </button>
      </header>
      <AddInput placeholder={`Add an idea for ${category.name || 'this category'}`} onAdd={(text) => addIdea(category.id, text)} />
      <ul className="idea-list" ref={sortable.list}>
        {sortable.order.map((id) => (
          <Idea key={id} idea={byId.get(id)!}>
            <button className="icon-btn idea-grip" aria-label="Move idea (drag, or use the arrow keys)" {...sortable.handle(id)}>
              <GripIcon size={16} bold />
            </button>
          </Idea>
        ))}
      </ul>
      {!count && <p className="muted">No ideas yet. Write one above and press Enter; open it again to add detail.</p>}
      {!todo.length && !!count && <p className="muted">Everything here is done.</p>}
      {!!done.length && (
        <>
          <p className="label idea-done-head">Done · {done.length}</p>
          <ul className="idea-list idea-done">
            {done.map((idea) => (
              <Idea key={idea.id} idea={idea} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Categories down the side, the chosen one's ideas beside them. */
function ContentBoard() {
  const categories = useContent((s) => s.categories)
  const ideas = useContent((s) => s.ideas)
  const addCategory = useContent((s) => s.addCategory)
  const [picked, setPicked] = useState<string>()
  const open = categories.find((c) => c.id === picked) ?? categories[0]
  const create = (name: string) => setPicked(addCategory(name))

  return (
    <div className="content-board">
      <nav className="categories" aria-label="Categories" {...build('print', 11)}>
        <p className="label">Categories</p>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              <button className="category" aria-current={c === open || undefined} onClick={() => setPicked(c.id)}>
                <span>{c.name || 'Untitled'}</span>
                <span className="category-count">{ideas.filter((i) => i.categoryId === c.id && !i.done).length}</span>
              </button>
            </li>
          ))}
        </ul>
        <AddInput placeholder="Add a category" onAdd={create} />
        {!categories.length && (
          <div className="chips" role="group" aria-label="Quick add">
            {STARTERS.map((name) => (
              <button key={name} className="chip" onClick={() => create(name)}>
                + {name}
              </button>
            ))}
          </div>
        )}
      </nav>
      {open ? (
        <Ideas key={open.id} categoryId={open.id} />
      ) : (
        <p className="muted content-empty" {...build('print', 14)}>
          Make a category for each place you post — YouTube, X, Instagram — then keep your ideas for it here.
        </p>
      )}
    </div>
  )
}

export function ContentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Content Planner" width="60rem" onClose={onClose}>
      <ContentBoard />
    </Dialog>
  )
}
