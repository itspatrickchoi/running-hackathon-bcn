// Decorative stickers slapped around the page margins. Positions are fixed per
// "spot" and hidden on narrow screens where they would cover content.
import type { ThemeId } from '../../lib/store'
import { Sticker, type StickerArt } from './art'

const THEME_SETS: Record<ThemeId, StickerArt[]> = {
  clean: ['star', 'sparkle', 'smiley', 'burst'],
  bubblegum: ['heart', 'butterfly', 'sparkle', 'star'],
  arcade: ['lightning', 'flame', 'star', 'burst'],
  terminal: ['pixelheart', 'floppy', 'cd', 'lightning'],
}

// Offsets are relative to the 720px column; wide screens only, so they sit in the margins.
const SPOTS = [
  { top: 96, right: -84, rotate: 14, size: 76 },
  { top: 340, left: -80, rotate: -12, size: 64 },
  { bottom: 140, right: -76, rotate: 8, size: 64 },
  { top: 620, left: -70, rotate: -18, size: 52 },
]

export function StickerLayer({ theme, count = 3, seed = 0 }: { theme: ThemeId; count?: number; seed?: number }) {
  const set = THEME_SETS[theme]
  return (
    <div className="sticker-layer" aria-hidden="true">
      {SPOTS.slice(0, count).map((spot, i) => {
        const { rotate, size, ...pos } = spot
        return (
          <Sticker
            key={i}
            art={set[(i + seed) % set.length]}
            size={size}
            rotate={rotate}
            className="sticker-deco"
            style={{ ...pos, animationDelay: `${i * 120}ms` }}
          />
        )
      })}
    </div>
  )
}
