import { SAMPLE_TRANSCRIPTS } from '../lib/sampleTranscripts'
import { useVoiceCapture } from './VoiceInput'

export function RecordStage({
  elevenLabsConfigured,
  onComplete,
}: {
  elevenLabsConfigured: boolean
  onComplete: (transcript: string) => void
}) {
  const voice = useVoiceCapture({ elevenLabsConfigured, onTranscript: onComplete })
  const { stage, liveText, error, useLiveRecognition } = voice

  return (
    <div className="card record-card">
      <button className={`record-button ${stage === 'recording' ? 'live' : ''}`} onClick={voice.toggle} disabled={stage === 'transcribing'}>
        {stage === 'idle' && 'Tap to talk'}
        {stage === 'recording' && 'Stop'}
        {stage === 'transcribing' && 'Working...'}
      </button>

      <p className="hint">
        {stage === 'idle' && 'One to three minutes. Talk through your day, out loud.'}
        {stage === 'recording' && useLiveRecognition && 'Listening live — this browser transcribes as you speak.'}
        {stage === 'recording' && !useLiveRecognition && "Recording... tap stop when you're done."}
        {stage === 'transcribing' && 'Sending your recording off for transcription.'}
      </p>

      {stage === 'recording' && useLiveRecognition && liveText && <p className="live-text">{liveText}</p>}

      {error && <div className="error-banner">{error}</div>}

      {stage === 'idle' && (
        <div>
          <p className="hint" style={{ marginBottom: 8 }}>
            No mic handy, or want a safe demo run?
          </p>
          <div className="footer-row" style={{ justifyContent: 'center' }}>
            {SAMPLE_TRANSCRIPTS.map((sample) => (
              <button key={sample.label} className="pill-button ghost" onClick={() => onComplete(sample.text)}>
                {sample.label}
              </button>
            ))}
            <button className="pill-button ghost" onClick={() => onComplete('')}>
              Type it instead
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
