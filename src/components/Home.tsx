import { useState } from 'react'
import { CATEGORIES, PERSONALITIES } from '../../shared/domain'
import { liveStreak, openMissions, STICKERS } from '../lib/progress'
import { todayKey, type UserProfile } from '../lib/store'
import { PersonalityPicker } from './PersonalityPicker'
import { ThemePicker } from './ThemePicker'
import { XpBar } from './XpBar'
import { Sticker } from './stickers/art'
import { WaitlistForm } from './WaitlistForm'

export type HomeView = 'home' | 'progress' | 'stickers'

export function Home({
  profile,
  onCheckIn,
  onNavigate,
  onUpdate,
  onRedoOnboarding,
  onSwitchUser,
  onDeleteProfile,
}: {
  profile: UserProfile
  onCheckIn: () => void
  onNavigate: (view: HomeView) => void
  onUpdate: (patch: Partial<UserProfile>) => void
  onRedoOnboarding: () => void
  onSwitchUser: () => void
  onDeleteProfile: () => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const today = todayKey()
  const streak = liveStreak(profile.streak, today)
  const missions = openMissions(profile, today)
  const checkedInToday = profile.checkIns.some((c) => c.date === today && !c.replay)
  const latestStickers = STICKERS.filter((s) => profile.stickers.includes(s.id)).slice(-4)

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="marquee">
          Hey <em>{profile.name}</em>.
        </h1>
        <p className="subhead">
          {checkedInToday
            ? "Today's verdict is in. Come back tomorrow to keep the streak alive."
            : streak > 0
              ? `You're on a ${streak}-day streak. Don't you dare break it.`
              : 'Ready to be judged?'}
        </p>
      </div>

      <div className="stat-row">
        <div className="card stat-card tilt-left">
          <XpBar xp={profile.xp} />
        </div>
        <div className="card stat-card streak-card tilt-right">
          <Sticker art="flame" size={52} rotate={-8} />
          <div>
            <div className="streak-number">{streak}</div>
            <div className="hint">day streak · best {profile.streak.best}</div>
          </div>
        </div>
      </div>

      <div className="card missions-card">
        <p className="field-label">Today&rsquo;s missions</p>
        {missions.length === 0 ? (
          <p className="hint">
            {checkedInToday
              ? 'Handled. New missions drop with each verdict.'
              : 'No missions yet — your first verdict hands them out.'}
          </p>
        ) : (
          <ul className="mission-list">
            {missions.map((m) => {
              const category = CATEGORIES.find((c) => c.id === m.category)
              const personality = PERSONALITIES[profile.assignments[m.category]]
              return (
                <li key={m.category} style={{ ['--accent-color' as string]: personality.color }}>
                  <span className="mission-cat">{category?.label}</span>
                  <span>{m.mission}</span>
                </li>
              )
            })}
          </ul>
        )}
        {missions.length > 0 && <p className="hint">Mention them in tonight&rsquo;s recap — +30 XP each if you did them.</p>}
      </div>

      <div className="footer-row">
        <button className="pill-button big" onClick={onCheckIn}>
          {checkedInToday ? 'Roast me again (no XP)' : 'Check in for today'}
        </button>
      </div>

      <div className="nav-tiles">
        <button className="nav-tile" onClick={() => onNavigate('progress')}>
          <Sticker art="cd" size={40} rotate={10} />
          <span>
            <strong>My progress</strong>
            <span className="hint">{profile.checkIns.length} check-ins</span>
          </span>
        </button>
        <button className="nav-tile" onClick={() => onNavigate('stickers')}>
          <span className="nav-tile-stickers">
            {latestStickers.length > 0 ? (
              latestStickers.map((s, i) => <Sticker key={s.id} art={s.art} size={34} rotate={(i % 2 ? 1 : -1) * 12} />)
            ) : (
              <Sticker art="star" size={40} rotate={-10} className="locked" />
            )}
          </span>
          <span>
            <strong>Sticker book</strong>
            <span className="hint">
              {profile.stickers.length}/{STICKERS.length} collected
            </span>
          </span>
        </button>
      </div>

      <div className="settings">
        <button className="link-button" onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen}>
          {settingsOpen ? 'Close settings' : 'Settings · theme · judges'}
        </button>
        {settingsOpen && (
          <div className="stack">
            <p className="field-label">Theme</p>
            <ThemePicker value={profile.theme} onChange={(theme) => onUpdate({ theme })} />
            <p className="field-label">Judges</p>
            <PersonalityPicker assignments={profile.assignments} onChange={(assignments) => onUpdate({ assignments })} />
            <div className="footer-row">
              <button className="pill-button ghost" onClick={onRedoOnboarding}>
                Redo the get-to-know-you
              </button>
              <button className="pill-button ghost" onClick={onSwitchUser}>
                Switch user
              </button>
              <button
                className="pill-button ghost danger"
                onClick={() => {
                  if (window.confirm(`Delete ${profile.name}'s profile and all their progress from this browser?`)) onDeleteProfile()
                }}
              >
                Delete profile
              </button>
            </div>
          </div>
        )}
      </div>

      <WaitlistForm source="home" title="Get notified about new features" compact />
    </div>
  )
}
