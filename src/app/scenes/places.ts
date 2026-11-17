import {
  aurora,
  birds,
  cumulus,
  down,
  across,
  faces,
  finish,
  glitter,
  glow,
  H,
  haze,
  land,
  litLand,
  milkyWay,
  orb,
  picture,
  pines,
  rng,
  sky,
  skyline,
  snow,
  stars,
  W,
  walker,
  water,
} from './paint'

/**
 * The backgrounds: five places, each painted twice — by day (light mode) and by night (dark mode).
 * A place keeps its land between the two; only the light changes. Each picture is listed back to
 * front, the way it would be painted. To add a place, paint its two pictures and add it to PLACES.
 */
export interface Place {
  id: string
  name: string
  /** The colour of its sky, shown for the moment before the picture itself is ready. */
  base: { day: string; night: string }
  day: () => string
  night: () => string
}

const MOON_SEAS = 'rgba(120,135,175,0.45)'

// ── Himalaya: snow peaks, a walker on the ridge, the aurora overhead ────────────────────────
const himalaya = (() => {
  const far = skyline(101, 650, 260, { sharp: true, spread: 0.9 })
  const peaks = skyline(117, 770, 400, { sharp: true, spread: 0.72, detail: 7 })
  const ledge = skyline(133, 880, 120, { detail: 4, spread: 0.6, ragged: 2 })

  return {
    id: 'himalaya',
    name: 'Himalaya',
    base: { day: '#f1b9cf', night: '#06122b' },
    night: () =>
      picture(() => [
        sky([0, '#02040e'], [0.5, '#07142e'], [0.85, '#0e2f44']),
        stars(3, 320, 640, '#eaf2ff'),
        glow(640, 400, 760, '#2fe6a1', 0.2, 0.42),
        aurora(41, 480, 360, ['#5dffb4', '#2fd6a6', '#8a5cff'], 0.95),
        aurora(47, 390, 270, ['#9dffb0', '#3fe0d0', '#d26bff'], 0.7),
        land(far, down([0, '#16264a'], [1, '#0c1830'])),
        snow(5, far, 540, '#bfeede', '#52709c'),
        haze(9, 560, 160, '#3fd6b0', 0.2),
        land(peaks, down([0, '#1b2a52'], [0.7, '#0b1330'])),
        faces(peaks, '#080e24', 0.5, 0.75),
        snow(6, peaks, 590, '#e9fff6', '#6f8fc0'),
        haze(12, 700, 170, '#9fe8d8', 0.26),
        land(ledge, '#040816'),
        walker(ledge, 330, '#040816', 1.6),
        finish(),
      ]),
    day: () =>
      picture(() => [
        sky([0, '#7f9be0'], [0.42, '#f1b9cf'], [0.7, '#ffdcb5'], [1, '#ffe9cf']),
        haze(21, 90, 300, '#fff6f2', 0.75, [0.003, 0.02], 0.42),
        glow(1080, 560, 560, '#fff1c9', 0.95),
        land(far, down([0, '#b7a3d6'], [1, '#dcc6e0'])),
        snow(5, far, 540, '#ffe9df', '#c3b0e0'),
        haze(9, 560, 150, '#ffe9df', 0.55),
        land(peaks, down([0, '#8f83c0'], [0.8, '#c7b3d9'])),
        faces(peaks, '#6f66ad', 0.5, 0.5),
        snow(6, peaks, 590, '#fff3e8', '#a79dd8'),
        haze(12, 700, 170, '#fff0e6', 0.6),
        land(ledge, '#463f6e'),
        walker(ledge, 330, '#3a3460', 1.6),
        birds(8, 860, 250, '#6e63a0'),
        finish(0.16),
      ]),
  }
})()

