import { create, type StateCreator } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Where app data lives, and whose it is.
 *
 * Every person's data is kept apart under their own owner id — `guest` until they sign in.
 * This file is the copy on the device, which is always written first. For someone signed in,
 * data/sync.ts mirrors that copy to the database.
 * Bump `version` (and add `migrate`) when a store's shape changes.
 */
const PREFIX = 'kotsu'
const OWNER_KEY = `${PREFIX}.owner`
export const GUEST = 'guest'

type Creator<S> = StateCreator<S, [['zustand/persist', unknown]]>

const persisted = <S>(key: string, creator: Creator<S>) =>
  create<S>()(persist(creator, { name: key, version: 1, storage: createJSONStorage<S>(() => localStorage) }))

let owner = localStorage.getItem(OWNER_KEY) ?? GUEST
const keyFor = (name: string, who = owner) => `${PREFIX}.${who}.${name}`
const switchers: ((to: string, adopt: boolean) => void)[] = []

export const currentOwner = () => owner

/** Whether this device already holds a copy of that person's data. */
export const hasCopyOf = (who: string) => Object.keys(localStorage).some((key) => key.startsWith(`${PREFIX}.${who}.`))

/** State that belongs to the device rather than a person — who is signed in. */
export const deviceStore = <S>(name: string, creator: Creator<S>) => persisted(`${PREFIX}.${name}`, creator)

/** State that belongs to one person. It follows whoever is signed in. */
export const userStore = <S>(name: string, creator: Creator<S>) => {
  const store = persisted(keyFor(name), creator)

  switchers.push((to, adopt) => {
    const from = keyFor(name)
    const next = keyFor(name, to)
    store.persist.setOptions({ name: next })
    if (adopt) {
      store.setState(store.getState()) // re-save what is on screen under the new owner
      localStorage.removeItem(from)
    } else if (localStorage.getItem(next)) void store.persist.rehydrate()
    else store.setState(store.getInitialState(), true)
  })

  return store
}

/**
 * Point every user store at another person's data.
 * `adopt` carries the current data across — used when a guest's work becomes a new ID's.
 */
export const switchOwner = (to: string, adopt = false) => {
  switchers.forEach((run) => run(to, adopt))
  owner = to
  localStorage.setItem(OWNER_KEY, to)
}
