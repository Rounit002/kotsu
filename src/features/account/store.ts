import { currentOwner, deviceStore, GUEST, hasCopyOf, switchOwner } from '../../data/persist'
import { nothingStored, startSync, stopSync } from '../../data/sync'
import type { User } from '../../domain/types'
import type { AuthGateway, Credentials } from './auth/gateway'
import { supabaseGateway } from './auth/supabaseGateway'

const auth: AuthGateway = supabaseGateway

interface SessionState {
  /** The name shown before an ID exists — the app is fully usable without one. */
  guestName: string
  /** Kept on the device so the right name and data are on screen at once; `auth.watch` keeps it true. */
  user: User | null
  rename: (name: string) => Promise<void>
  signUp: AuthGateway['signUp']
  signIn: (credentials: Credentials) => Promise<void>
  signOut: () => Promise<void>
}

/** Who is using this device. Signing in and out only ask; what follows happens in `auth.watch` below. */
export const useSession = deviceStore<SessionState>('session', (set, get) => ({
  guestName: '',
  user: null,

  rename: async (name) => {
    const { user } = get()
    if (!user) {
      set({ guestName: name })
      return
    }
    await auth.rename(name)
    set({ user: { ...user, name } })
  },

  signUp: auth.signUp,
  signIn: auth.signIn,
  signOut: auth.signOut,
}))

/**
 * Whoever is signed in owns what is on screen: their data is shown and kept in step with the
 * database, and nobody else's is. A guest's work goes with them into a brand-new ID — one that
 * holds nothing yet, on this device or in the database.
 */
auth.watch(async (user) => {
  stopSync()
  if (!user) {
    if (currentOwner() !== GUEST) switchOwner(GUEST)
    return useSession.setState({ user: null })
  }

  const adopt = currentOwner() === GUEST && !hasCopyOf(user.id) && (await nothingStored().catch(() => false))
  if (currentOwner() !== user.id) switchOwner(user.id, adopt)
  useSession.setState({ user, ...(adopt && { guestName: '' }) })
  await startSync(user.id, adopt)
})

export const useDisplayName = () => useSession((s) => s.user?.name ?? s.guestName)
export const usePlan = () => useSession((s) => s.user?.plan ?? 'free')
