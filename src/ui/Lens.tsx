/**
 * Light-bending glass.
 *
 * A pane normally just frosts what is behind it. Where the browser can run an SVG filter on
 * that backdrop (Chromium only), the pane becomes a lens instead: its rim shows what is behind
 * it clear but bent inwards, the way a thick glass edge does, and only the middle is frosted
 * and tinted.
 *
 * Each filter is built from two small images that size themselves to the pane:
 *   - a displacement map — neutral in the middle, pushing inwards along each edge
 *   - a rim mask — white along the edge, black in the middle
 * CSS switches panes over to these filters under [data-lens] (see styles/base.css). A lens
 * costs two to three times a blur for every frame its backdrop changes, so the wall behind it
 * holds still once built.
 */
const supported = 'userAgentData' in navigator
if (supported) document.documentElement.dataset.lens = ''

/** How far the rim bends what is behind it, and how much the middle is frosted (px). */
const BEND = 28
const FROST = 18

const image = (svg: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>${svg}</svg>`)}`

/** A ramp in one colour channel: red shifts the backdrop sideways, green shifts it up and down. */
const ramp = (id: string, channel: 'r' | 'g', stops: [number, number, number]) => {
  const colour = (v: number) => (channel === 'r' ? `rgb(${v},0,0)` : `rgb(0,${v},0)`)
  const direction = channel === 'g' ? "x2='0' y2='1'" : ''
  const [from, mid, to] = stops.map(colour)
  return `<linearGradient id='${id}' ${direction}><stop offset='0' stop-color='${from}'/><stop offset='.45' stop-color='${mid}'/><stop offset='1' stop-color='${to}'/></linearGradient>`
}

/** 128 means "leave it"; brighter pulls from the right or below, darker from the left or above. */
const displacement = (rim: number) =>
  image(
    `<defs>${ramp('l', 'r', [255, 160, 128])}${ramp('r', 'r', [128, 96, 0])}${ramp('t', 'g', [255, 160, 128])}${ramp('b', 'g', [128, 96, 0])}</defs>` +
      `<rect width='100%' height='100%' fill='rgb(128,0,0)'/>` +
      `<rect width='${rim}' height='100%' fill='url(#l)'/>` +
      `<svg x='100%' overflow='visible'><rect x='-${rim}' width='${rim}' height='100%' fill='url(#r)'/></svg>` +
      `<g style='mix-blend-mode:screen'>` +
      `<rect width='100%' height='100%' fill='rgb(0,128,0)'/>` +
      `<rect width='100%' height='${rim}' fill='url(#t)'/>` +
      `<svg y='100%' overflow='visible'><rect y='-${rim}' width='100%' height='${rim}' fill='url(#b)'/></svg>` +
      `</g>`,
  )

const rimMask = (rim: number, corner: number) =>
  image(
    `<rect width='100%' height='100%' fill='#fff'/>` +
      `<rect x='${rim}' y='${rim}' rx='${corner}' style='width:calc(100% - ${rim * 2}px);height:calc(100% - ${rim * 2}px)' fill='#000'/>`,
  )

interface LensProps {
  id: string
  /** Width of the clear, bending rim. */
  rim: number
  /** Corner radius of the frosted middle. */
  corner: number
  /** The middle's tint — a token, so it follows the theme. */
  tint: string
}

function LensFilter({ id, rim, corner, tint }: LensProps) {
  return (
    <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
      <feImage href={displacement(rim)} preserveAspectRatio="none" result="map" />
      <feImage href={rimMask(rim, corner)} preserveAspectRatio="none" />
      <feColorMatrix type="luminanceToAlpha" />
      <feGaussianBlur stdDeviation="2" result="rim" />

      {/* The middle: frosted, then tinted. */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={FROST} result="frost" />
      <feFlood style={{ floodColor: tint }} result="tint" />
      <feMerge result="pane">
        <feMergeNode in="frost" />
        <feMergeNode in="tint" />
      </feMerge>
      <feComposite in="pane" in2="rim" operator="out" result="middle" />

      {/* The rim: the backdrop itself, bent. */}
      <feDisplacementMap in="SourceGraphic" in2="map" scale={BEND} xChannelSelector="R" yChannelSelector="G" result="bent" />
      <feMerge>
        <feMergeNode in="bent" />
        <feMergeNode in="middle" />
      </feMerge>
    </filter>
  )
}

/** Rendered once. One lens for panes, a slimmer one for shallow capsules, a thicker-tinted one for boxes. */
export function Lens() {
  if (!supported) return null
  return (
    <svg className="lens-defs" aria-hidden>
      <LensFilter id="lens" rim={14} corner={12} tint="var(--glass)" />
      <LensFilter id="lens-bar" rim={9} corner={9999} tint="var(--glass)" />
      <LensFilter id="lens-box" rim={14} corner={12} tint="var(--glass-strong)" />
    </svg>
  )
}
