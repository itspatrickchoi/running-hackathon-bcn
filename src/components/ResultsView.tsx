import { useState } from 'react'
import type { RoastSession } from '../../shared/domain'
import { VerdictCard } from './VerdictCard'
import { saveSession } from '../lib/api'

export function ResultsView({
  session,
  elevenLabsConfigured,
  onStartOver,
  readOnly = false,
}: {
  session: RoastSession
  elevenLabsConfigured: boolean
  onStartOver?: () => void
  readOnly?: boolean
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  async function handleShare() {
    setSharing(true)
    setShareError(null)
    try {
      const id = await saveSession({ transcript: session.transcript, verdicts: session.verdicts })
      const url = `${window.location.origin}/results/${id}`
      setShareUrl(url)
      await navigator.clipboard.writeText(url).catch(() => {})
    } catch {
      setShareError('Could not create a share link right now.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: '2rem' }}>Today&rsquo;s Verdict</h2>
        <p className="hint">Based on what you actually said, category by category.</p>
      </div>

      {session.verdicts.length === 0 && (
        <div className="card">
          <p>Nothing clearly landed in any category — try recording again with a bit more detail.</p>
        </div>
      )}

      {session.verdicts.map((v, i) => (
        <VerdictCard key={`${v.category}-${i}`} verdict={v} elevenLabsConfigured={elevenLabsConfigured} />
      ))}

      {!readOnly && (
        <div className="footer-row">
          <button className="pill-button" onClick={handleShare} disabled={sharing}>
            {sharing ? 'Creating link…' : 'Copy share link'}
          </button>
          {onStartOver && (
            <button className="pill-button ghost" onClick={onStartOver}>
              Start over
            </button>
          )}
        </div>
      )}

      {shareUrl && (
        <div className="share-link">
          Link copied — <a href={shareUrl}>{shareUrl}</a>
        </div>
      )}
      {shareError && <div className="error-banner">{shareError}</div>}

      {readOnly && (
        <div className="footer-row">
          <a className="pill-button" href="/">
            Roast your own day
          </a>
        </div>
      )}
    </div>
  )
}
