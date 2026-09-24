import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { OnboardingAnswer } from '../../shared/domain'
import { onboardUser } from '../lib/api'
import { ONBOARDING_QUESTIONS } from '../lib/onboardingQuestions'
import type { UserProfile } from '../lib/store'
import { PersonalityPicker } from './PersonalityPicker'
import { ThemePicker } from './ThemePicker'
import { VoiceAnswer } from './VoiceInput'
import { Sticker } from './stickers/art'

type Step = { kind: 'question'; index: number } | { kind: 'dossier' } | { kind: 'theme' } | { kind: 'judges' }

const STEPS: Step[] = [
  ...ONBOARDING_QUESTIONS.map((_, index) => ({ kind: 'question' as const, index })),
  { kind: 'dossier' },
  { kind: 'theme' },
  { kind: 'judges' },
]

export function Onboarding({
  profile,
  elevenLabsConfigured,
  onUpdate,
  onDone,
}: {
  profile: UserProfile
  elevenLabsConfigured: boolean
  onUpdate: (patch: Partial<UserProfile>) => void
  onDone: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() =>
    ONBOARDING_QUESTIONS.map((q) => profile.answers.find((a) => a.question === q.question)?.answer ?? ''),
  )
  const [dossierState, setDossierState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [dossierError, setDossierError] = useState<string | null>(null)

  const step = STEPS[stepIndex]
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const back = () => setStepIndex((i) => Math.max(i - 1, 0))

  async function buildDossier() {
    const payload: OnboardingAnswer[] = ONBOARDING_QUESTIONS.map((q, i) => ({ question: q.question, answer: answers[i] }))
    onUpdate({ answers: payload.filter((a) => a.answer.trim()) })
    if (!payload.some((a) => a.answer.trim())) {
      onUpdate({ dossier: '', firstImpression: '' })
      return
    }
    setDossierState('loading')
    setDossierError(null)
    try {
      const result = await onboardUser(profile.name, payload)
      onUpdate({ dossier: result.dossier, firstImpression: result.firstImpression })
      setDossierState('idle')
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Could not build your profile.')
      setDossierState('error')
    }
  }

  // Build the dossier as soon as the reveal step opens.
  useEffect(() => {
    if (step.kind === 'dossier') buildDossier()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex])

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">
          Getting to know {profile.name} · {stepIndex + 1}/{STEPS.length}
        </p>
        <div className="step-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i <= stepIndex ? 'on' : ''} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 12, rotate: -0.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="stack"
        >
          {step.kind === 'question' && (
            <>
              <h2 className="question-title">{ONBOARDING_QUESTIONS[step.index].question}</h2>
              <VoiceAnswer
                value={answers[step.index]}
                onChange={(text) => setAnswers((prev) => prev.map((a, i) => (i === step.index ? text : a)))}
                elevenLabsConfigured={elevenLabsConfigured}
                placeholder={ONBOARDING_QUESTIONS[step.index].placeholder}
              />
              <div className="footer-row">
                <button className="pill-button" onClick={next}>
                  {answers[step.index].trim() ? 'Next' : 'Skip'}
                </button>
                {step.index > 0 && (
                  <button className="pill-button ghost" onClick={back}>
                    Back
                  </button>
                )}
              </div>
            </>
          )}

          {step.kind === 'dossier' && (
            <>
              <h2 className="question-title">
                Your judges&rsquo; <em>file</em> on you
              </h2>
              {dossierState === 'loading' && (
                <div className="card dossier-card">
                  <p className="hint">Reading your answers, taking notes, sharpening knives…</p>
                </div>
              )}
              {dossierState === 'error' && (
                <>
                  <div className="error-banner">{dossierError}</div>
                  <div className="footer-row">
                    <button className="pill-button" onClick={buildDossier}>
                      Try again
                    </button>
                    <button className="pill-button ghost" onClick={next}>
                      Skip for now
                    </button>
                  </div>
                </>
              )}
              {dossierState === 'idle' && (
                <>
                  {profile.firstImpression ? (
                    <div className="card dossier-card tilt-right">
                      <Sticker art="burst" size={76} rotate={12} className="card-sticker" />
                      <p className="field-label">Confidential · {profile.name}</p>
                      <p className="dossier-text">{profile.dossier}</p>
                      <p className="first-impression">&ldquo;{profile.firstImpression}&rdquo;</p>
                    </div>
                  ) : (
                    <div className="card">
                      <p>You skipped every question, so your judges are going in blind. Brave.</p>
                    </div>
                  )}
                  <div className="footer-row">
                    <button className="pill-button" onClick={next}>
                      Fair enough
                    </button>
                    <button className="pill-button ghost" onClick={() => setStepIndex(0)}>
                      Redo answers
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step.kind === 'theme' && (
            <>
              <h2 className="question-title">Pick your look</h2>
              <ThemePicker value={profile.theme} onChange={(theme) => onUpdate({ theme })} />
              <div className="footer-row">
                <button className="pill-button" onClick={next}>
                  Looks good
                </button>
                <button className="pill-button ghost" onClick={back}>
                  Back
                </button>
              </div>
            </>
          )}

          {step.kind === 'judges' && (
            <>
              <h2 className="question-title">Who judges what?</h2>
              <PersonalityPicker assignments={profile.assignments} onChange={(assignments) => onUpdate({ assignments })} />
              <div className="footer-row">
                <button className="pill-button" onClick={onDone}>
                  Start roasting me
                </button>
                <button className="pill-button ghost" onClick={back}>
                  Back
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
