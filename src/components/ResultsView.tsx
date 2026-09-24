import { useState } from 'react'
import { CATEGORIES, type MissionResult, type RoastSession } from '../../shared/domain'
import type { XpBreakdown } from '../lib/progress'
import { RewardsPanel } from './RewardsPanel'
import { VerdictCard } from './VerdictCard'
import { WaitlistForm } from './WaitlistForm'
import { saveSession } from '../lib/api'

export function ResultsView({
  session,
  elevenLabsConfigured,
  onStartOver,
  startOverLabel = 'Start over',
  readOnly = false,
  missionResults = [],
  rewards,
  showWaitlist = false,
}: {
  session: RoastSession
  elevenLabsConfigured: boolean
  onStartOver?: () => void
  startOverLabel?: string
  readOnly?: boolean
  missionResults?: MissionResult[]
  rewards?: { xp: XpBreakdown | null; newStickers: string[]; replay: boolean }
  /** Shown once, right after someone's very first check-in. */
  showWaitlist?: boolean
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
    <div className="stack">
      <div>
        <p className="kicker">The verdict is in</p>
        <h2 className="section-title">
          Today&rsquo;s <em>Verdict</em>
        </h2>
        <p className="hint">Based on what you actually said, category by category.</p>
      </div>

      {rewards && <RewardsPanel xp={rewards.xp} newStickers={rewards.newStickers} replay={rewards.replay} />}

      {showWaitlist && (
        <WaitlistForm source="post-checkin" title="Like this? Get notified as we build this out" />
      )}

      {missionResults.length > 0 && (
        <div className="card missions-card">
          <p className="field-label">Yesterday&rsquo;s missions</p>
          <ul className="mission-list">
            {missionResults.map((m) => (
              <li key={m.category} className={m.completed ? 'done' : 'missed'}>
                <span className="mission-cat">
                  {m.completed ? '✓' : '✗'} {CATEGORIES.find((c) => c.id === m.category)?.label}
                </span>
                <span>{m.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.verdicts.length === 0 && (
        <div className="card">
          <p>Nothing clearly landed in any category — try recording again with a bit more detail.</p>
        </div>
      )}

      {session.verdicts.map((v, i) => (
        <VerdictCard key={`${v.category}-${i}`} verdict={v} elevenLabsConfigured={elevenLabsConfigured} index={i} />
      ))}

      {!readOnly && (
        <div className="footer-row">
          <button className="pill-button" onClick={handleShare} disabled={sharing}>
            {sharing ? 'Creating link…' : 'Copy share link'}
          </button>
          {onStartOver && (
            <button className="pill-button ghost" onClick={onStartOver}>
              {startOverLabel}
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
            Get your own hot takes
          </a>
        </div>
      )}
    </div>
  )
}
