import { create } from 'zustand'
import { today, type ISODate } from '../../domain/dates'

/**
 * The day being planned. It lives in the app, not in the address: the address only names the
 * view (/daily), so nothing about what is on screen can be changed by editing it. Every visit
 * opens on today.
 */
export const useSelectedDate = create<{ date: ISODate; select: (date: ISODate) => void }>((set) => ({
  date: today(),
  select: (date) => set({ date }),
}))
