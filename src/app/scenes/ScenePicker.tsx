import { build } from '../../ui/build'
import { SceneIcon } from '../../ui/icons'
import { Menu } from '../../ui/Menu'
import { pictureOf, PLACES, type Place } from './places'

interface Props {
  place: Place
  time: 'day' | 'night'
  onChoose: (id: string) => void
}

/** Pick the place behind the glass. Each tile is the real picture, at the current time of day. */
export function ScenePicker({ place, time, onChoose }: Props) {
  return (
    <Menu label="Background" icon={<SceneIcon />} align="end" {...build('stamp', 14)}>
      <div className="scene-grid">
        {PLACES.map((p) => (
          <button
            key={p.id}
            className="scene-tile"
            role="menuitemradio"
            aria-checked={p.id === place.id}
            style={{ backgroundImage: `url(${pictureOf(p, time)})` }}
            onClick={() => onChoose(p.id)}
          >
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </Menu>
  )
}
