import { PERSONALITIES, type PersonalityId } from '../../shared/domain'

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: ((event: any) => void) | null
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isLiveRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export interface LiveRecognizer {
  stop: () => void
}

export function startLiveRecognition(opts: {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}): LiveRecognizer {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    opts.onError('Live speech recognition is not supported in this browser.')
    return { stop: () => {} }
  }

  const recognizer = new Ctor()
  recognizer.continuous = true
  recognizer.interimResults = true
  recognizer.lang = 'en-US'

  let finalTranscript = ''

  recognizer.onresult = (event: any) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        finalTranscript += `${result[0].transcript} `
      } else {
        interim += result[0].transcript
      }
    }
    opts.onInterim(`${finalTranscript}${interim}`.trim())
  }

  recognizer.onerror = (event: any) => {
    opts.onError(event.error ?? 'Speech recognition error.')
  }

  recognizer.onend = () => {
    opts.onFinal(finalTranscript.trim())
    opts.onEnd()
  }

  recognizer.start()

  return {
    stop: () => recognizer.stop(),
  }
}

let voiceCache: SpeechSynthesisVoice[] = []
if (isSpeechSynthesisSupported()) {
  const loadVoices = () => {
    voiceCache = window.speechSynthesis.getVoices()
  }
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

export function speakWithBrowserVoice(text: string, personality: PersonalityId): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve()
      return
    }
    window.speechSynthesis.cancel()
    const def = PERSONALITIES[personality]
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.pitch = def.synthPitch
    utterance.rate = def.synthRate
    const preferred = voiceCache.find((v) => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}
