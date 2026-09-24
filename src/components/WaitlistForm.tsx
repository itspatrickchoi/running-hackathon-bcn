import { useState } from 'react'
import type { WaitlistSource } from '../../shared/domain'
import { joinWaitlist } from '../lib/api'

const JOINED_KEY = 'rmd:waitlist'

function hasJoined() {
  try {
    return localStorage.getItem(JOINED_KEY) === 'joined'
  } catch {
    return false
  }
}

function markJoined() {
  try {
    localStorage.setItem(JOINED_KEY, 'joined')
  } catch {
    // Private mode or quota — the form will just show again next time.
  }
}

/**
 * Email + name signup, used to gauge interest before the app has real
 * accounts. No confirmation email is sent — it just records the signal.
 */
export function WaitlistForm({
  source,
  title = 'Get notified as we build this out',
  compact = false,
}: {
  source: WaitlistSource
  title?: string
  compact?: boolean
}) {
  const [joined, setJoined] = useState(hasJoined)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (joined) {
    return (
      <p className={compact ? 'hint waitlist-joined' : 'card waitlist-card waitlist-joined'}>
        You&rsquo;re on the list — we&rsquo;ll let you know what&rsquo;s new. ✓
      </p>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await joinWaitlist(name, email, source)
      markJoined()
      setJoined(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the list.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={compact ? 'waitlist-form compact' : 'card waitlist-card'} onSubmit={submit}>
      {!compact && <p className="field-label">{title}</p>}
      <div className="waitlist-row">
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={compact ? title : 'Name'}
          maxLength={60}
          aria-label="Name"
        />
        <input
          className="text-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          maxLength={120}
          aria-label="Email"
        />
        <button className={compact ? 'pill-button ghost' : 'pill-button'} type="submit" disabled={submitting || !email.trim() || !name.trim()}>
          {submitting ? 'Joining…' : 'Notify me'}
        </button>
      </div>
      {error && <p className="hint waitlist-error">{error}</p>}
    </form>
  )
}
