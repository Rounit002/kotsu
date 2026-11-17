import type { AuthError, User as Account } from '@supabase/supabase-js'
import type { AuthProviderId } from '../../../config/features'
import { database } from '../../../data/supabase'
import type { User } from '../../../domain/types'
import type { AuthGateway, Credentials } from './gateway'

/** Supabase's error codes, in words for the person signing in. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Confirm your email first — open the link we sent you.',
  user_already_exists: 'An ID with this email already exists. Sign in instead.',
  weak_password: 'Choose a longer password.',
  over_email_send_rate_limit: 'Too many emails were sent just now. Try again in a few minutes.',
}

const failure = (error: AuthError) =>
  new Error(MESSAGES[error.code ?? ''] ?? (error.status ? error.message : 'Could not reach the server. Check your connection.'))

const passwordOnly = (c: Credentials) => {
  if (c.provider !== 'password') throw new Error('This sign-in method is not available yet.')
  return { email: c.email.trim().toLowerCase(), password: c.password }
}

/** The name travels with the sign-in itself, so it is there offline; the plan is the database's to say. */
const toUser = async (account: Account): Promise<User> => {
  const { data } = await (await database()).from('subscriptions').select('plan').maybeSingle()
  const providers: string[] = account.app_metadata.providers ?? ['email']
  return {
    id: account.id,
    name: account.user_metadata.name ?? '',
    email: account.email,
    phone: account.phone || undefined,
    providers: providers.map((p) => (p === 'email' ? 'password' : p)) as AuthProviderId[],
    plan: data?.plan ?? 'free',
    createdAt: Date.parse(account.created_at),
  }
}

export const supabaseGateway: AuthGateway = {
  async signUp(name, credentials) {
    const { data, error } = await (await database()).auth.signUp({
      ...passwordOnly(credentials),
      options: { data: { name }, emailRedirectTo: location.origin },
    })
    if (error) throw failure(error)
    // Supabase answers a repeat sign-up with a hollow user instead of an error.
    if (!data.user?.identities?.length) throw new Error(MESSAGES.user_already_exists)
    return data.session ? 'signed-in' : 'confirm-email'
  },

  async signIn(credentials) {
    const { error } = await (await database()).auth.signInWithPassword(passwordOnly(credentials))
    if (error) throw failure(error)
  },

  async rename(name) {
    const db = await database()
    const { data, error } = await db.auth.updateUser({ data: { name } })
    if (error) throw failure(error)
    await db.from('profiles').update({ name }).eq('id', data.user.id)
  },

  // Only this device: other devices stay signed in.
  async signOut() {
    await (await database()).auth.signOut({ scope: 'local' })
  },

  async watch(onChange) {
    const db = await database()
    let known: string | null | undefined
    db.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null
      if (id === known) return // a refreshed session for the same person is not news
      known = id
      // Supabase must not be called from inside its own callback, so the rest runs just after it.
      setTimeout(async () => onChange(session && (await toUser(session.user))))
    })
  },
}
