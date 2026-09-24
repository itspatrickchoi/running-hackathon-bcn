import { THEMES } from '../lib/themes'
import type { ThemeId } from '../lib/store'
import { Sticker } from './stickers/art'

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return (
    <div className="theme-grid" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          className={`theme-tile ${value === t.id ? 'selected' : ''}`}
          data-theme-preview={t.id}
          onClick={() => onChange(t.id)}
        >
          <Sticker art={t.art} size={44} rotate={-10} className="theme-tile-sticker" />
          <span className="theme-tile-label">{t.label}</span>
          <span className="theme-tile-vibe">{t.vibe}</span>
        </button>
      ))}
    </div>
  )
}
