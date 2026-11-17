import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { build } from './build'
import { DownIcon } from './icons'

interface Props extends HTMLAttributes<HTMLDivElement> {
  label: string
  /** Show only this icon on the button; the label becomes its accessible name. */
  icon?: ReactNode
  /** Which edge of the button the list lines up with. */
  align?: 'start' | 'end'
}

/** A button that drops a glass list of `.menu-item`s. Closes on choice, outside click or Escape. */
export function Menu({ label, icon, align = 'start', children, ...rest }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={ref} {...rest}>
      <button
        className={icon ? 'icon-btn' : 'btn btn-outline'}
        aria-label={icon ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {icon ?? label}
        {!icon && <DownIcon size={16} />}
      </button>
      {open && (
        <div className="menu-list glass" role="menu" data-align={align} data-phase="opening" onClick={() => setOpen(false)} {...build('frame')}>
          {children}
        </div>
      )}
    </div>
  )
}
