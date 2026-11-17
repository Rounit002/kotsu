import './home.css'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DESKTOP } from '../../config/features'
import type { Lesson } from '../../domain/types'
import { build, Typed, usePhase } from '../../ui/build'
import { GoIcon } from '../../ui/icons'
import library from './lessons.json'

/** How long a finished lesson stays up before the next one is written. */
const HOLD_MS = 14_000
/** When the first lesson starts typing while the page is still being built. */
const FIRST_DELAY = 1250

const shuffled = (lessons: Lesson[]) =>
  lessons
    .map((lesson) => ({ lesson, at: Math.random() }))
    .sort((a, b) => a.at - b.at)
    .map(({ lesson }) => lesson)

/** One lesson at a time, written out, held, then replaced — a fresh order on every visit. */
export function HomePage() {
  const phase = usePhase(3600)
  const [lessons] = useState(() => shuffled(library))
  const [turn, setTurn] = useState(0)
  const [written, setWritten] = useState(false)
  const lesson = lessons[turn % lessons.length]

  useEffect(() => {
    if (!written) return
    const timer = setTimeout(() => {
      setWritten(false)
      setTurn((t) => t + 1)
    }, HOLD_MS)
    return () => clearTimeout(timer)
  }, [written])

  return (
    <main className="home" data-phase={phase}>
      <section className="lesson glass" {...build('frame', 3)}>
        <h1 className="label" {...build('print', 12)}>
          Life lessons
        </h1>
        <figure>
          <blockquote>
            <Typed text={lesson.text} delay={FIRST_DELAY} onDone={() => setWritten(true)} />
          </blockquote>
          {/* Keeps its room while hidden, then prints once the lesson is fully written. */}
          <figcaption data-written={written || undefined} {...(written && build('print'))}>
            Learned from {lesson.from}
          </figcaption>
        </figure>
        <div className="lesson-actions">
          <Link to="/daily" className="btn btn-primary" {...build('stamp', 16)}>
            Plan today
            <GoIcon size={16} />
          </Link>
          {DESKTOP || (
            <Link to="/download" className="link" {...build('print', 18)}>
              Get the Mac or Windows app
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
