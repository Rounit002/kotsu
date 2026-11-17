import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** The pieces of the construction sequence — see styles/build.css for what each one does. */
type Kind = 'frame' | 'print' | 'stamp'

/**
 * Gives an element its turn in the construction sequence.
 * `beat` is its place while the page opens; `quick` its place if it arrives later (a new row, a new day).
 */
export const build = (kind: Kind, beat = 0, quick = 0) => ({
  'data-build': kind,
  style: { '--beat': beat, '--quick': quick } as CSSProperties,
})

const stillMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** `opening` while a freshly mounted page builds itself, then `ready`. Put it on the page as data-phase. */
export function usePhase(openingMs: number) {
  const [phase, setPhase] = useState<'opening' | 'ready'>('opening')
  useEffect(() => {
    const timer = setTimeout(() => setPhase('ready'), openingMs)
    return () => clearTimeout(timer)
  }, [openingMs])
  return phase
}

const TYPE_MS = 24
const ERASE_MS = 12

/**
 * Typing is painted, not laid out. The whole sentence is in the page from the start, as one
 * piece of text, so it wraps once and never moves; two highlights then colour part of it —
 * `typed-rest` hides what is not written yet, `typed-caret` is the block the next letter sits in.
 * (Splitting the text into written and unwritten pieces instead makes it re-wrap on every letter.)
 */
const paint = 'highlights' in CSS ? { rest: new Highlight(), caret: new Highlight() } : null
if (paint) {
  CSS.highlights.set('typed-rest', paint.rest)
  CSS.highlights.set('typed-caret', paint.caret)
}

interface TypedProps {
  text: string
  /** How long to wait before the first letter. */
  delay?: number
  onDone?: () => void
}

/**
 * Writes text letter by letter behind a caret. When the text changes, the old line is rubbed
 * out first, then the new one is written. Without highlight support, or when motion is
 * reduced, the text simply appears.
 */
export function Typed({ text, delay = 0, onDone }: TypedProps) {
  const [shown, setShown] = useState(text)
  const element = useRef<HTMLSpanElement>(null)
  const written = useRef(0)

  useLayoutEffect(() => {
    const letters = element.current?.firstChild
    const erasing = shown !== text
    if (!paint || !letters || stillMotion()) return erasing ? setShown(text) : onDone?.()

    const [rest, caret] = [new Range(), new Range()]
    const end = shown.length
    const write = (count: number) => {
      written.current = count
      caret.setStart(letters, Math.min(count, end))
      caret.setEnd(letters, Math.min(count + 1, end))
      rest.setStart(letters, Math.min(count + 1, end))
      rest.setEnd(letters, end)
    }
    write(erasing ? written.current : 0)
    paint.rest.add(rest)
    paint.caret.add(caret)

    let timer = 0
    const step = () => {
      const count = written.current
      if (erasing && count === 0) return setShown(text)
      if (!erasing && count === end) return onDone?.()
      write(erasing ? Math.max(0, count - 3) : count + 1)
      timer = window.setTimeout(step, erasing ? ERASE_MS : TYPE_MS)
    }
    timer = window.setTimeout(step, erasing ? 0 : delay)

    return () => {
      clearTimeout(timer)
      paint.rest.delete(rest)
      paint.caret.delete(caret)
    }
    // Runs when the sentence changes, and again once the old one has been rubbed out.
  }, [text, shown])

  return <span ref={element}>{shown}</span>
}
