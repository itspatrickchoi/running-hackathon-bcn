import type {
  CategoryId,
  Mission,
  MissionResult,
  OnboardingAnswer,
  OnboardResult,
  PersonalityId,
  ProfileContext,
  RoastSession,
  Verdict,
  WaitlistSource,
} from '../../shared/domain'

export async function fetchConfig(): Promise<{ elevenLabsConfigured: boolean }> {
  const res = await fetch('/api/config')
  if (!res.ok) return { elevenLabsConfigured: false }
  return res.json()
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData()
  form.set('audio', blob, 'recording.webm')
  const res = await fetch('/api/transcribe', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Transcription failed.')
  }
  const data = (await res.json()) as { transcript: string }
  return data.transcript
}

export async function generateVerdicts(
  transcript: string,
  assignments: Record<CategoryId, PersonalityId>,
  extras: { profile?: ProfileContext; previousMissions?: Mission[] } = {},
): Promise<{ verdicts: Verdict[]; missionResults: MissionResult[] }> {
  const res = await fetch('/api/verdicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, assignments, ...extras }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Could not generate verdicts.')
  }
  const data = (await res.json()) as { verdicts: Verdict[]; missionResults?: MissionResult[] }
  return { verdicts: data.verdicts, missionResults: data.missionResults ?? [] }
}

export async function onboardUser(name: string, answers: OnboardingAnswer[]): Promise<OnboardResult> {
  const res = await fetch('/api/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, answers }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Could not build your profile.')
  }
  return res.json()
}

export async function fetchSpokenVerdict(text: string, personality: PersonalityId): Promise<Blob> {
  const res = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, personality }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Voice synthesis failed.')
  }
  return res.blob()
}

export async function saveSession(
  session: Omit<RoastSession, 'id' | 'createdAt'>,
): Promise<string> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  })
  if (!res.ok) throw new Error('Could not save this session.')
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function getSession(id: string): Promise<RoastSession | null> {
  const res = await fetch(`/api/sessions/${id}`)
  if (!res.ok) return null
  const data = (await res.json()) as { found: boolean; session: RoastSession | null }
  return data.found ? data.session : null
}

export async function joinWaitlist(name: string, email: string, source: WaitlistSource): Promise<void> {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, source }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Could not join the list.')
  }
}
