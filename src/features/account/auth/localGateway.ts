import type { User } from '../../../domain/types'
import type { AuthGateway, Credentials } from './gateway'

/** On-device accounts. Passwords are never stored — only a salted PBKDF2 hash. */
interface Account {
  user: User
  salt: string
  hash: string
}

const KEY = 'kotsu.accounts'
const read = (): Account[] => JSON.parse(localStorage.getItem(KEY) ?? '[]')
const write = (accounts: Account[]) => localStorage.setItem(KEY, JSON.stringify(accounts))

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')

const hashPassword = async (password: string, salt: string) => {
  const encode = (s: string) => new TextEncoder().encode(s)
  const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits'])
  const params = { name: 'PBKDF2', hash: 'SHA-256', salt: encode(salt), iterations: 210_000 }
  return hex(await crypto.subtle.deriveBits(params, key, 256))
}

const passwordOnly = (c: Credentials) => {
  if (c.provider !== 'password') throw new Error('This sign-in method is not available yet.')
  return { email: c.email.trim().toLowerCase(), password: c.password }
}

export const localGateway: AuthGateway = {
  async signUp(name, credentials) {
    const { email, password } = passwordOnly(credentials)
    const accounts = read()
    if (accounts.some((a) => a.user.email === email)) throw new Error('An ID with this email already exists on this device.')
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
    const user: User = { id: crypto.randomUUID(), name, email, providers: ['password'], plan: 'free', createdAt: Date.now() }
    write([...accounts, { user, salt, hash: await hashPassword(password, salt) }])
    return user
  },

  async signIn(credentials) {
    const { email, password } = passwordOnly(credentials)
    const account = read().find((a) => a.user.email === email)
    if (!account || account.hash !== (await hashPassword(password, account.salt))) throw new Error('Email or password is incorrect.')
    return account.user
  },

  async rename(userId, name) {
    const accounts = read().map((a) => (a.user.id === userId ? { ...a, user: { ...a.user, name } } : a))
    const account = accounts.find((a) => a.user.id === userId)
    if (!account) throw new Error('This ID no longer exists on this device.')
    write(accounts)
    return account.user
  },

  async signOut() {},
}
