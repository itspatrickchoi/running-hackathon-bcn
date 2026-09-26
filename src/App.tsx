import { useEffect, useState } from 'react'
import type { RoastSession } from '../shared/domain'
import { fetchConfig, getSession } from './lib/api'
import { unlockNew } from './lib/progress'
import { silentBackup, useProfiles, type ThemeId } from './lib/store'
import { CheckInFlow } from './components/CheckInFlow'
import { Home, type HomeView } from './components/Home'
import { Onboarding } from './components/Onboarding'
import { ProgressView } from './components/ProgressView'
import { ResultsView } from './components/ResultsView'
import { StickerBook } from './components/StickerBook'
import { Welcome } from './components/Welcome'
import { StickerLayer } from './components/stickers/StickerLayer'

type View = HomeView | 'checkin' | 'onboarding'

function useElevenLabs() {
  const [configured, setConfigured] = useState(false)
  useEffect(() => {
    fetchConfig().then((c) => setConfigured(c.elevenLabsConfigured))
  }, [])
  return configured
}

function Shell({ theme, seed, children }: { theme: ThemeId; seed: number; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <StickerLayer theme={theme} seed={seed} />
      <div className="masthead" aria-hidden="true">
        <span>Hot Take Diary</span>
        <span>★ Est. 2026 ★</span>
        <span>Daily Verdicts</span>
      </div>
      {children}
    </div>
  )
}

function SharedResultsPage({ id }: { id: string }) {
  const [session, setSession] = useState<RoastSession | null | 'loading' | 'missing'>('loading')
  const elevenLabsConfigured = useElevenLabs()
  const { current } = useProfiles()

  useEffect(() => {
    getSession(id).then((s) => setSession(s ?? 'missing'))
  }, [id])

  return (
    <Shell theme={current?.theme ?? 'clean'} seed={2}>
      {session === 'loading' && <p className="hint">Loading this day&rsquo;s verdict…</p>}
      {session === 'missing' && <p className="error-banner">This link doesn&rsquo;t point to a saved verdict anymore.</p>}
      {session && session !== 'loading' && session !== 'missing' && (
        <ResultsView session={session} elevenLabsConfigured={elevenLabsConfigured} readOnly />
      )}
    </Shell>
  )
}

function MainApp() {
  const { current, users, signIn, updateCurrent, adoptProfile, signOut, removeUser } = useProfiles()
  const elevenLabsConfigured = useElevenLabs()
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, current?.id])

  if (!current) {
    return (
      <Shell theme="clean" seed={0}>
        <Welcome
          users={users}
          onSignIn={(name) => {
            signIn(name)
            setView('home')
          }}
          onRestore={(profile) => {
            adoptProfile(profile)
            setView('home')
          }}
        />
      </Shell>
    )
  }

  const theme = current.theme
  const goHome = () => setView('home')

  if (!current.onboarded || view === 'onboarding') {
    return (
      <Shell theme={theme} seed={1}>
        <Onboarding
          key={current.id}
          profile={current}
          elevenLabsConfigured={elevenLabsConfigured}
          onUpdate={(patch) => updateCurrent(patch)}
          onDone={() => {
            const onboardedProfile = { ...current, onboarded: true }
            const withStickers = { ...onboardedProfile, stickers: [...onboardedProfile.stickers, ...unlockNew(onboardedProfile)] }
            updateCurrent(() => withStickers)
            silentBackup(withStickers)
            goHome()
          }}
        />
      </Shell>
    )
  }

  return (
    <Shell theme={theme} seed={view === 'home' ? 0 : view === 'progress' ? 1 : 2}>
      {view === 'home' && (
        <Home
          profile={current}
          onCheckIn={() => setView('checkin')}
          onNavigate={setView}
          onUpdate={(patch) => updateCurrent(patch)}
          onRedoOnboarding={() => setView('onboarding')}
          onSwitchUser={signOut}
          onDeleteProfile={() => removeUser(current.id)}
        />
      )}
      {view === 'checkin' && (
        <CheckInFlow
          profile={current}
          elevenLabsConfigured={elevenLabsConfigured}
          onCommit={(next) => updateCurrent(() => next)}
          onExit={goHome}
        />
      )}
      {view === 'progress' && <ProgressView profile={current} elevenLabsConfigured={elevenLabsConfigured} onBack={goHome} />}
      {view === 'stickers' && <StickerBook profile={current} onBack={goHome} />}
    </Shell>
  )
}

export function App() {
  const resultsMatch = window.location.pathname.match(/^\/results\/([\w-]+)/)
  if (resultsMatch) return <SharedResultsPage id={resultsMatch[1]} />
  return <MainApp />
}
