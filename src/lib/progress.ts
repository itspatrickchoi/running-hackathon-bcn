// Game rules: XP, levels, streaks and collectible stickers. Pure functions only,
// so the check-in flow can compute everything before committing it to storage.
import type { Mission, MissionResult, Verdict } from '../../shared/domain'
import type { StickerArt } from '../components/stickers/art'
import { newId, todayKey, type CheckIn, type UserProfile } from './store'

export const XP_RULES = {
  base: 50,
  perScorePoint: 5,
  perMission: 30,
  perStreakDay: 10,
  maxStreakBonusDays: 7,
}

export const LEVELS: { xp: number; title: string }[] = [
  { xp: 0, title: 'Couch Goblin' },
  { xp: 150, title: 'Snooze Button Survivor' },
  { xp: 400, title: 'Almost Functional' },
  { xp: 800, title: 'Functioning Adult' },
  { xp: 1400, title: 'Suspiciously Productive' },
  { xp: 2200, title: 'Main Character' },
  { xp: 3300, title: 'Final Boss' },
]

export function levelFor(xp: number) {
  let index = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1
  return { level: index + 1, title: current.title, next, progress }
}

function dayDiff(a: string, b: string) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

export function nextStreak(streak: UserProfile['streak'], today: string): UserProfile['streak'] {
  if (streak.lastDate === today) return streak
  const current = streak.lastDate && dayDiff(streak.lastDate, today) === 1 ? streak.current + 1 : 1
  return { current, best: Math.max(streak.best, current), lastDate: today }
}

/** The streak as it should be displayed today (a missed day shows 0 until the next check-in). */
export function liveStreak(streak: UserProfile['streak'], today = todayKey()) {
  if (!streak.lastDate) return 0
  return dayDiff(streak.lastDate, today) <= 1 ? streak.current : 0
}

export function missionsFrom(checkIn: CheckIn | undefined): Mission[] {
  if (!checkIn) return []
  return checkIn.verdicts.filter((v) => v.mission).map((v) => ({ category: v.category, mission: v.mission! }))
}

/** Missions still open for today: the ones handed out by the latest check-in on an earlier day. */
export function openMissions(profile: UserProfile, today = todayKey()): Mission[] {
  const earlier = profile.checkIns.filter((c) => c.date < today)
  const last = earlier[earlier.length - 1]
  const doneToday = profile.checkIns.some((c) => c.date === today && !c.replay)
  return doneToday ? [] : missionsFrom(last)
}

export interface XpBreakdown {
  base: number
  scores: number
  missions: number
  streak: number
  total: number
}

export function computeXp(verdicts: Verdict[], missionResults: MissionResult[], streakDays: number): XpBreakdown {
  const base = XP_RULES.base
  const scores = verdicts.reduce((sum, v) => sum + (v.score ?? 0), 0) * XP_RULES.perScorePoint
  const missions = missionResults.filter((m) => m.completed).length * XP_RULES.perMission
  const streak = Math.min(streakDays, XP_RULES.maxStreakBonusDays) * XP_RULES.perStreakDay
  return { base, scores, missions, streak, total: base + scores + missions + streak }
}

export interface StickerDef {
  id: string
  name: string
  art: StickerArt
  hint: string
  unlocked: (p: UserProfile) => boolean
}

const completedMissions = (p: UserProfile) =>
  p.checkIns.reduce((n, c) => n + c.missionResults.filter((m) => m.completed).length, 0)

export const STICKERS: StickerDef[] = [
  { id: 'hello', name: 'Hello, My Name Is', art: 'smiley', hint: 'Finish onboarding', unlocked: (p) => p.onboarded },
  { id: 'first-roast', name: 'Fresh Meat', art: 'flame', hint: 'Get your first verdict', unlocked: (p) => p.checkIns.length >= 1 },
  { id: 'streak-3', name: 'Hat Trick', art: 'lightning', hint: 'Check in 3 days in a row', unlocked: (p) => p.streak.best >= 3 },
  { id: 'streak-7', name: 'Week Warrior', art: 'crown', hint: 'Check in 7 days in a row', unlocked: (p) => p.streak.best >= 7 },
  { id: 'mission-1', name: 'Did The Thing', art: 'star', hint: 'Complete a mission', unlocked: (p) => completedMissions(p) >= 1 },
  { id: 'mission-10', name: 'Mission Machine', art: 'cd', hint: 'Complete 10 missions', unlocked: (p) => completedMissions(p) >= 10 },
  {
    id: 'perfect-10',
    name: 'Flawless',
    art: 'sparkle',
    hint: 'Score a 10 in any category',
    unlocked: (p) => p.checkIns.some((c) => c.verdicts.some((v) => v.score === 10)),
  },
  {
    id: 'full-house',
    name: 'Full House',
    art: 'heart',
    hint: 'Hit all three categories in one day',
    unlocked: (p) => p.checkIns.some((c) => new Set(c.verdicts.map((v) => v.category)).size >= 3),
  },
  { id: 'level-3', name: 'Almost Functional', art: 'butterfly', hint: 'Reach level 3', unlocked: (p) => levelFor(p.xp).level >= 3 },
  { id: 'level-5', name: 'Glow Up', art: 'pixelheart', hint: 'Reach level 5', unlocked: (p) => levelFor(p.xp).level >= 5 },
  { id: 'regular', name: 'Regular', art: 'floppy', hint: 'Check in 10 times', unlocked: (p) => p.checkIns.length >= 10 },
]

export function unlockNew(profile: UserProfile): string[] {
  return STICKERS.filter((s) => !profile.stickers.includes(s.id) && s.unlocked(profile)).map((s) => s.id)
}

/** Folds a finished check-in into the profile: streak, XP (first check-in of the day only), stickers. */
export function recordCheckIn(
  profile: UserProfile,
  transcript: string,
  verdicts: Verdict[],
  missionResults: MissionResult[],
): { profile: UserProfile; checkIn: CheckIn; xp: XpBreakdown | null } {
  const today = todayKey()
  const replay = profile.checkIns.some((c) => c.date === today && !c.replay)
  const streak = replay ? profile.streak : nextStreak(profile.streak, today)
  const xp = replay ? null : computeXp(verdicts, missionResults, streak.current)

  const checkIn: CheckIn = {
    id: newId(),
    date: today,
    createdAt: new Date().toISOString(),
    transcript,
    verdicts,
    missionResults,
    xpEarned: xp?.total ?? 0,
    newStickers: [],
    replay,
  }

  let next: UserProfile = {
    ...profile,
    streak,
    xp: profile.xp + checkIn.xpEarned,
    checkIns: [...profile.checkIns, checkIn],
  }
  const unlocked = unlockNew(next)
  checkIn.newStickers = unlocked
  next = { ...next, stickers: [...next.stickers, ...unlocked] }

  return { profile: next, checkIn, xp }
}
