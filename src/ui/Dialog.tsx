import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { build, usePhase } from './build'
import { CloseIcon } from './icons'

interface Props {
  open: boolean
  title: string
  width?: string
  onClose: () => void
  children: ReactNode
}

/** What is inside the box. Mounted on every open, so it builds itself each time. */
function Contents({ title, onClose, children }: Pick<Props, 'title' | 'onClose' | 'children'>) {
  return (
    <div className="dialog-contents" data-phase={usePhase(1500)}>
      <header className="dialog-head" {...build('print', 9)}>
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      {children}
    </div>
  )
}

/** A glass box over the page. The native <dialog> gives focus trapping and Escape for free. */
export function Dialog({ open, title, width, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open === open) return
    if (open) dialog.showModal()
    else dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog glass"
      data-phase="opening"
      data-build="frame"
      style={{ '--dialog-width': width } as CSSProperties}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <Contents title={title} onClose={onClose}>
          {children}
        </Contents>
      )}
    </dialog>
  )
}
