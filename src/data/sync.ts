import { create } from 'zustand'
import { database } from './supabase'

/**
 * Keeps a signed-in person's stores and their database tables in step.
 *
 * The device stays the first place everything is written, so the app is instant and works
 * offline. Each store is mirrored to one table: on sign-in the table is read and merged in,
 * and from then on every change is noted on an "unsent" list and sent a moment later. The list
 * is kept on the device, so a change made offline — or just before closing the tab — still goes
 * out next time. Until a change has been sent, the device's version of that row wins.
 */

/** What the Profile box says about the copy in the database. */
export const useSyncStatus = create<{ status: 'off' | 'saving' | 'saved' | 'offline' }>(() => ({ status: 'off' }))

const waiting = new Set<string>()
const report = (table: string, state: 'saving' | 'saved' | 'offline') => {
  if (state === 'saved') waiting.delete(table)
  else waiting.add(table)
  useSyncStatus.setState({ status: state === 'offline' ? 'offline' : waiting.size ? 'saving' : 'saved' })
}

interface Mirror<S, R, Row> {
  table: string
  store: { getState: () => S; setState: (state: Partial<S>) => void; subscribe: (listener: (now: S, before: S) => void) => () => void }
  /** The store's records, and the store state that holds a given set of them. */
  records: (state: S) => R[]
  restore: (records: R[]) => Partial<S>
  /** A record as the table stores it, and back. */
  toRow: (record: R) => Row
  fromRow: (row: Row) => R
}

interface Running {
  start: (owner: string, seed: boolean) => Promise<void>
  stop: () => void
  isEmpty: () => Promise<boolean>
}

const mirrors: Running[] = []
const PAGE = 1000 // the most rows the database returns, or accepts, in one request
const SEND_AFTER_MS = 800 // long enough that typing a note is one save, not one per letter

const inPages = <T>(items: T[]) => Array.from({ length: Math.ceil(items.length / PAGE) }, (_, i) => items.slice(i * PAGE, (i + 1) * PAGE))

/** Declares that a store is mirrored to a table. Call once, next to the store. */
export function mirror<S, R extends { id: string }, Row extends { id: string }>({ table, store, records, restore, toRow, fromRow }: Mirror<S, R, Row>) {
  let stop = () => {}
  const byId = (state = store.getState()) => new Map(records(state).map((r) => [r.id, r]))

  mirrors.push({
    stop: () => stop(),

    isEmpty: async () => {
      const { count, error } = await (await database()).from(table).select('id', { count: 'exact', head: true })
      if (error) throw error
      return !count
    },

    async start(owner, seed) {
      const key = `kotsu.${owner}.unsent.${table}`
      const kept = JSON.parse(localStorage.getItem(key) ?? '{}')
      const unsent = { save: new Set<string>(kept.save), remove: new Set<string>(kept.remove) }
      const remember = () => localStorage.setItem(key, JSON.stringify({ save: [...unsent.save], remove: [...unsent.remove] }))
      let [live, applying, sending, timer] = [true, false, false, 0]

      const send = async () => {
        if (!live || sending || !(unsent.save.size + unsent.remove.size)) return
        sending = true
        const db = await database()
        const now = byId()
        const saving = [...unsent.save].flatMap((id) => now.get(id) ?? [])
        const removing = [...unsent.remove]
        let failed = false
        for (const page of inPages(saving)) failed ||= !!(await db.from(table).upsert(page.map(toRow))).error
        for (const page of inPages(removing)) failed ||= !!(await db.from(table).delete().in('id', page)).error
        sending = false
        if (failed) return report(table, 'offline')

        // Anything edited again while this was on its way stays on the list.
        const after = byId()
        saving.forEach((record) => after.get(record.id) === record && unsent.save.delete(record.id))
        removing.forEach((id) => unsent.remove.delete(id))
        remember()
        if (unsent.save.size + unsent.remove.size) soon()
        else report(table, 'saved')
      }

      const soon = () => {
        report(table, 'saving')
        clearTimeout(timer)
        timer = window.setTimeout(send, SEND_AFTER_MS)
      }

      const pull = async () => {
        const db = await database()
        const rows: Row[] = []
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await db.from(table).select('*').order('id').range(from, from + PAGE - 1)
          if (error) return report(table, 'offline')
          rows.push(...(data as Row[]))
          if (data.length < PAGE) break
        }
        if (!live) return
        const merged = new Map(rows.map((row) => [row.id, fromRow(row)]))
        const mine = byId()
        unsent.save.forEach((id) => mine.has(id) && merged.set(id, mine.get(id)!))
        unsent.remove.forEach((id) => merged.delete(id))
        applying = true
        store.setState(restore([...merged.values()]))
        applying = false
      }

      const unsubscribe = store.subscribe((state, before) => {
        if (applying) return
        const [now, was] = [byId(state), byId(before)]
        now.forEach((record, id) => was.get(id) !== record && (unsent.save.add(id), unsent.remove.delete(id)))
        was.forEach((_, id) => now.has(id) || (unsent.save.delete(id), unsent.remove.add(id)))
        remember()
        soon()
      })

      // Coming back — to the network, or to this tab — is the moment to catch up.
      const onReturn = () => (unsent.save.size + unsent.remove.size ? send() : document.hidden || pull())
      window.addEventListener('online', onReturn)
      document.addEventListener('visibilitychange', onReturn)

      stop = () => {
        live = false
        unsubscribe()
        clearTimeout(timer)
        window.removeEventListener('online', onReturn)
        document.removeEventListener('visibilitychange', onReturn)
      }

      // A guest's work, newly adopted by this ID, has never been sent: all of it goes on the list.
      if (seed) byId().forEach((_, id) => unsent.save.add(id))
      remember()
      await pull()
      if (unsent.save.size + unsent.remove.size) soon()
      else report(table, 'saved')
    },
  })
}

/** Begin mirroring every declared store for this person. `seed` sends what is already on screen. */
export const startSync = (owner: string, seed: boolean) => Promise.all(mirrors.map((m) => m.start(owner, seed)))

export const stopSync = () => {
  mirrors.forEach((m) => m.stop())
  waiting.clear()
  useSyncStatus.setState({ status: 'off' })
}

/** Whether the signed-in person has nothing in the database yet. */
export const nothingStored = async () => (await Promise.all(mirrors.map((m) => m.isEmpty()))).every(Boolean)
