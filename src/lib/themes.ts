import type { StickerArt } from '../components/stickers/art'
import type { ThemeId } from './store'

export const THEMES: { id: ThemeId; label: string; vibe: string; art: StickerArt }[] = [
  { id: 'clean', label: 'Clean Edit', vibe: 'Off-white, serif, magazine calm', art: 'star' },
  { id: 'bubblegum', label: 'Bubblegum', vibe: 'Pink, lilac, chrome hearts', art: 'heart' },
  { id: 'arcade', label: 'Arcade', vibe: 'Electric blue, lime, loud', art: 'lightning' },
  { id: 'terminal', label: 'Terminal', vibe: 'Phosphor green, mono, nerd', art: 'floppy' },
]
