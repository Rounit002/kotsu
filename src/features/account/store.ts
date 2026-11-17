import { deviceStore, GUEST, switchOwner } from '../../data/persist'
import type { User } from '../../domain/types'
import type { AuthGateway, Credentials } from './auth/gateway'
import { localGateway } from './auth/localGateway'

/** Swap this one line for a Supabase-backed gateway when the backend lands. */
const auth: AuthGateway = localGateway

interface SessionState {
  /** The name shown before an ID exists — the app is fully usable without one. */
  guestName: string
  user: User | null
  rename: (name: string) => Promise<void>
  signUp: (name: string, credentials: Credentials) => Promise<void>
  signIn: (credentials: Credentials) => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Who is using this device. Each sign-in change also switches the planner, goals and
 * lessons to that person's own data, so nobody sees anyone else's.
 */
export const useSession = deviceStore<SessionState>('session', (set, get) => ({
  guestName: '',
  user: null,

  rename: async (name) => {
    const { user } = get()
    set(user ? { user: await auth.rename(user.id, name) } : { guestName: name })
  },

  // A new ID keeps everything the guest had written.
  signUp: async (name, credentials) => {
    const user = await auth.signUp(name, credentials)
    switchOwner(user.id, true)
    set({ user, guestName: '' })
  },

  signIn: async (credentials) => {
    const user = await auth.signIn(credentials)
    switchOwner(user.id)
    set({ user })
  },

  signOut: async () => {
    await auth.signOut()
    switchOwner(GUEST)
    set({ user: null })
  },
}))

export const useDisplayName = () => useSession((s) => s.user?.name ?? s.guestName)
export const usePlan = () => useSession((s) => s.user?.plan ?? 'free')
