// Browser-only persistence: every profile on this device lives in one
// localStorage entry. No server-side database of what people said — the one
// opt-in exception is the encrypted recovery-code backup below, and even
// that is ciphertext the server never has the key to read.
import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_ASSIGNMENTS,
  type CategoryId,
  type MissionResult,
  type OnboardingAnswer,
  type PersonalityId,
  type Verdict,
} from '../../shared/domain'
import { decryptProfile, encryptProfile, formatCode, generateCode, hashCode } from './crypto'
import { fetchEncryptedBackup, pushEncryptedBackup } from './api'

export type ThemeId = 'clean' | 'bubblegum' | 'arcade' | 'terminal'

export interface CheckIn {
  id: string
  date: string // local YYYY-MM-DD
  createdAt: string
  transcript: string
  verdicts: Verdict[]
  missionResults: MissionResult[]
  xpEarned: number
  newStickers: string[]
  replay: boolean // a later check-in on the same day; earns no XP
}

export interface UserProfile {
  id: string
  name: string
  createdAt: string
  theme: ThemeId
  assignments: Record<CategoryId, PersonalityId>
  answers: OnboardingAnswer[]
  dossier: string
  firstImpression: string
  onboarded: boolean
  xp: number
  streak: { current: number; best: number; lastDate: string | null }
  checkIns: CheckIn[]
  stickers: string[]
  /** Kept on this device only for convenience (so it can push updates silently); never sent to the server. */
  syncCode?: string
}

interface StoreShape {
  currentUserId: string | null
  users: Record<string, UserProfile>
}

const KEY = 'rmd:v1'
const EMPTY: StoreShape = { currentUserId: null, users: {} }

let memoryFallback: StoreShape = EMPTY

function read(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return memoryFallback
    const parsed = JSON.parse(raw) as StoreShape
    return parsed && typeof parsed === 'object' && parsed.users ? parsed : memoryFallback
  } catch {
    return memoryFallback
  }
}

function write(next: StoreShape) {
  memoryFallback = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or quota — keep going in memory.
  }
}

export function newId() {
  return crypto.randomUUID().slice(0, 8)
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function blankProfile(name: string): UserProfile {
  return {
    id: newId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    theme: 'clean',
    assignments: { ...DEFAULT_ASSIGNMENTS },
    answers: [],
    dossier: '',
    firstImpression: '',
    onboarded: false,
    xp: 0,
    streak: { current: 0, best: 0, lastDate: null },
    checkIns: [],
    stickers: [],
  }
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
}

function isUserProfile(value: unknown): value is UserProfile {
  const p = value as Partial<UserProfile> | null
  return (
    !!p &&
    typeof p === 'object' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.checkIns) &&
    Array.isArray(p.stickers)
  )
}

/**
 * Encrypts and uploads a profile, generating a recovery code the first time.
 * Returns the profile with `syncCode` set, so the caller can persist it and
 * show the code to the user.
 */
export async function backupProfile(profile: UserProfile): Promise<UserProfile> {
  const code = profile.syncCode ?? generateCode()
  const payload = await encryptProfile(profile, code)
  const codeHash = await hashCode(code)
  await pushEncryptedBackup(codeHash, payload)
  return profile.syncCode ? profile : { ...profile, syncCode: code }
}

/** Best-effort background push for a profile that already has backup turned on. Never throws. */
export async function silentBackup(profile: UserProfile): Promise<void> {
  if (!profile.syncCode) return
  try {
    await backupProfile(profile)
  } catch {
    // A failed background backup shouldn't interrupt the check-in flow.
  }
}

/** Downloads and decrypts a backup by its recovery code. Throws with a user-facing message on any failure. */
export async function restoreFromCode(code: string): Promise<UserProfile> {
  const codeHash = await hashCode(code)
  const payload = await fetchEncryptedBackup(codeHash)
  if (!payload) throw new Error('No backup found for that code.')

  let profile: unknown
  try {
    profile = await decryptProfile(payload, code)
  } catch {
    throw new Error('That code doesn’t match this backup.')
  }
  if (!isUserProfile(profile)) throw new Error('That backup looks corrupted.')

  return { ...profile, syncCode: formatCode(code) }
}

export function useProfiles() {
  const [state, setState] = useState<StoreShape>(() => read())

  const commit = useCallback((updater: (prev: StoreShape) => StoreShape) => {
    setState((prev) => {
      const next = updater(prev)
      write(next)
      return next
    })
  }, [])

  const current = state.currentUserId ? state.users[state.currentUserId] ?? null : null

  useEffect(() => {
    applyTheme(current?.theme ?? 'clean')
  }, [current?.theme])

  const users = Object.values(state.users).sort((a, b) => a.name.localeCompare(b.name))

  /** Selects the profile with this name (case-insensitive), creating it if new. */
  const signIn = useCallback(
    (name: string): UserProfile => {
      const existing = Object.values(read().users).find((u) => u.name.toLowerCase() === name.trim().toLowerCase())
      const profile = existing ?? blankProfile(name)
      commit((prev) => ({ currentUserId: profile.id, users: { ...prev.users, [profile.id]: profile } }))
      return profile
    },
    [commit],
  )

  const updateCurrent = useCallback(
    (patch: Partial<UserProfile> | ((p: UserProfile) => UserProfile)) => {
      commit((prev) => {
        const id = prev.currentUserId
        if (!id || !prev.users[id]) return prev
        const before = prev.users[id]
        const after = typeof patch === 'function' ? patch(before) : { ...before, ...patch }
        return { ...prev, users: { ...prev.users, [id]: after } }
      })
    },
    [commit],
  )

  /** Adds a fully-formed profile (e.g. from restoreFromCode) to this device and signs in as it. */
  const adoptProfile = useCallback(
    (profile: UserProfile) => commit((prev) => ({ currentUserId: profile.id, users: { ...prev.users, [profile.id]: profile } })),
    [commit],
  )

  const signOut = useCallback(() => commit((prev) => ({ ...prev, currentUserId: null })), [commit])

  const removeUser = useCallback(
    (id: string) =>
      commit((prev) => {
        const users = { ...prev.users }
        delete users[id]
        return { currentUserId: prev.currentUserId === id ? null : prev.currentUserId, users }
      }),
    [commit],
  )

  return { current, users, signIn, updateCurrent, adoptProfile, signOut, removeUser }
}
