import type { User } from '../../../domain/types'

/** Every way of proving who you are. Only `password` has a screen today. */
export type Credentials =
  | { provider: 'password'; email: string; password: string }
  | { provider: 'phone'; phone: string; code: string }
  | { provider: 'google'; idToken: string }

/**
 * The contract the app talks to. `localGateway` fulfils it on-device;
 * an API-backed gateway will fulfil the same contract without touching the UI.
 * Failures reject with an `Error` whose message is safe to show the user.
 */
export interface AuthGateway {
  signUp: (name: string, credentials: Credentials) => Promise<User>
  signIn: (credentials: Credentials) => Promise<User>
  rename: (userId: string, name: string) => Promise<User>
  signOut: () => Promise<void>
}
