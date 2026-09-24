import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { STICKERS, type XpBreakdown } from '../lib/progress'
import { Sticker } from './stickers/art'

function useCountUp(target: number, durationMs = 900) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, reduce])
  return value
}

export function RewardsPanel({ xp, newStickers, replay }: { xp: XpBreakdown | null; newStickers: string[]; replay: boolean }) {
  const shown = useCountUp(xp?.total ?? 0)
  const unlocked = STICKERS.filter((s) => newStickers.includes(s.id))

  return (
    <div className="card rewards-card tilt-left">
      {replay || !xp ? (
        <p className="hint">Replay run — XP only counts for your first check-in each day.</p>
      ) : (
        <>
          <div className="xp-gained">
            <span className="xp-plus">+{shown}</span>
            <span className="xp-label">XP</span>
          </div>
          <ul className="xp-breakdown">
            <li>Showing up · {xp.base}</li>
            {xp.scores > 0 && <li>Scores · {xp.scores}</li>}
            {xp.missions > 0 && <li>Missions · {xp.missions}</li>}
            {xp.streak > 0 && <li>Streak bonus · {xp.streak}</li>}
          </ul>
        </>
      )}
      {unlocked.length > 0 && (
        <div className="unlocked">
          <p className="field-label">New sticker{unlocked.length > 1 ? 's' : ''}!</p>
          <div className="unlocked-row">
            {unlocked.map((s, i) => (
              <motion.div
                key={s.id}
                className="unlocked-item"
                initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: i % 2 ? 8 : -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.4 + i * 0.15 }}
              >
                <Sticker art={s.art} size={64} />
                <span>{s.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
