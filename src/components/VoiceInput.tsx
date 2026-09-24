import { useRef, useState } from 'react'
import { transcribeAudio } from '../lib/api'
import { isLiveRecognitionSupported, startLiveRecognition, type LiveRecognizer } from '../lib/speech'

export type VoiceStage = 'idle' | 'recording' | 'transcribing'

/**
 * Mic capture shared by the daily recap and onboarding. Uses ElevenLabs
 * transcription when configured, otherwise the browser's live recognition.
 */
export function useVoiceCapture({
  elevenLabsConfigured,
  onTranscript,
}: {
  elevenLabsConfigured: boolean
  onTranscript: (text: string) => void
}) {
  const [stage, setStage] = useState<VoiceStage>('idle')
  const [liveText, setLiveText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognizerRef = useRef<LiveRecognizer | null>(null)
  const liveTextRef = useRef('')

  const useLiveRecognition = !elevenLabsConfigured && isLiveRecognitionSupported()
  const supported = elevenLabsConfigured || isLiveRecognitionSupported()

  async function start() {
    setError(null)
    setLiveText('')
    liveTextRef.current = ''

    if (useLiveRecognition) {
      setStage('recording')
      recognizerRef.current = startLiveRecognition({
        onInterim: (text) => {
          liveTextRef.current = text
          setLiveText(text)
        },
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
          const transcript = elevenLabsConfigured ? await transcribeAudio(blob) : ''
          setStage('idle')
          onTranscript(transcript)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed.')
          setStage('idle')
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setStage('recording')
    } catch {
      setError('Microphone access was denied or is unavailable. You can type instead.')
    }
  }

  function stop() {
    if (useLiveRecognition) {
      recognizerRef.current?.stop()
      setStage('idle')
      onTranscript(liveTextRef.current)
      return
    }
    mediaRecorderRef.current?.stop()
  }

  return { stage, liveText, error, supported, useLiveRecognition, start, stop, toggle: stage === 'recording' ? stop : start }
}

/** Compact mic button + text field, for short answers. */
export function VoiceAnswer({
  value,
  onChange,
  elevenLabsConfigured,
  placeholder,
}: {
  value: string
  onChange: (text: string) => void
  elevenLabsConfigured: boolean
  placeholder?: string
}) {
  const voice = useVoiceCapture({
    elevenLabsConfigured,
    onTranscript: (text) => {
      if (text.trim()) onChange(value.trim() ? `${value.trim()} ${text.trim()}` : text.trim())
    },
  })

  const shown = voice.stage === 'recording' && voice.liveText ? voice.liveText : value

  return (
    <div className="voice-answer">
      <textarea
        className="transcript-box answer-box"
        value={shown}
        readOnly={voice.stage !== 'idle'}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Tap the mic and talk, or just type.'}
      />
      <div className="footer-row">
        {voice.supported && (
          <button
            type="button"
            className={`mic-button ${voice.stage === 'recording' ? 'live' : ''}`}
            onClick={voice.toggle}
            disabled={voice.stage === 'transcribing'}
          >
            <span className="mic-dot" aria-hidden="true" />
            {voice.stage === 'idle' && 'Answer out loud'}
            {voice.stage === 'recording' && 'Done talking'}
            {voice.stage === 'transcribing' && 'Transcribing…'}
          </button>
        )}
        {voice.error && <span className="hint">{voice.error}</span>}
      </div>
    </div>
  )
}
