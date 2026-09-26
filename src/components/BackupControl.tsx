import { useState } from 'react'
import { backupProfile, type UserProfile } from '../lib/store'

/** Encrypted recovery-code backup, shown in Home's settings drawer. */
export function BackupControl({
  profile,
  onUpdate,
}: {
  profile: UserProfile
  onUpdate: (patch: Partial<UserProfile>) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [justBackedUp, setJustBackedUp] = useState(false)

  async function runBackup() {
    setBusy(true)
    setError(null)
    try {
      const next = await backupProfile(profile)
      if (next.syncCode !== profile.syncCode) onUpdate({ syncCode: next.syncCode })
      setJustBackedUp(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not back up your data right now.')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!profile.syncCode) return
    try {
      await navigator.clipboard.writeText(profile.syncCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked — the code is shown as text either way.
    }
  }

  return (
    <div className="backup-block">
      <p className="field-label">Backup</p>
      <p className="hint">Encrypted on your device before it&rsquo;s sent anywhere. We can&rsquo;t read it, and we can&rsquo;t recover it without your code.</p>

      {profile.syncCode && (
        <div className="code-display">
          <code>{profile.syncCode}</code>
          <button className="pill-button ghost" type="button" onClick={copyCode}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {justBackedUp && !error && <p className="hint">Backed up just now.</p>}

      <div className="footer-row">
        <button className="pill-button ghost" type="button" onClick={runBackup} disabled={busy}>
          {busy ? 'Backing up…' : profile.syncCode ? 'Back up now' : 'Turn on backup'}
        </button>
      </div>
      {!profile.syncCode && (
        <p className="hint">Save the code somewhere safe once it&rsquo;s generated — it&rsquo;s the only way to restore this profile.</p>
      )}
    </div>
  )
}