// ── Ridge: blue ranges fading into mist under a full moon ───────────────────────────────────
const ridge = (() => {
  const [r1, r2] = [skyline(11, 600, 230, { sharp: true }), skyline(23, 680, 170, { sharp: true })]
  const [r3, r4] = [skyline(37, 770, 120, { ragged: 3 }), skyline(52, 870, 100, { ragged: 5 })]

  return {
    id: 'ridge',
    name: 'Blue Ridge',
    base: { day: '#b5d5f3', night: '#070c22' },
    night: () =>
      picture(() => [
        sky([0, '#02030a'], [0.45, '#070c22'], [0.75, '#15214a']),
        stars(7, 280),
        orb(1010, 150, 42, '#e3e9f6', '#7d93d6', MOON_SEAS),
        land(r1, down([0, '#152046'], [1, '#1c2a58'])),
        faces(r1, '#0d1634', 0.5, 0.6),
        haze(3, 560, 140, '#6f86c9', 0.2),
        land(r2, down([0, '#0e1736'], [1, '#17234e'])),
        faces(r2, '#080f28', 0.5, 0.6),
        haze(4, 650, 130, '#6f86c9', 0.18),
        litLand(r3, '#16224a', '#080e24', 18),
        litLand(r4, '#0e1734', '#04081a', 14),
        pines(5, r4, 48, '#030614'),
        finish(),
      ]),
    day: () =>
      picture(() => [
        sky([0, '#6fa8e6'], [0.45, '#b5d5f3'], [0.75, '#f6ead6']),
        orb(1010, 150, 46, '#fff7df', '#fff0c0'),
        cumulus(3, [[260, 210, 1.25], [700, 340, 0.8], [1240, 330, 0.95]], '#ffffff', '#c9d9ee'),
        land(r1, down([0, '#a8bfe0'], [1, '#d3e0f0'])),
        faces(r1, '#8fa9d0', 0.5, 0.6),
        haze(3, 560, 140, '#ffffff', 0.5),
        land(r2, down([0, '#86a4cf'], [1, '#bfd2ea'])),
        faces(r2, '#6f8fbf', 0.5, 0.55),
        haze(4, 650, 130, '#ffffff', 0.45),
        litLand(r3, '#7f9fc0', '#5f84a8', 18),
        litLand(r4, '#5f8a8f', '#3f6a70', 14),
        pines(5, r4, 48, '#2f555c'),
        birds(2, 420, 240, '#5a7396'),
        finish(0.14),
      ]),
  }
})()

// ── Dunes: the Milky Way over a sea of sand ─────────────────────────────────────────────────
const dunes = (() => {
  const [d1, d2] = [skyline(61, 640, 120, { detail: 3, spread: 0.7 }), skyline(67, 730, 150, { detail: 3, spread: 0.55 })]
  const [d3, d4] = [skyline(71, 830, 170, { detail: 3, spread: 0.45 }), skyline(79, 905, 140, { detail: 2, spread: 0.5 })]

  return {
    id: 'dunes',
    name: 'Dunes',
    base: { day: '#f8ad7c', night: '#0b0f26' },
    night: () =>
      picture(() => [
        sky([0, '#03040c'], [0.5, '#0b0f26'], [0.8, '#2a2140'], [1, '#3c2a45']),
        milkyWay(5, -28, '#8fa2ff', 300),
        stars(9, 260),
        glow(1000, 650, 460, '#7a5688', 0.4, 0.4),
        litLand(d1, '#3a3157', '#1a1832', 30),
        litLand(d2, '#2d2749', '#131226', 34),
        litLand(d3, '#231f3c', '#0c0b1b', 40),
        litLand(d4, '#1a1730', '#070712', 40),
        finish(),
      ]),
    day: () =>
      picture(() => [
        sky([0, '#f6c890'], [0.4, '#f8ad7c'], [0.75, '#f39272'], [1, '#f6b68e']),
        haze(4, 240, 240, '#fff2d6', 0.4, [0.003, 0.02], 0.4),
        orb(1010, 440, 72, '#fff6dc', '#ffe7a8'),
        litLand(d1, '#f2b98a', '#d98c6a', 30),
        litLand(d2, '#eaa574', '#c4714f', 34),
        litLand(d3, '#dd8d5d', '#a8563f', 40),
        litLand(d4, '#c97549', '#8a3f33', 40),
        birds(6, 380, 280, '#8a4a3a'),
        finish(0.18),
      ]),
  }
})()

// ── Lake: mountains and pines doubled in still water ────────────────────────────────────────
const lake = (() => {
  const SHORE = 620
  const [m1, m2] = [skyline(83, SHORE, 230, { sharp: true, spread: 0.8 }), skyline(89, SHORE + 6, 120, { spread: 0.9, ragged: 2 })]
  const bank = skyline(97, 910, 80, { detail: 3, spread: 0.5 })
  const trees = (paint: string) => land(bank, paint) + pines(11, bank, 190, paint, 0, 250) + pines(12, bank, 170, paint, 1210, W)

  return {
    id: 'lake',
    name: 'Still Lake',
    base: { day: '#dfe9ec', night: '#081030' },
    night: () =>
      picture(() => {
        const moon = orb(1010, 170, 40, '#e6ecf8', '#8097d8', MOON_SEAS)
        const shore = land(m1, down([0, '#131e44'], [1, '#1b2a58'])) + faces(m1, '#0c1432', 0.5, 0.6) + land(m2, '#0a1230') + pines(3, m2, 40, '#070d24')
        return [
          sky([0, '#02040d'], [0.5, '#081030'], [0.8, '#1a2c5c']),
          stars(13, 260, 600),
          moon,
          shore,
          water(SHORE, down([0, '#1c2e5e'], [1, '#060b1f']), moon + shore, 0.42),
          glitter(7, 1010, SHORE, '#dfe8ff', 130),
          haze(5, SHORE - 40, 100, '#b9c8f2', 0.28),
          trees('#03060f'),
          finish(),
        ]
      }),
    day: () =>
      picture(() => {
        const sun = orb(1010, 170, 40, '#fffaf0', '#fff2c8')
        const shore = land(m1, down([0, '#9fb9cc'], [1, '#cfdfe6'])) + faces(m1, '#86a6bb', 0.5, 0.5) + land(m2, '#7fa3a6') + pines(3, m2, 40, '#5f8a88')
        return [
          sky([0, '#b9d3e6'], [0.5, '#dfe9ec'], [0.8, '#f7efe0']),
          sun,
          shore,
          water(SHORE, down([0, '#d5e4e8'], [1, '#8fb4c0']), sun + shore, 0.5),
          glitter(7, 1010, SHORE, '#ffffff', 130),
          haze(5, SHORE - 60, 130, '#ffffff', 0.75),
          haze(6, SHORE + 40, 130, '#ffffff', 0.4),
          trees('#2a4f4a'),
          birds(4, 300, 220, '#5f7f8a'),
          finish(0.14),
        ]
      }),
  }
})()

