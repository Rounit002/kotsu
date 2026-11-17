import { useState, type FormEvent } from 'react'
import { useSyncStatus } from '../../data/sync'
import { build } from '../../ui/build'
import { Dialog } from '../../ui/Dialog'
import { useSession } from './store'

const SYNC = {
  off: '',
  saving: 'Saving to your ID…',
  saved: 'Everything is saved to your ID.',
  offline: 'Can’t reach the server. Your changes are kept on this device and will be sent when it is back.',
}

function Account() {
  const { user, guestName, rename, signUp, signIn, signOut } = useSession()
  const sync = useSyncStatus((s) => s.status)
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp')
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const name = user?.name ?? guestName
  const explain = (err: unknown) => setError((err as Error).message)

  // The name saves on its own, so the app can greet you without an ID.
  const saveName = (value: string) => value !== name && (value || !user) && rename(value).catch(explain)

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

  const problem = error && (
    <p className="error" role="alert">
      {error}
    </p>
  )

  if (user)
    return (
      <div className="dialog-body stack" {...build('print', 11)}>
        {nameField}
        <div className="field">
          <span className="label">Email</span>
          {user.email}
        </div>
        <p className="muted" role="status">
          {SYNC[sync]}
        </p>
        {problem}
        <button className="btn btn-outline" onClick={signOut}>
          Sign out
        </button>
      </div>
    )

  if (sentTo)
    return (
      <div className="dialog-body stack" {...build('print')}>
        <p>
          <strong>Check your inbox.</strong> We sent a link to {sentTo}.
        </p>
        <p className="muted">Open it on this device and you will be signed in. Everything you have written here goes with you.</p>
        <button className="btn btn-outline" onClick={() => setSentTo('')}>
          Back
        </button>
      </div>
    )

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const credentials = { provider: 'password', email, password: String(form.get('password')) } as const
    setError('')
    try {
      if (mode === 'signIn') await signIn(credentials)
      else if ((await signUp(String(form.get('name')).trim(), credentials)) === 'confirm-email') setSentTo(email)
    } catch (err) {
      explain(err)
    }
  }

  const signingUp = mode === 'signUp'

  return (
    <form className="dialog-body stack" onSubmit={submit} {...build('print', 11)}>
      <p className="muted">Your planner works without an ID and is saved on this device. Create an ID to keep it safe and open it on any device.</p>
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
      {problem}
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
