import './content.css'

import { useMemo, useState } from 'react'
import { build } from '../../ui/build'
import { AddInput } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { CloseIcon, DeleteIcon, DoneIcon } from '../../ui/icons'
import { useContent } from './store'

/** Offered while there are no categories yet, so the first one is a click away. */
const STARTERS = ['YouTube', 'X', 'Instagram']

/** The ideas kept for one category: newest first, each one written out in full. */
function Ideas({ categoryId }: { categoryId: string }) {
  const all = useContent((s) => s.ideas)
  const category = useContent((s) => s.categories.find((c) => c.id === categoryId))
  const { addIdea, updateIdea, removeIdea, renameCategory, removeCategory } = useContent.getState() // actions never change
  const ideas = useMemo(() => all.filter((i) => i.categoryId === categoryId), [all, categoryId])
  const [confirming, setConfirming] = useState(false)
  if (!category) return null

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
          {confirming ? `Delete it and its ${ideas.length} ideas?` : 'Delete category'}
        </button>
      </header>
      <AddInput placeholder={`Add an idea for ${category.name || 'this category'}`} onAdd={(text) => addIdea(category.id, text)} />
      <ul className="idea-list">
        {ideas.map((idea) => (
          <li key={idea.id} className="idea" data-done={idea.done || undefined} {...build('print')}>
            <button
              className="mark"
              data-tone="done"
              aria-label={idea.done ? 'Mark as not posted' : 'Mark as posted'}
              aria-pressed={idea.done}
              onClick={() => updateIdea(idea.id, { done: !idea.done })}
            >
              <DoneIcon size={14} bold />
            </button>
            <textarea aria-label="Idea" rows={1} value={idea.text} onChange={(e) => updateIdea(idea.id, { text: e.target.value })} />
            <button className="icon-btn" aria-label="Delete idea" onClick={() => removeIdea(idea.id)}>
              <CloseIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!ideas.length && <p className="muted">No ideas yet. Write one above and press Enter; open it again to add detail.</p>}
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
