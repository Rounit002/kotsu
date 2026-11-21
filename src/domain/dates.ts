/** Calendar dates are plain local `YYYY-MM-DD` strings: sortable, serialisable, timezone-free. */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromISO = (iso: ISODate) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const isISODate = (s?: string): s is ISODate => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(fromISO(s)) === s

export const today = () => toISO(new Date())
export const yearOf = (iso: ISODate) => Number(iso.slice(0, 4))
export const monthOf = (iso: ISODate) => Number(iso.slice(5, 7)) - 1
export const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`

export const addDays = (iso: ISODate, n: number) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const daysBetween = (a: ISODate, b: ISODate) => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000)

/** Formatters are costly to create and the date rail formats 700 dates at once, so each kind is made once and kept. */
const formatters = new Map<string, Intl.DateTimeFormat>()

export const formatDate = (iso: ISODate, options: Intl.DateTimeFormatOptions) => {
  const key = JSON.stringify(options)
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat(undefined, options))
  return formatters.get(key)!.format(fromISO(iso))
}

export const MONTHS = Array.from({ length: 12 }, (_, m) => formatDate(toISO(new Date(2000, m, 1)), { month: 'short' }))

/** Every day of a year, grouped by month. */
export const daysByMonth = (year: number): ISODate[][] =>
  MONTHS.map((_, m) => Array.from({ length: lastDay(year, m) }, (_, d) => toISO(new Date(year, m, d + 1))))

/** The same day in another year, clamped to the month's end (29 Feb → 28 Feb). */
export const inYear = (iso: ISODate, year: number) => {
  const d = fromISO(iso)
  return toISO(new Date(year, d.getMonth(), Math.min(d.getDate(), lastDay(year, d.getMonth()))))
}

/** Weeks run Monday → Sunday and are identified by their Monday. */
export const weekStart = (iso: ISODate) => addDays(iso, -((fromISO(iso).getDay() + 6) % 7))

/** Every week that overlaps the month. */
export const weeksOfMonth = (year: number, month: number) => {
  const end = toISO(new Date(year, month, lastDay(year, month)))
  const weeks: ISODate[] = []
  for (let w = weekStart(toISO(new Date(year, month, 1))); w <= end; w = addDays(w, 7)) weeks.push(w)
  return weeks
}

/** 90 → "1h 30m", 45 → "45m", 120 → "2h". */
export const formatMinutes = (minutes: number) =>
  [Math.floor(minutes / 60) && `${Math.floor(minutes / 60)}h`, minutes % 60 && `${minutes % 60}m`].filter(Boolean).join(' ') || '0m'
