/**
 * A small painting kit. Every background is an SVG picture built as a string from these
 * brushes — skies, stars, mountain ranges with a lit and a shaded side, aurora, cloud, water —
 * and then shown as one flat image (see Wall.tsx), so nothing in it has to be redrawn while
 * the interface moves. All randomness is seeded: a scene looks the same every time.
 *
 * One convention holds everything together: the light always comes from the upper right,
 * where the sun or moon hangs. Slopes facing right are lit; slopes facing left are in shade.
 */
export const W = 1440
export const H = 900
const TAU = Math.PI * 2

/** A seeded random source. */
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A smooth wandering value in 0…1 along x, for anything that should vary without jumping. */
const wander = (seed: number, cycles = 3) => {
  const next = rng(seed)
  const waves = Array.from({ length: 4 }, (_, o) => ({ f: (0.7 + next()) * cycles * 1.9 ** o, p: next() * TAU, a: 0.55 ** o }))
  const total = waves.reduce((sum, w) => sum + w.a, 0)
  return (x: number) => waves.reduce((sum, w) => sum + w.a * Math.sin((x / W) * w.f * TAU + w.p), 0) / total / 2 + 0.5
}

// ── Paints: gradients, filters and clips are collected while a picture is drawn ──────────────

let defs: string[] = []
const define = (make: (id: string) => string) => {
  const id = `p${defs.length}`
  defs.push(make(id))
  return `url(#${id})`
}

/** offset, colour, and optionally opacity. */
type Stop = [number, string, number?]
const stops = (list: Stop[]) => list.map(([at, colour, alpha = 1]) => `<stop offset="${at}" stop-color="${colour}" stop-opacity="${alpha}"/>`).join('')

export const down = (...list: Stop[]) => define((id) => `<linearGradient id="${id}" x2="0" y2="1">${stops(list)}</linearGradient>`)
export const across = (...list: Stop[]) => define((id) => `<linearGradient id="${id}">${stops(list)}</linearGradient>`)
export const radial = (...list: Stop[]) => define((id) => `<radialGradient id="${id}">${stops(list)}</radialGradient>`)

export const blur = (x: number, y = x) =>
  define((id) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${x} ${y}"/></filter>`)

/** Breaks a shape up into drifting wisps — the texture of cloud, mist and star-dust. */
export const wisps = (seed: number, fx: number, fy: number, density = 0.5, soften = 5) =>
  define(
    (id) =>
      `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="5" seed="${seed}"/>` +
      `<feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${3.2} 0 0 0 ${-3.2 * (1 - density)}"/>` +
      `<feComposite in="SourceGraphic" operator="in"/><feGaussianBlur stdDeviation="${soften}"/></filter>`,
  )

const clip = (shape: string) => define((id) => `<clipPath id="${id}">${shape}</clipPath>`)

/** Wraps a drawing into a finished picture. */
export const picture = (draw: () => string[]) => {
  defs = []
  const body = draw().join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${body}</svg>`
}

// ── Brushes ─────────────────────────────────────────────────────────────────────────────────

export const fill = (paint: string, extra = '') => `<rect width="${W}" height="${H}" fill="${paint}" ${extra}/>`

export const sky = (...list: Stop[]) => fill(down(...list))

/** A soft pool of light. */
export const glow = (cx: number, cy: number, r: number, colour: string, strength = 1, squash = 1) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * squash}" fill="${radial([0, colour, strength], [0.35, colour, strength * 0.4], [1, colour, 0])}"/>`

/** The sun, or the moon with its seas. */
export const orb = (cx: number, cy: number, r: number, colour: string, halo: string, seas?: string) =>
  glow(cx, cy, r * 6, halo, 0.9) +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colour}"/>` +
  (seas
    ? [
        [-0.3, -0.25, 0.22],
        [0.32, 0.22, 0.3],
        [-0.18, 0.45, 0.12],
        [0.3, -0.42, 0.1],
      ]
        .map(([x, y, s]) => `<circle cx="${cx + x * r}" cy="${cy + y * r}" r="${s * r}" fill="${seas}"/>`)
        .join('')
    : '')

/** A sky of stars: mostly faint, thicker towards the top, a few bright ones with a halo. */
export const stars = (seed: number, count: number, below = 620, tint = '#ffffff') => {
  const next = rng(seed)
  return Array.from({ length: count }, () => {
    const [cx, cy, big] = [next() * W, next() ** 1.5 * below, next() ** 6]
    const dot = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(0.45 + big * 1.7).toFixed(2)}" fill="${tint}" opacity="${(0.25 + next() * 0.75).toFixed(2)}"/>`
    return big > 0.45 ? `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(5 + big * 5).toFixed(1)}" fill="${tint}" opacity="0.1"/>${dot}` : dot
  }).join('')
}

