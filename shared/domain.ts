// Shared domain data — imported by both the frontend and the Netlify Functions,
// so the category/personality definitions never drift between client and server.

export type CategoryId = 'fitness' | 'work' | 'creative'
export type PersonalityId = 'savage' | 'coach' | 'hype'

export interface CategoryDef {
  id: CategoryId
  label: string
  hint: string
}

export interface PersonalityDef {
  id: PersonalityId
  label: string
  tagline: string
  color: string
  // Premade ElevenLabs voice IDs, available in every ElevenLabs account's default
  // voice library. Swap these for voice IDs you've picked yourself once ELEVENLABS_API_KEY is set.
  voiceId: string
  // Used for the browser speechSynthesis fallback, so the three personalities
  // still sound distinct from each other with no ElevenLabs key configured.
  synthPitch: number
  synthRate: number
  systemPrompt: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'fitness', label: 'Fitness & Health', hint: 'workouts, meals, sleep, energy' },
  { id: 'work', label: 'Work & Productivity', hint: 'tasks, focus, meetings, deadlines' },
  { id: 'creative', label: 'Creative & Personal', hint: 'side projects, hobbies, relationships' },
]

export const PERSONALITIES: Record<PersonalityId, PersonalityDef> = {
  savage: {
    id: 'savage',
    label: 'Savage Roaster',
    tagline: 'Cutting and funny. Aims at choices and excuses, never identity.',
    color: '#D6432B',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    synthPitch: 0.75,
    synthRate: 1.08,
    systemPrompt:
      'You are the Savage Roaster: cutting, funny, and merciless about excuses and choices, but never cruel about anything the person cannot control (appearance, circumstances, identity). Roast the decision, not the person. Land jokes, not insults.',
  },
  coach: {
    id: 'coach',
    label: 'Gentle Coach',
    tagline: 'Warm, specific, forward-looking. Always names one thing to try tomorrow.',
    color: '#4A7C6F',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    synthPitch: 1.0,
    synthRate: 0.95,
    systemPrompt:
      'You are the Gentle Coach: warm, specific, and forward-looking. Acknowledge what actually happened without judgment, then name exactly one concrete thing to try tomorrow.',
  },
  hype: {
    id: 'hype',
    label: 'Hype Man',
    tagline: 'Over the top enthusiastic. Every small win is a huge win.',
    color: '#E8A93A',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    synthPitch: 1.15,
    synthRate: 1.15,
    systemPrompt:
      'You are the Hype Man: over-the-top enthusiastic and validating. Treat even small wins as massive victories, with exaggerated energy and genuine excitement. No sarcasm.',
  },
}

export const DEFAULT_ASSIGNMENTS: Record<CategoryId, PersonalityId> = {
  fitness: 'coach',
  work: 'savage',
  creative: 'hype',
}

export interface Verdict {
  category: CategoryId
  personality: PersonalityId
  excerpt: string
  verdict: string
  // 1–10 rating of how the day went in this category (newer verdicts only).
  score?: number
  // One concrete thing to try tomorrow in this category (newer verdicts only).
  mission?: string
}

export interface Mission {
  category: CategoryId
  mission: string
}

export interface MissionResult {
  category: CategoryId
  completed: boolean
  note: string
}

export interface OnboardingAnswer {
  question: string
  answer: string
}

export interface OnboardResult {
  dossier: string
  firstImpression: string
}

// What the verdict endpoint is told about the person, when they have a profile.
export interface ProfileContext {
  name: string
  dossier?: string
}

export interface RoastSession {
  id?: string
  createdAt: string
  transcript: string
  verdicts: Verdict[]
}
