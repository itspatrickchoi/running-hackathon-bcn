import { useRef, useState } from 'react'
import { CATEGORIES, PERSONALITIES, type Verdict } from '../../shared/domain'
import { fetchSpokenVerdict } from '../lib/api'
import { speakWithBrowserVoice } from '../lib/speech'

export function VerdictCard({
  verdict,
  elevenLabsConfigured,
}: {
  verdict: Verdict
  elevenLabsConfigured: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cachedUrlRef = useRef<string | null>(null)

  const personality = PERSONALITIES[verdict.personality]
  const category = CATEGORIES.find((c) => c.id === verdict.category)

  async function play() {
    setPlaying(true)
    try {
      if (elevenLabsConfigured) {
        if (!cachedUrlRef.current) {
          const blob = await fetchSpokenVerdict(verdict.verdict, verdict.personality)
          cachedUrlRef.current = URL.createObjectURL(blob)
        }
        const audio = audioRef.current ?? new Audio()
        audioRef.current = audio
        audio.src = cachedUrlRef.current
        audio.ontimeupdate = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
        audio.onended = () => {
          setPlaying(false)
          setProgress(0)
        }
        await audio.play()
      } else {
        await speakWithBrowserVoice(verdict.verdict, verdict.personality)
        setPlaying(false)
        setProgress(0)
      }
    } catch {
      setPlaying(false)
      setProgress(0)
    }
  }

  return (
    <div className="card verdict-card" style={{ ['--accent-color' as string]: personality.color }}>
      <div className="verdict-kicker">
        <span className="verdict-label">
          {category?.label} · {personality.label}
        </span>
      </div>
      <p className="verdict-excerpt">&ldquo;{verdict.excerpt}&rdquo;</p>
      <p className="verdict-text">{verdict.verdict}</p>
      <button className="play-button" onClick={play} disabled={playing}>
        <span className="play-glyph">{playing ? '❚❚' : '▶'}</span>
        <span className="play-track">
          <span className="play-track-fill" style={{ width: `${progress * 100}%` }} />
        </span>
      </button>
    </div>
  )
}
