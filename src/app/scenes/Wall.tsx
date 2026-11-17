import { useEffect, useState } from 'react'
import { pictureOf, type Place } from './places'

/**
 * The wall behind the glass: the chosen place at the chosen time of day, as one flat picture.
 * A new picture is decoded first, then poured in over the old one, which is dropped once covered —
 * so the wall is never blank and never repaints while the interface in front of it moves.
 */
export function Wall({ place, time }: { place: Place; time: 'day' | 'night' }) {
  const [layers, setLayers] = useState<string[]>([])

  useEffect(() => {
    let wanted = true
    const url = pictureOf(place, time)
    const image = new Image()
    image.src = url
    const show = () => wanted && setLayers((shown) => (shown.at(-1) === url ? shown : [...shown.slice(-1), url]))
    image.decode().then(show, show)
    return () => {
      wanted = false
    }
  }, [place, time])

  return (
    <div className="wall" aria-hidden>
      {layers.map((url) => (
        <div key={url} className="wall-layer" style={{ backgroundImage: `url(${url})` }} onAnimationEnd={() => setLayers((shown) => shown.slice(-1))} />
      ))}
    </div>
  )
}
