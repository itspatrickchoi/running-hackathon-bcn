import { levelFor } from '../lib/progress'

export function XpBar({ xp }: { xp: number }) {
  const { level, title, next, progress } = levelFor(xp)
  return (
    <div className="xp-block">
      <div className="xp-head">
        <span className="level-badge">Lv {level}</span>
        <span className="level-title">{title}</span>
        <span className="xp-count">{next ? `${xp} / ${next.xp} XP` : `${xp} XP · max level`}</span>
      </div>
      <div className="xp-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="xp-fill" style={{ width: `${Math.max(3, progress * 100)}%` }} />
      </div>
      {next && <p className="hint">Next up: {next.title}</p>}
    </div>
  )
}