// ── Coast: a headland and its lighthouse over open sea ──────────────────────────────────────
const coast = (() => {
  const SEA = 580
  const next = rng(103)
  /** Flat sea to the left, then a cliff rising to a plateau on the right. */
  const head = Array.from({ length: 241 }, (_, i): [number, number] => {
    const x = (i / 240) * W
    const rise = Math.min(1, Math.max(0, (x - 880) / 250))
    return [x, H - rise * rise * (3 - 2 * rise) * (430 + Math.sin(x / 60) * 14) - next() * 6 * rise]
  })
  const islands = skyline(109, SEA + 2, 46, { detail: 4, spread: 2.2 })
  const rocks = skyline(113, 915, 90, { sharp: true, spread: 1.7 })

  const lighthouse = (wall: string, band: string, lamp: string, beam: boolean) =>
    (beam ? `<path d="M1206 398L300 250L300 470Z" fill="${across([0, lamp, 0], [1, lamp, 0.5])}" style="mix-blend-mode:screen"/>` : '') +
    `<path d="M1196 470l5 -62h10l5 62z" fill="${wall}"/><path d="M1199 440h14l1 12h-16z" fill="${band}"/>` +
    `<rect x="1198" y="392" width="16" height="16" rx="2" fill="${lamp}"/><path d="M1195 392h22l-11 -12z" fill="${band}"/>` +
    (beam ? glow(1206, 400, 70, lamp, 0.9) : '')

  return {
    id: 'coast',
    name: 'Lighthouse',
    base: { day: '#bfe0f6', night: '#0a1232' },
    night: () =>
      picture(() => {
        const moon = orb(760, 150, 38, '#e6ecf8', '#8097d8', MOON_SEAS)
        const far = land(islands, '#0d1738')
        return [
          sky([0, '#03040f'], [0.5, '#0a1232'], [0.85, '#22305f']),
          stars(17, 280, SEA),
          haze(2, 240, 220, '#3a4d8a', 0.35, [0.003, 0.018], 0.45),
          moon,
          far,
          water(SEA, down([0, '#1a2b60'], [1, '#050a1e']), moon + far, 0.5),
          glitter(9, 760, SEA, '#dfe8ff', 150),
          litLand(head, '#16234c', '#070c1f', 22),
          lighthouse('#c9d1e6', '#3a4670', '#ffe9a8', true),
          land(rocks, '#03060f'),
          finish(),
        ]
      }),
    day: () =>
      picture(() => {
        const sun = orb(760, 150, 44, '#fff7df', '#fff0c0')
        const far = land(islands, '#8fb3cf')
        const clouds = cumulus(5, [[240, 230, 1.2], [1180, 250, 1.0], [560, 360, 0.7]], '#ffffff', '#c6d9ee')
        return [
          sky([0, '#5fa6e6'], [0.5, '#bfe0f6'], [0.85, '#fdf2da']),
          sun,
          clouds,
          far,
          water(SEA, down([0, '#86d3e2'], [0.5, '#439fc6'], [1, '#26709d']), sun + far + clouds, 0.38),
          glitter(9, 760, SEA, '#ffffff', 150),
          `<path d="M470 ${SEA}l16 -40v40zm20 0l-2 -30l18 30z" fill="#ffffff"/>`,
          litLand(head, '#a9bd8c', '#6e8c74', 22),
          lighthouse('#ffffff', '#d9534f', '#ffe9a8', false),
          land(rocks, '#3d5560'),
          birds(3, 900, 200, '#5f7f9a'),
          finish(0.14),
        ]
      }),
  }
})()

export const PLACES: Place[] = [himalaya, ridge, dunes, lake, coast]

const urls = new Map<string, string>()

/** The picture for a place and a time of day, painted once and then kept. */
export const pictureOf = (place: Place, time: 'day' | 'night') => {
  const key = `${place.id}.${time}`
  if (!urls.has(key)) urls.set(key, URL.createObjectURL(new Blob([place[time]()], { type: 'image/svg+xml' })))
  return urls.get(key)!
}
