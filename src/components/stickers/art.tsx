// Hand-drawn-ish Y2K sticker set. Every sticker gets a white die-cut edge and a
// thick ink outline; fills use --s1/--s2/--s3 so each theme recolors the set.
import type { CSSProperties, ReactNode } from 'react'

export type StickerArt =
  | 'star'
  | 'sparkle'
  | 'smiley'
  | 'heart'
  | 'flame'
  | 'lightning'
  | 'cd'
  | 'butterfly'
  | 'pixelheart'
  | 'burst'
  | 'floppy'
  | 'crown'

const INK = 'var(--sticker-ink)'
const S1 = 'var(--s1)'
const S2 = 'var(--s2)'
const S3 = 'var(--s3)'

function starPoints(cx: number, cy: number, spikes: number, outer: number, inner: number) {
  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / spikes - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const ART: Record<StickerArt, ReactNode> = {
  star: <polygon points={starPoints(50, 52, 5, 44, 20)} fill={S1} />,
  sparkle: (
    <>
      <path d="M50 4 C54 36 64 46 96 50 C64 54 54 64 50 96 C46 64 36 54 4 50 C36 46 46 36 50 4Z" fill={S2} />
      <path d="M80 10 C81 18 84 21 92 22 C84 23 81 26 80 34 C79 26 76 23 68 22 C76 21 79 18 80 10Z" fill={S1} />
    </>
  ),
  smiley: (
    <>
      <circle cx="50" cy="50" r="42" fill={S3} />
      <ellipse cx="36" cy="40" rx="5" ry="9" fill={INK} stroke="none" />
      <ellipse cx="64" cy="40" rx="5" ry="9" fill={INK} stroke="none" />
      <path d="M28 58 Q50 82 72 58" fill="none" />
    </>
  ),
  heart: (
    <>
      <path d="M50 88 C18 66 6 48 10 32 C14 16 36 10 50 28 C64 10 86 16 90 32 C94 48 82 66 50 88Z" fill={S1} />
      <path d="M26 30 C30 24 38 22 42 26" fill="none" stroke="#fff" strokeWidth="5" />
    </>
  ),
  flame: (
    <>
      <path d="M50 94 C24 94 14 74 20 56 C24 44 34 40 34 24 C46 30 50 40 50 48 C54 40 58 30 56 8 C76 24 88 44 84 64 C80 84 68 94 50 94Z" fill={S1} />
      <path d="M50 88 C38 88 34 78 38 70 C40 64 46 62 46 54 C54 60 62 68 60 78 C58 84 54 88 50 88Z" fill={S3} />
    </>
  ),
  lightning: <polygon points="58,4 18,56 46,56 36,96 82,40 54,40" fill={S3} />,
  cd: (
    <>
      <circle cx="50" cy="50" r="44" fill={S2} />
      <path d="M50 6 A44 44 0 0 1 94 50 L62 50 A12 12 0 0 0 50 38Z" fill={S1} stroke="none" />
      <circle cx="50" cy="50" r="12" fill="#fff" />
      <circle cx="50" cy="50" r="4" fill={INK} stroke="none" />
    </>
  ),
  butterfly: (
    <>
      <path d="M48 50 C30 18 6 16 8 36 C10 52 30 56 48 52Z" fill={S1} />
      <path d="M52 50 C70 18 94 16 92 36 C90 52 70 56 52 52Z" fill={S1} />
      <path d="M48 54 C28 60 18 80 30 86 C40 90 48 72 48 58Z" fill={S2} />
      <path d="M52 54 C72 60 82 80 70 86 C60 90 52 72 52 58Z" fill={S2} />
      <rect x="46" y="36" width="8" height="46" rx="4" fill={INK} stroke="none" />
    </>
  ),
  pixelheart: (
    <path
      d="M20 20h20v10h20v-10h20v10h10v30h-10v10h-10v10h-10v10h-10v-10h-10v-10h-10v-10h-10v-30h10z"
      fill={S1}
    />
  ),
  burst: (
    <>
      <polygon points={starPoints(50, 50, 14, 46, 34)} fill={S3} />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="24"
        fill={INK}
        stroke="none"
      >
        NEW!
      </text>
    </>
  ),
  floppy: (
    <>
      <path d="M12 12 H76 L90 26 V88 H12Z" fill={S2} />
      <rect x="28" y="12" width="40" height="26" fill="#fff" />
      <rect x="54" y="16" width="8" height="18" fill={INK} stroke="none" />
      <rect x="24" y="54" width="54" height="34" fill="#fff" />
      <path d="M32 66 H70 M32 76 H60" fill="none" strokeWidth="4" />
    </>
  ),
  crown: (
    <>
      <path d="M10 76 L16 28 L34 50 L50 16 L66 50 L84 28 L90 76Z" fill={S3} />
      <rect x="10" y="76" width="80" height="12" fill={S1} />
      <circle cx="50" cy="62" r="6" fill={S2} />
    </>
  ),
}

export function Sticker({
  art,
  size = 72,
  rotate = 0,
  className,
  style,
  title,
}: {
  art: StickerArt
  size?: number
  rotate?: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <svg
      className={`sticker ${className ?? ''}`}
      viewBox="-6 -6 112 112"
      width={size}
      height={size}
      style={{ ...style, ['--rot' as string]: `${rotate}deg` }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* White die-cut edge underneath, then the inked art on top. */}
      <g stroke="#fff" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" fill="#fff" className="sticker-edge">
        {ART[art]}
      </g>
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {ART[art]}
      </g>
    </svg>
  )
}