/** The Milky Way: a tilted river of dust and crowded stars. */
export const milkyWay = (seed: number, angle: number, tint: string, cy = 300) => {
  const next = rng(seed)
  const crowd = Array.from({ length: 520 }, () => {
    const y = cy + (next() + next() + next() - 1.5) * 150
    return `<circle cx="${(next() * 2000 - 280).toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.35 + next() ** 4 * 1.1).toFixed(2)}" fill="#fff" opacity="${(0.2 + next() * 0.6).toFixed(2)}"/>`
  }).join('')
  const band = (height: number, colour: string, alpha: number, texture: string) =>
    `<rect x="-300" y="${cy - height / 2}" width="2040" height="${height}" fill="${down([0, colour, 0], [0.5, colour, alpha], [1, colour, 0])}" filter="${texture}"/>`
  return (
    `<g transform="rotate(${angle} ${W / 2} ${cy})">` +
    band(360, tint, 0.55, wisps(seed, 0.004, 0.012, 0.62, 10)) +
    band(200, '#ffffff', 0.5, wisps(seed + 1, 0.007, 0.02, 0.5, 6)) +
    band(70, '#05060f', 0.75, wisps(seed + 2, 0.006, 0.03, 0.42, 5)) +
    crowd +
    `</g>`
  )
}

/** Aurora: curtains of rays hanging from a wandering line, brightest along their lower edge. */
export const aurora = (seed: number, y: number, height: number, [low, mid, high]: string[], strength = 1) => {
  const [next, fold, reach, shine] = [rng(seed), wander(seed + 1, 2), wander(seed + 2, 7), wander(seed + 3, 5)]
  const paint = down([0, high, 0], [0.5, mid, 0.5], [0.9, low, 0.95], [1, low, 0])
  let rays = ''
  // Uneven spacing and widths, so the rays never line up into a visible grid.
  for (let x = -40; x < W + 40; x += 5 + next() * 8) {
    const foot = y + (fold(x) - 0.5) * 240 + (next() - 0.5) * 10
    const tall = height * (0.35 + reach(x) * 0.75)
    rays += `<rect x="${x.toFixed(1)}" y="${(foot - tall).toFixed(1)}" width="${(8 + next() * 10).toFixed(1)}" height="${tall.toFixed(1)}" fill="${paint}" opacity="${(Math.max(0, shine(x) - 0.22) * 1.3 * strength).toFixed(2)}"/>`
  }
  return `<g filter="${blur(9, 4)}" style="mix-blend-mode:screen">${rays}</g>`
}

/** A band of cloud or mist. */
export const haze = (seed: number, y: number, height: number, colour: string, alpha: number, [fx, fy] = [0.004, 0.014], density = 0.5) =>
  `<rect y="${y}" width="${W}" height="${height}" fill="${down([0, colour, 0], [0.5, colour, alpha], [1, colour, 0])}" filter="${wisps(seed, fx, fy, density)}"/>`

/** Heaped clouds: lit tops over shaded undersides. */
export const cumulus = (seed: number, places: [number, number, number][], light: string, shade: string) => {
  const next = rng(seed)
  const soft = blur(7)
  return places
    .map(([x, y, s]) => {
      const puffs = Array.from({ length: 7 }, (_, i) => {
        const [dx, dy, r] = [(i - 3) * 34 + next() * 20, -Math.sin((i / 6) * Math.PI) * 30 * next() - next() * 8, 26 + next() * 26]
        return `<ellipse cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" rx="${(r * 1.35).toFixed(0)}" ry="${r.toFixed(0)}"/>`
      }).join('')
      return `<g transform="translate(${x} ${y}) scale(${s})" filter="${soft}"><g fill="${shade}" transform="translate(4 12)">${puffs}</g><g fill="${light}">${puffs}</g></g>`
    })
    .join('')
}

