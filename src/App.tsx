import { useEffect, useState } from 'react'
import type { CategoryId, PersonalityId, RoastSession, Verdict } from '../shared/domain'
import { DEFAULT_ASSIGNMENTS } from '../shared/domain'
import { fetchConfig, generateVerdicts, getSession } from './lib/api'
import { PersonalityPicker } from './components/PersonalityPicker'
import { RecordStage } from './components/RecordStage'
import { ResultsView } from './components/ResultsView'

type Stage = 'setup' | 'record' | 'confirm' | 'generating' | 'results'

function SharedResultsPage({ id }: { id: string }) {
  const [session, setSession] = useState<RoastSession | null | 'loading' | 'missing'>('loading')
  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false)

  useEffect(() => {
    fetchConfig().then((c) => setElevenLabsConfigured(c.elevenLabsConfigured))
    getSession(id).then((s) => setSession(s ?? 'missing'))
  }, [id])

  return (
    <div className="app-shell">
      <h1 className="marquee">
        Today&rsquo;s <em>Verdict</em>
      </h1>
      {session === 'loading' && <p className="hint">Loading this day&rsquo;s verdict…</p>}
      {session === 'missing' && <p className="error-banner">This link doesn&rsquo;t point to a saved verdict anymore.</p>}
      {session && session !== 'loading' && session !== 'missing' && (
        <ResultsView session={session} elevenLabsConfigured={elevenLabsConfigured} readOnly />
      )}
    </div>
  )
}

function RoastFlow() {
  const [stage, setStage] = useState<Stage>('setup')
  const [assignments, setAssignments] = useState<Record<CategoryId, PersonalityId>>(DEFAULT_ASSIGNMENTS)
  const [transcript, setTranscript] = useState('')
  const [verdicts, setVerdicts] = useState<Verdict[]>([])
  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig().then((c) => setElevenLabsConfigured(c.elevenLabsConfigured))
  }, [])

  async function handleGenerate() {
    setStage('generating')
    setError(null)
    try {
      const result = await generateVerdicts(transcript, assignments)
      setVerdicts(result)
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong generating your verdict.')
      setStage('confirm')
    }
  }

  function startOver() {
    setTranscript('')
    setVerdicts([])
    setError(null)
    setStage('setup')
  }

  return (
    <div className="app-shell">
      <div>
        <h1 className="marquee">
          Roast My <em>Day</em>
        </h1>
        <p className="subhead">
          Talk through your day out loud. Get judged for it, in exactly the tone you asked for.
        </p>
      </div>

      {stage === 'setup' && (
        <>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Who&rsquo;s judging which part of your day?</h3>
            <PersonalityPicker assignments={assignments} onChange={setAssignments} />
          </div>
          {!elevenLabsConfigured && (
            <p className="hint">
              No ElevenLabs voice key is configured yet, so transcription and playback use your browser&rsquo;s
              built-in voice tools for now. Add an ElevenLabs API key to switch on real transcription and personality voices.
            </p>
          )}
          <button className="pill-button" style={{ alignSelf: 'flex-start' }} onClick={() => setStage('record')}>
            Start recording
          </button>
        </>
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.1rem' }}>Here&rsquo;s what came through</h3>
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
        <div className="card">
          <p className="hint">Sorting your day into categories and drafting each verdict…</p>
        </div>
      )}

      {stage === 'results' && (
        <ResultsView
          session={{ createdAt: new Date().toISOString(), transcript, verdicts }}
          elevenLabsConfigured={elevenLabsConfigured}
          onStartOver={startOver}
        />
      )}
    </div>
  )
}

export function App() {
  const path = window.location.pathname
  const resultsMatch = path.match(/^\/results\/([\w-]+)/)

  if (resultsMatch) {
    return <SharedResultsPage id={resultsMatch[1]} />
  }

  return <RoastFlow />
}
