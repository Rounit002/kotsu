import { useState, type FormEvent, type HTMLAttributes } from 'react'
import { AddIcon, NextIcon, PreviousIcon } from './icons'

interface AddInputProps extends Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  placeholder: string
  onAdd: (text: string) => void
}

/** Type, press Enter, keep typing. Used wherever a list grows. */
export function AddInput({ placeholder, onAdd, ...rest }: AddInputProps) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }

  return (
    <form className="add" onSubmit={submit} {...rest}>
      <AddIcon size={16} />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </form>
  )
}

/** ‹ value › — for stepping through years. */
export function Stepper({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  return (
    <span className="stepper">
      <button className="icon-btn" aria-label={`Previous ${label}`} onClick={() => onChange(value - 1)}>
        <PreviousIcon />
      </button>
      {value}
      <button className="icon-btn" aria-label={`Next ${label}`} onClick={() => onChange(value + 1)}>
        <NextIcon />
      </button>
    </span>
  )
}

interface ChipsProps<T> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** Pick one of a few short options. */
export function Chips<T extends string | number>({ label, options, value, onChange }: ChipsProps<T>) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