// ── Land ────────────────────────────────────────────────────────────────────────────────────

type Line = [number, number][]

interface Terrain {
  /** Sharp, creased peaks rather than rolling ground. */
  sharp?: boolean
  /** How many octaves of detail, and how many broad shapes fit across the picture. */
  detail?: number
  spread?: number
  /** A ragged edge, in pixels — a tree line. */
  ragged?: number
}

/** A skyline from layered waves — each octave half the size of the last, as real terrain is. */
export const skyline = (seed: number, base: number, height: number, { sharp = false, detail = 6, spread = 1, ragged = 0 }: Terrain = {}): Line => {
  const next = rng(seed)
  const waves = Array.from({ length: detail }, (_, o) => ({ f: (1.1 + next() * 0.8) * 2 ** o * spread, p: next() * TAU, a: 0.5 ** o }))
  const total = waves.reduce((sum, w) => sum + w.a, 0)
  return Array.from({ length: 241 }, (_, i) => {
    const wave = waves.reduce((sum, w) => sum + w.a * Math.sin((i / 240) * w.f * TAU + w.p), 0) / total
    const lift = sharp ? (1 - Math.abs(wave)) ** 2.4 : (wave + 1) / 2
    return [(i / 240) * W, base - height * lift - next() * ragged]
  })
}

const trace = (line: Line) => line.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('')
/** `past` carries the shape beyond both edges of the picture, for copies that get shifted sideways. */
const outline = (line: Line, past = 0) => `M${-past} ${H}L${-past} ${line[0][1].toFixed(1)}${trace(line)}L${W + past} ${line[240][1].toFixed(1)}L${W + past} ${H}Z`
const heightAt = (line: Line, x: number) => line[Math.max(0, Math.min(240, Math.round((x / W) * 240)))][1]

/** Ground, from a skyline down to the bottom of the picture. */
export const land = (line: Line, paint: string, extra = '') => `<path d="${outline(line)}" fill="${paint}" ${extra}/>`

/**
 * Ground with light falling across it: the body is in shade, and a rim along every crest that
 * faces the light is left bright. `reach` is how far the light gets over the crests.
 */
export const litLand = (line: Line, light: string, shade: string, reach = 26) =>
  land(line, light) + `<g clip-path="${clip(`<path d="${outline(line)}"/>`)}"><path d="${outline(line, 80)}" fill="${shade}" transform="translate(${-reach} ${reach * 0.45})"/></g>`

/**
 * Mountain faces: from each summit a ridge runs down and away from the light, and everything
 * behind it is in shadow. Gives a range its planes instead of a flat cut-out.
 */
export const faces = (line: Line, shade: string, lean = 0.55, alpha = 1) => {
  let d = ''
  for (let i = 3; i < 237; i += 3) {
    const [, prev] = line[i - 3]
    const [x, y] = line[i]
    const [, after] = line[i + 3]
    if (y >= prev || y > after) continue // a summit: higher than both neighbours
    let j = i
    while (j > 3 && line[j - 3][1] >= line[j][1]) j -= 3 // follow the shaded slope down to its valley
    const drop = H - y
    d += `M${x.toFixed(1)} ${y.toFixed(1)}${trace(line.slice(j, i + 1).reverse())}L${(line[j][0] - drop * lean).toFixed(1)} ${H}L${(x - drop * lean * 0.45).toFixed(1)} ${H}Z`
  }
  return `<path d="${d}" fill="${shade}" opacity="${alpha}" clip-path="${clip(`<path d="${outline(line)}"/>`)}"/>`
}

