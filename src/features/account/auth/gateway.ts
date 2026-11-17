import type { User } from '../../../domain/types'

/** Every way of proving who you are. Only `password` has a screen today. */
export type Credentials =
  | { provider: 'password'; email: string; password: string }
  | { provider: 'phone'; phone: string; code: string }
  | { provider: 'google'; idToken: string }

/**
 * The contract the app talks to; `supabaseGateway` fulfils it.
 * Failures reject with an `Error` whose message is safe to show the user.
 */
export interface AuthGateway {
  /** A new ID is either signed in at once, or must first be confirmed from an emailed link. */
  signUp: (name: string, credentials: Credentials) => Promise<'signed-in' | 'confirm-email'>
  signIn: (credentials: Credentials) => Promise<void>
  rename: (name: string) => Promise<void>
  signOut: () => Promise<void>
  /**
   * Reports who is signed in: once at start-up, then whenever it changes — a sign-in or
   * sign-out here or in another tab, an emailed link being opened, a session running out.
   * This is the only way the app learns who the user is.
   */
  watch: (onChange: (user: User | null) => void) => void
}
