import { useState } from 'react'
import type { UserProfile } from '../lib/store'
import { levelFor } from '../lib/progress'
import { restoreFromCode } from '../lib/store'
import { WaitlistForm } from './WaitlistForm'

export function Welcome({
  users,
  onSignIn,
  onRestore,
}: {
  users: UserProfile[]
  onSignIn: (name: string) => void
  onRestore: (profile: UserProfile) => void
}) {
  const [name, setName] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [code, setCode] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setRestoring(true)
    setRestoreError(null)
    try {
      const profile = await restoreFromCode(code)
      onRestore(profile)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Could not restore that backup.')
    } finally {
      setRestoring(false)
    }
  }

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

      <div className="restore-block">
        <button className="link-button" onClick={() => setRestoreOpen((o) => !o)} aria-expanded={restoreOpen}>
          {restoreOpen ? 'Cancel' : 'On a new device? Restore with a recovery code'}
        </button>
        {restoreOpen && (
          <form className="card stack" onSubmit={handleRestore}>
            <p className="field-label">Recovery code</p>
            <input
              className="text-input code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XPQR-7K4M-T9WZ"
              maxLength={20}
              autoCapitalize="characters"
            />
            {restoreError && <div className="error-banner">{restoreError}</div>}
            <div className="footer-row">
              <button className="pill-button" type="submit" disabled={restoring || !code.trim()}>
                {restoring ? 'Restoring…' : 'Restore my data'}
              </button>
            </div>
          </form>
        )}
      </div>

      <WaitlistForm source="welcome" title="Not ready to start? Get notified as we build this out" />
    </div>
  )
}
