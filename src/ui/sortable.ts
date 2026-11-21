import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

/**
 * Drag-to-reorder for a list. Items are `[data-sort-id]` elements inside `list`; the
 * handle starts a drag with a mouse or a finger, and Arrow Up / Down move one step.
 * The held item follows the pointer, the others slide out of its way, and the new
 * order is handed to `onMove` once it is let go.
 */
export function useSortable(ids: string[], onMove: (ids: string[]) => void) {
  const list = useRef<HTMLUListElement>(null)
  const [preview, setPreview] = useState<string[] | null>(null)
  // The latest order while dragging; pointer events can arrive before React has drawn the last one.
  const latest = useRef<string[] | null>(null)
  const show = (next: string[] | null) => setPreview((latest.current = next))
  const drag = useRef<{ id: string; grab: number; y: number } | null>(null)
  const tops = useRef(new Map<string, number>())
  const last = useRef('')
  const order = preview ?? ids

  const item = (id: string) => list.current?.querySelector<HTMLElement>(`[data-sort-id="${id}"]`)

  /** Keeps the held item under the pointer, wherever the layout has put it. */
  const follow = () => {
    const d = drag.current
    const el = d && item(d.id)
    if (!d || !el || !list.current) return
    el.style.transform = `translateY(${d.y - d.grab - list.current.getBoundingClientRect().top - el.offsetTop}px)`
  }

  // After each re-order, slide every other item from where it was to where it now is.
  // (Only then: an idea growing as it is typed into should push the rest, not animate them.)
  useLayoutEffect(() => {
    const moved = last.current !== (last.current = order.join())
    const seen = new Map<string, number>()
    for (const id of order) {
      const el = item(id)
      if (!el) continue
      seen.set(id, el.offsetTop)
      const was = tops.current.get(id)
      if (moved && was !== undefined && was !== el.offsetTop && id !== drag.current?.id)
        el.animate([{ transform: `translateY(${was - el.offsetTop}px)` }, { transform: 'none' }], { duration: 220, easing: EASE })
    }
    tops.current = seen
    follow()
  })

  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d || !list.current) return
    d.y = e.clientY
    const el = item(d.id)!
    const top = list.current.getBoundingClientRect().top
    const middle = d.y - d.grab - top + el.offsetHeight / 2
    const now = latest.current ?? ids
    const rest = now.filter((id) => id !== d.id)
    const at = rest.filter((id) => {
      const other = item(id)!
      return other.offsetTop + other.offsetHeight / 2 < middle
    }).length
    if (now.indexOf(d.id) !== at) show([...rest.slice(0, at), d.id, ...rest.slice(at)])
    else follow()
  }

  const drop = () => {
    const d = drag.current
    if (!d) return
    const el = item(d.id)
    drag.current = null
    if (el) {
      const from = el.style.transform
      el.style.transform = ''
      el.removeAttribute('data-dragging')
      el.animate([{ transform: from }, { transform: 'none' }], { duration: 180, easing: EASE })
    }
    if (latest.current && latest.current.join() !== ids.join()) onMove(latest.current)
    show(null)
  }

  const handle = (id: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      const el = item(id)!
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { id, grab: e.clientY - el.getBoundingClientRect().top, y: e.clientY }
      el.setAttribute('data-dragging', '')
    },
    onPointerMove: move,
    onPointerUp: drop,
    onPointerCancel: drop,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      const from = ids.indexOf(id)
      if (!step || from + step < 0 || from + step >= ids.length) return
      e.preventDefault()
      const next = [...ids]
      next.splice(from, 1)
      next.splice(from + step, 0, id)
      onMove(next)
      // Moving an element can drop its focus; keep it on the handle that was pressed.
      requestAnimationFrame(() => item(id)?.querySelector<HTMLElement>('[data-sort-handle]')?.focus())
    },
    'data-sort-handle': '',
  })

  return { list, order, handle }
}