/** Snow above a snow line: bright on slopes that face the light, blue on those that face away. */
export const snow = (seed: number, line: Line, snowLine: number, light: string, shade: string) => {
  const next = rng(seed)
  const hem = line.map(([x, y]) => [x, y + Math.max(0, snowLine - y) * (0.3 + next() * 0.65)] as [number, number])
  let [lit, dim] = ['', '']
  for (let i = 0; i < 240; i++) {
    const [[x0, y0], [x1, y1]] = [line[i], line[i + 1]]
    if (Math.min(y0, y1) > snowLine) continue
    const patch = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${x1.toFixed(1)} ${hem[i + 1][1].toFixed(1)}L${x0.toFixed(1)} ${hem[i][1].toFixed(1)}Z`
    if (y1 > y0) lit += patch
    else dim += patch
  }
  return `<path d="${dim}" fill="${shade}"/><path d="${lit}" fill="${light}"/>`
}

/** A stand of pines along a skyline. */
export const pines = (seed: number, line: Line, size: number, paint: string, from = 0, to = W) => {
  const next = rng(seed)
  let d = ''
  for (let x = from; x < to; x += size * (0.28 + next() * 0.3)) {
    const [tall, foot] = [size * (0.6 + next() * 0.7), heightAt(line, x) + 4]
    for (let tier = 0; tier < 4; tier++) {
      const [top, bottom, half] = [foot - tall * (1 - tier * 0.2), foot - tall * (0.62 - tier * 0.2), tall * (0.09 + tier * 0.055)]
      d += `M${x.toFixed(1)} ${top.toFixed(1)}L${(x - half).toFixed(1)} ${bottom.toFixed(1)}L${(x + half).toFixed(1)} ${bottom.toFixed(1)}Z`
    }
  }
  return `<path d="${d}" fill="${paint}"/>`
}

/** Still water below a horizon, with everything given in `above` mirrored faintly into it. */
export const water = (horizon: number, paint: string, above: string, mirror = 0.35) =>
  `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${paint}"/>` +
  `<g clip-path="${clip(`<rect y="${horizon}" width="${W}" height="${H - horizon}"/>`)}"><g transform="translate(0 ${horizon * 2}) scale(1 -1)" opacity="${mirror}" filter="${blur(1.5, 7)}">${above}</g></g>`

/** Light scattered on water under the sun or moon: short strokes that narrow towards the horizon. */
export const glitter = (seed: number, cx: number, horizon: number, colour: string, width = 150) => {
  const next = rng(seed)
  return Array.from({ length: 46 }, () => {
    const depth = next() ** 1.4
    const [y, half] = [horizon + 6 + depth * (H - horizon - 20), (0.12 + depth) * width * (0.3 + next() * 0.7)]
    const x = cx + (next() - 0.5) * (0.3 + depth) * width * 1.6
    return `<rect x="${(x - half / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${half.toFixed(1)}" height="${(1 + depth * 2).toFixed(1)}" rx="1.5" fill="${colour}" opacity="${(0.25 + next() * 0.6).toFixed(2)}"/>`
  }).join('')
}

/** Birds far off: a few shallow strokes. */
export const birds = (seed: number, x: number, y: number, colour: string) => {
  const next = rng(seed)
  return Array.from({ length: 6 }, () => {
    const [bx, by, s] = [x + next() * 190, y + next() * 70, 5 + next() * 6]
    return `<path d="M${(bx - s).toFixed(0)} ${by.toFixed(0)}q${(s / 2).toFixed(1)} ${(-s / 2).toFixed(1)} ${s.toFixed(1)} 0q${(s / 2).toFixed(1)} ${(-s / 2).toFixed(1)} ${s.toFixed(1)} 0" fill="none" stroke="${colour}" stroke-width="1.6" stroke-linecap="round"/>`
  }).join('')
}

/** A lone walker with a pack and a pole, standing on a skyline and looking up. */
export const walker = (line: Line, x: number, colour: string, size = 1) => {
  const y = heightAt(line, x) + 2
  return (
    `<g transform="translate(${x} ${y.toFixed(1)}) scale(${size})" fill="${colour}" stroke="${colour}" stroke-linecap="round">` +
    `<circle cx="1" cy="-33" r="3.6"/><path d="M-3 -29h7l2 14h-9z"/><path d="M-7 -28h5v11h-5z"/>` +
    `<path d="M-1 -15l-3 15M3 -15l3 15" stroke-width="3" fill="none"/><path d="M5 -26l7 9M12 -17v17" stroke-width="1.4" fill="none"/>` +
    `</g>`
  )
}

/** The last touch: darker corners, to hold the eye in the middle. */
export const finish = (corners = 0.4) => fill(radial([0.55, '#000', 0], [1, '#000', corners]))
