import { useEffect, useState } from 'react'
import { PLACES } from './places'

/**
 * Which background is up, and whether it is day or night there.
 *
 * Day is the light theme and night the dark one, so the sun/moon button changes both together.
 * Until someone picks, the app follows the device; after that it remembers on this device.
 * index.html applies the same rule before first paint, so the page never flashes the wrong theme.
 */
type Theme = 'light' | 'dark'

const THEME_KEY = 'kotsu.theme'
const PLACE_KEY = 'kotsu.scene'
const BASE_KEY = 'kotsu.base'
const device = matchMedia('(prefers-color-scheme: dark)')
const picked = () => localStorage.getItem(THEME_KEY) as Theme | null
const current = (): Theme => picked() ?? (device.matches ? 'dark' : 'light')

export function useScene() {
  const [theme, setTheme] = useState(current)
  const [placeId, setPlaceId] = useState(() => localStorage.getItem(PLACE_KEY))

  const place = PLACES.find((p) => p.id === placeId) ?? PLACES[0]
  const time: 'day' | 'night' = theme === 'dark' ? 'night' : 'day'

  useEffect(() => {
    const base = place.base[time]
    document.documentElement.dataset.theme = theme
    document.documentElement.style.setProperty('--base', base)
    localStorage.setItem(BASE_KEY, base) // index.html paints this first on the next load
  }, [theme, place, time])

  useEffect(() => {
    const follow = () => picked() || setTheme(current())
    device.addEventListener('change', follow)
    return () => device.removeEventListener('change', follow)
  }, [])

  return {
    theme,
    time,
    place,
    toggleTheme: () => {
      const next = theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      setTheme(next)
    },
    choosePlace: (id: string) => {
      localStorage.setItem(PLACE_KEY, id)
      setPlaceId(id)
    },
  }
}
