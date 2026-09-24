import { useState } from 'react'
import { CATEGORIES, PERSONALITIES, type CategoryId } from '../../shared/domain'
import type { UserProfile } from '../lib/store'
import { VerdictCard } from './VerdictCard'
import { XpBar } from './XpBar'

function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const w = 220
  const h = 56
  const pad = 6
  const pts = values
    .map((v, i) => (v === null ? null : { x: pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1), y: h - pad - ((v - 1) / 9) * (h - pad * 2) }))
    .filter((p): p is { x: number; y: number } => p !== null)

  if (pts.length === 0) return <p className="hint">No scores yet.</p>

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline" role="img" aria-label={`Scores: ${values.filter((v) => v !== null).join(', ')}`}>
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} className="spark-mid" />
      {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 3} fill={i === pts.length - 1 ? color : 'var(--bg-raised)'} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  )
}

export function ProgressView({
  profile,
  elevenLabsConfigured,
  onBack,
}: {
  profile: UserProfile
  elevenLabsConfigured: boolean
  onBack: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const scored = profile.checkIns.filter((c) => !c.replay).slice(-14)

  const series = (id: CategoryId) => scored.map((c) => c.verdicts.find((v) => v.category === id)?.score ?? null)
  const average = (id: CategoryId) => {
    const vals = series(id).filter((v): v is number => v !== null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–'
  }
  const missionsDone = profile.checkIns.reduce((n, c) => n + c.missionResults.filter((m) => m.completed).length, 0)
  const missionsTotal = profile.checkIns.reduce((n, c) => n + c.missionResults.length, 0)

  return (
    <div className="stack-lg">
      <div>
        <button className="link-button" onClick={onBack}>
          ← Back home
        </button>
        <h1 className="marquee">
          The <em>{profile.name}</em> Report
        </h1>
      </div>

      <div className="card tilt-left">
        <XpBar xp={profile.xp} />
      </div>

      <div className="stat-grid">
        <div className="card mini-stat">
          <span className="mini-stat-num">{profile.checkIns.length}</span>
          <span className="hint">check-ins</span>
        </div>
        <div className="card mini-stat">
          <span className="mini-stat-num">{profile.streak.best}</span>
          <span className="hint">best streak</span>
        </div>
        <div className="card mini-stat">
          <span className="mini-stat-num">
            {missionsDone}
            <small>/{missionsTotal}</small>
          </span>
          <span className="hint">missions done</span>
        </div>
      </div>

      <div className="card">
        <p className="field-label">Scores · last {scored.length || 0} days</p>
        {CATEGORIES.map((c) => {
          const color = PERSONALITIES[profile.assignments[c.id]].color
          return (
            <div className="spark-row" key={c.id}>
              <div>
                <div className="spark-label">{c.label}</div>
                <div className="hint">avg {average(c.id)}</div>
              </div>
              <Sparkline values={series(c.id)} color={color} />
            </div>
          )
        })}
      </div>

      <div className="stack">
        <p className="field-label">Diary</p>
        {profile.checkIns.length === 0 && <p className="hint">Nothing here yet. Your first check-in starts the diary.</p>}
        {[...profile.checkIns].reverse().map((c) => {
          const open = openId === c.id
          return (
            <div key={c.id} className="card diary-entry">
              <button className="diary-head" onClick={() => setOpenId(open ? null : c.id)} aria-expanded={open}>
                <span className="diary-date">
                  {new Date(`${c.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="diary-scores">
                  {c.verdicts.map((v) => (
                    <span key={v.category} className="diary-score" style={{ ['--accent-color' as string]: PERSONALITIES[v.personality].color }}>
                      {v.score ?? '·'}
                    </span>
                  ))}
                </span>
                <span className="diary-xp">{c.replay ? 'replay' : `+${c.xpEarned} XP`}</span>
              </button>
              {open && (
                <div className="stack diary-body">
                  <p className="diary-transcript">&ldquo;{c.transcript}&rdquo;</p>
                  {c.verdicts.map((v, i) => (
                    <VerdictCard key={`${v.category}-${i}`} verdict={v} elevenLabsConfigured={elevenLabsConfigured} index={i} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
