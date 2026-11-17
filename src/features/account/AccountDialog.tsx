import { useState, type FormEvent } from 'react'
import { build } from '../../ui/build'
import { Dialog } from '../../ui/Dialog'
import { useSession } from './store'

function Account() {
  const { user, guestName, rename, signUp, signIn, signOut } = useSession()
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp')
  const [error, setError] = useState('')
  const name = user?.name ?? guestName

  // The name saves on its own, so the app can greet you without an ID.
  const saveName = (value: string) => value !== name && (value || !user) && rename(value)

  const nameField = (
    <label className="field">
      <span className="label">Name</span>
      <input
        className="input"
        name="name"
        required
        autoComplete="name"
        placeholder="What should we call you?"
        defaultValue={name}
        onBlur={(e) => saveName(e.target.value.trim())}
      />
    </label>
  )

  if (user)
    return (
      <div className="dialog-body stack" {...build('print', 11)}>
        {nameField}
        <div className="field">
          <span className="label">Email</span>
          {user.email}
        </div>
        <button className="btn btn-outline" onClick={signOut}>
          Sign out
        </button>
      </div>
    )

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const credentials = { provider: 'password', email: String(form.get('email')), password: String(form.get('password')) } as const
    try {
      await (mode === 'signUp' ? signUp(String(form.get('name')).trim(), credentials) : signIn(credentials))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const signingUp = mode === 'signUp'

  return (
    <form className="dialog-body stack" onSubmit={submit} {...build('print', 11)}>
      <p className="muted">Your planner is saved on this device and works without an ID. Create one to be ready for sync when it arrives.</p>
      {signingUp && nameField}
      <label className="field">
        <span className="label">Email</span>
        <input className="input" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <input className="input" name="password" type="password" required minLength={8} autoComplete={signingUp ? 'new-password' : 'current-password'} />
        {signingUp && <span className="muted">At least 8 characters.</span>}
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary">{signingUp ? 'Create ID' : 'Sign in'}</button>
      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(signingUp ? 'signIn' : 'signUp')
          setError('')
        }}
      >
        {signingUp ? 'Already have an ID? Sign in' : 'New here? Create an ID'}
      </button>
    </form>
  )
}

export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Profile" onClose={onClose}>
      <Account />
    </Dialog>
  )
}
