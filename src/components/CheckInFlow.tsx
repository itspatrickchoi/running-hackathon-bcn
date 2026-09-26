import { useState } from 'react'
import { generateVerdicts } from '../lib/api'
import { openMissions, recordCheckIn, type XpBreakdown } from '../lib/progress'
import { silentBackup, type CheckIn, type UserProfile } from '../lib/store'
import { RecordStage } from './RecordStage'
import { ResultsView } from './ResultsView'

type Stage = 'record' | 'confirm' | 'generating' | 'results'

export function CheckInFlow({
  profile,
  elevenLabsConfigured,
  onCommit,
  onExit,
}: {
  profile: UserProfile
  elevenLabsConfigured: boolean
  onCommit: (next: UserProfile) => void
  onExit: () => void
}) {
  const [stage, setStage] = useState<Stage>('record')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ checkIn: CheckIn; xp: XpBreakdown | null; isFirstEver: boolean } | null>(null)

  async function handleGenerate() {
    setStage('generating')
    setError(null)
    try {
      const { verdicts, missionResults } = await generateVerdicts(transcript, profile.assignments, {
        profile: { name: profile.name, dossier: profile.dossier || undefined },
        previousMissions: openMissions(profile),
      })
      const isFirstEver = profile.checkIns.length === 0
      const outcome = recordCheckIn(profile, transcript, verdicts, missionResults)
      onCommit(outcome.profile)
      setResult({ checkIn: outcome.checkIn, xp: outcome.xp, isFirstEver })
      setStage('results')
      silentBackup(outcome.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong generating your verdict.')
      setStage('confirm')
    }
  }

  return (
    <div className="stack-lg">
      {stage !== 'results' && (
        <div>
          <button className="link-button" onClick={onExit}>
            ← Back home
          </button>
          <h1 className="marquee">
            Talk me through <em>today</em>
          </h1>
        </div>
      )}

      {stage === 'record' && (
        <RecordStage
          elevenLabsConfigured={elevenLabsConfigured}
          onComplete={(t) => {
            setTranscript(t)
            setStage('confirm')
          }}
        />
      )}

      {stage === 'confirm' && (
        <div className="card stack">
          <h3 className="card-title">Here&rsquo;s what came through</h3>
          <textarea
            className="transcript-box"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Nothing came through — type or paste a recap of your day instead."
          />
          {error && <div className="error-banner">{error}</div>}
          <div className="footer-row">
            <button className="pill-button" onClick={handleGenerate} disabled={transcript.trim().length < 8}>
              Get my verdict
            </button>
            <button className="pill-button ghost" onClick={() => setStage('record')}>
              Re-record
            </button>
          </div>
        </div>
      )}

      {stage === 'generating' && (
        <div className="card generating-card">
          <div className="loader-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="hint">Your judges are deliberating…</p>
        </div>
      )}

      {stage === 'results' && result && (
        <ResultsView
          session={{ createdAt: result.checkIn.createdAt, transcript, verdicts: result.checkIn.verdicts }}
          elevenLabsConfigured={elevenLabsConfigured}
          missionResults={result.checkIn.missionResults}
          rewards={{ xp: result.xp, newStickers: result.checkIn.newStickers, replay: result.checkIn.replay }}
          showWaitlist={result.isFirstEver}
          onStartOver={onExit}
          startOverLabel="Back home"
        />
      )}
    </div>
  )
}
