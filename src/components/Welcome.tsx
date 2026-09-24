import { useState } from 'react'
import type { UserProfile } from '../lib/store'
import { levelFor } from '../lib/progress'

export function Welcome({
  users,
  onSignIn,
}: {
  users: UserProfile[]
  onSignIn: (name: string) => void
}) {
  const [name, setName] = useState('')

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">Issue No. 1 · Daily Verdicts</p>
        <h1 className="marquee">
          Who&rsquo;s getting <em>roasted</em> today?
        </h1>
        <p className="subhead">Talk through your day out loud. Three judges who actually know you hand down the verdict.</p>
      </div>

      <form
        className="card tilt-left"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onSignIn(name)
        }}
      >
        <label className="field-label" htmlFor="name">
          Your name
        </label>
        <div className="name-row">
          <input
            id="name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Patrick"
            autoComplete="given-name"
            maxLength={40}
          />
          <button className="pill-button" type="submit" disabled={!name.trim()}>
            Let&rsquo;s go
          </button>
        </div>
      </form>

      {users.length > 0 && (
        <div>
          <p className="field-label">Back again? Pick yourself</p>
          <div className="profile-chips">
            {users.map((u) => (
              <button key={u.id} className="profile-chip" onClick={() => onSignIn(u.name)}>
                <span className="profile-chip-name">{u.name}</span>
                <span className="profile-chip-meta">
                  Lv {levelFor(u.xp).level} · {levelFor(u.xp).title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
