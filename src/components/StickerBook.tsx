import { STICKERS } from '../lib/progress'
import type { UserProfile } from '../lib/store'
import { Sticker } from './stickers/art'

export function StickerBook({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  return (
    <div className="stack-lg">
      <div>
        <button className="link-button" onClick={onBack}>
          ← Back home
        </button>
        <h1 className="marquee">
          Sticker <em>Book</em>
        </h1>
        <p className="subhead">
          {profile.stickers.length} of {STICKERS.length} collected. Keep showing up.
        </p>
      </div>

      <div className="sticker-grid">
        {STICKERS.map((s, i) => {
          const have = profile.stickers.includes(s.id)
          return (
            <div key={s.id} className={`sticker-slot ${have ? 'have' : 'locked'}`}>
              <Sticker art={s.art} size={76} rotate={have ? ((i * 37) % 24) - 12 : 0} className={have ? '' : 'locked'} title={have ? s.name : undefined} />
              <span className="sticker-name">{have ? s.name : '???'}</span>
              <span className="hint">{s.hint}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
