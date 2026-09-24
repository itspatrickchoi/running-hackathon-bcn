import { useRef, useState } from 'react'
import { transcribeAudio } from '../lib/api'
import { startLiveRecognition, isLiveRecognitionSupported, type LiveRecognizer } from '../lib/speech'
import { SAMPLE_TRANSCRIPTS } from '../lib/sampleTranscripts'

type Stage = 'idle' | 'recording' | 'transcribing'

export function RecordStage({
  elevenLabsConfigured,
  onComplete,
}: {
  elevenLabsConfigured: boolean
  onComplete: (transcript: string) => void
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [liveText, setLiveText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognizerRef = useRef<LiveRecognizer | null>(null)

  const useLiveRecognition = !elevenLabsConfigured && isLiveRecognitionSupported()

  async function startRecording() {
    setError(null)
    setLiveText('')

    if (useLiveRecognition) {
      setStage('recording')
      recognizerRef.current = startLiveRecognition({
        onInterim: setLiveText,
        onFinal: () => {},
        onEnd: () => {},
        onError: (message) => setError(message),
      })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setStage('transcribing')
        try {
          const transcript = elevenLabsConfigured
            ? await transcribeAudio(blob)
            : ''
          onComplete(transcript)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed.')
          setStage('idle')
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setStage('recording')
    } catch {
      setError('Microphone access was denied or is unavailable. Try a sample recap instead.')
    }
  }

  function stopRecording() {
    if (useLiveRecognition) {
      recognizerRef.current?.stop()
      setStage('idle')
      onComplete(liveText)
      return
    }
    mediaRecorderRef.current?.stop()
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
      <button
        className={`record-button ${stage === 'recording' ? 'live' : ''}`}
        onClick={stage === 'recording' ? stopRecording : startRecording}
        disabled={stage === 'transcribing'}
      >
        {stage === 'idle' && 'Tap to talk'}
        {stage === 'recording' && 'Stop'}
        {stage === 'transcribing' && 'Working...'}
      </button>

      <p className="hint">
        {stage === 'idle' && 'One to three minutes. Talk through your day, out loud.'}
        {stage === 'recording' && useLiveRecognition && 'Listening live — this browser transcribes as you speak.'}
        {stage === 'recording' && !useLiveRecognition && 'Recording... tap stop when you\'re done.'}
        {stage === 'transcribing' && 'Sending your recording off for transcription.'}
      </p>

      {stage === 'recording' && useLiveRecognition && liveText && (
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-muted)', maxWidth: '52ch' }}>{liveText}</p>
      )}

      {error && <div className="error-banner">{error}</div>}

      {stage === 'idle' && (
        <div>
          <p className="hint" style={{ marginBottom: 8 }}>No mic handy, or want a safe demo run?</p>
          <div className="footer-row" style={{ justifyContent: 'center' }}>
            {SAMPLE_TRANSCRIPTS.map((sample) => (
              <button
                key={sample.label}
                className="pill-button ghost"
                onClick={() => onComplete(sample.text)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
