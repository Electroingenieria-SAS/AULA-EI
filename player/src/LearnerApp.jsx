import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import LearnerShell from './LearnerShell.jsx'
import HomePage from './HomePage.jsx'
import { decodeAvatarSelection } from '../../src/avatar/avatar-utils.js'
import { avatarWelcomeStorageKey, shouldOfferAvatarWelcome } from '../../src/avatar/avatar-welcome-policy.js'
import { navigateLearner } from './navigation.js'

const loadStudioApp = () => import('../../studio/src/App.jsx')
const loadCatalogPage = () => import('./CatalogPage.jsx')
const loadCoursePlayer = () => import('./CoursePlayer.jsx')
const loadCoursePreview = () => import('./CoursePreview.jsx')
const loadGamesPage = () => import('./GamesPage.jsx')
const loadDevelopmentPage = () => import('./DevelopmentPage.jsx')
const loadTrainingPlanPage = () => import('./TrainingPlanPage.jsx')
const loadIntelligencePage = () => import('./IntelligencePage.jsx')
const loadPrivacyCenter = () => import('./PrivacyCenter.jsx')
const loadDeveloperCredits = () => import('./DeveloperCreditsPage.jsx')
const loadAvatarStudio = () => import('./avatar/AvatarStudio.jsx')
const loadAvatarWelcome = () => import('./avatar/AvatarWelcome.jsx')

const StudioApp = lazy(loadStudioApp)
const CatalogPage = lazy(loadCatalogPage)
const CoursePlayer = lazy(loadCoursePlayer)
const CoursePreview = lazy(loadCoursePreview)
const GamesPage = lazy(loadGamesPage)
const DevelopmentPage = lazy(loadDevelopmentPage)
const TrainingPlanPage = lazy(loadTrainingPlanPage)
const IntelligencePage = lazy(loadIntelligencePage)
const PrivacyCenter = lazy(loadPrivacyCenter)
const DeveloperCreditsPage = lazy(loadDeveloperCredits)
const AvatarStudio = lazy(loadAvatarStudio)
const AvatarWelcome = lazy(loadAvatarWelcome)

function readRoute() {
  const hash = window.location.hash || '#/'
  const previewMatch = hash.match(/^#\/course-preview\/([^/?#]+)/)
  if (previewMatch?.[1]) return { key: 'preview:' + previewMatch[1], type: 'preview', id: previewMatch[1] }
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  if (/^#\/catalog(?:\/|$)/.test(hash)) return { key: 'catalog', type: 'catalog' }
  if (/^#\/development(?:\/|$)/.test(hash)) return { key: 'development', type: 'development' }
  if (/^#\/plan(?:\/|$)/.test(hash)) return { key: 'plan', type: 'plan' }
  if (/^#\/coach(?:\/|$)/.test(hash)) return { key: 'coach', type: 'coach' }
  const gamesMatch = hash.match(/^#\/games\/([^/?#]+)/)
  if (gamesMatch?.[1]) return { key: 'games', type: 'games', courseId: gamesMatch[1] }
  if (/^#\/games(?:\/|$)/.test(hash)) return { key: 'games', type: 'games', courseId: '' }
  if (/^#\/studio(?:\/|$)/.test(hash)) return { key: 'studio', type: 'studio' }
  if (/^#\/privacy(?:\/|$)/.test(hash)) return { key: 'privacy', type: 'privacy' }
  if (/^#\/credits(?:\/|$)/.test(hash)) return { key: 'credits', type: 'credits' }
  if (/^#\/mi-personaje(?:\/|$)/.test(hash)) return { key: 'avatar', type: 'avatar' }
  return { key: 'home', type: 'home' }
}

export default function LearnerApp({ profile, sessionUser, onAvatarChange }) {
  const [route, setRoute] = useState(() => readRoute())

  const [showAvatarWelcome, setShowAvatarWelcome] = useState(false)
  useEffect(() => {
    setShowAvatarWelcome(false)
    // LearnerApp mounts only after LegalGate and AdminMfaGate finish.
    // An explicitly dismissed invitation is respected until the user signs out.
    let dismissed = false
    try { dismissed = sessionStorage.getItem(avatarWelcomeStorageKey(sessionUser?.id)) === '1' } catch {}
    if (profile?.id !== sessionUser?.id || !shouldOfferAvatarWelcome({
      userId: sessionUser?.id, avatarUrl: profile?.avatar_url,
      routeType: route.type, dismissed,
    })) return

    // Never interrupt exams, game sessions, coaching or legal documents.
    // If the page loaded in a background tab, reveal the popup on return.
    const reveal = () => {
      if (document.visibilityState === 'hidden') return
      document.removeEventListener('visibilitychange', reveal)
      setShowAvatarWelcome(true)
    }
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'hidden') document.addEventListener('visibilitychange', reveal)
      else reveal()
    }, 850)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', reveal)
    }
  }, [sessionUser?.id, profile?.id, profile?.avatar_url, route.type])

  const dismissAvatarWelcome = () => {
    try { sessionStorage.setItem(avatarWelcomeStorageKey(sessionUser?.id), '1') } catch {}
    setShowAvatarWelcome(false)
  }
  const openAvatarWelcome = () => {
    if (decodeAvatarSelection(profile?.avatar_url)) navigateLearner('/mi-personaje')
    else setShowAvatarWelcome(true)
  }

  useEffect(() => {
    const sync = () => setRoute(readRoute())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  useEffect(() => {
    const warm = () => {
      // Keep offline/limited-bandwidth devices responsive. Deep sections load
      // on their actual route instead of consuming requests after every login.
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection?.saveData || /(?:^|-)2g/.test(String(connection?.effectiveType || ''))) return
      void loadCatalogPage()
      void loadDevelopmentPage()
      void loadTrainingPlanPage()
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 1600 })
      return () => window.cancelIdleCallback?.(id)
    }

    const id = window.setTimeout(warm, 700)
    return () => window.clearTimeout(id)
  }, [profile?.role])

  useEffect(() => {
    if (route.type === 'course') void loadCoursePlayer()
    if (route.type === 'preview') void loadCoursePreview()
    if (route.type === 'catalog') void loadCatalogPage()
    if (route.type === 'development') void loadDevelopmentPage()
    if (route.type === 'plan') void loadTrainingPlanPage()
    if (route.type === 'coach') void loadIntelligencePage()
    if (route.type === 'games') void loadGamesPage()
    if (route.type === 'studio') void loadStudioApp()
    if (route.type === 'privacy') void loadPrivacyCenter()
    if (route.type === 'credits') void loadDeveloperCredits()
    if (route.type === 'avatar') void loadAvatarStudio()
  }, [route.type])

  const content = useMemo(() => {
    if (route.type === 'preview') return ['admin','super_admin'].includes(String(profile?.role || ''))
      ? <CoursePreview profile={profile} courseId={route.id}/>
      : <section className="course-preview-state" role="alert">No tienes permisos para consultar la vista previa.</section>
    if (route.type === 'course') return <CoursePlayer suppliedSessionUser={sessionUser} />
    if (route.type === 'catalog') return <CatalogPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'development') return <DevelopmentPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'plan') return <TrainingPlanPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'coach') return <IntelligencePage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'games') return <GamesPage sessionUser={sessionUser} initialCourseId={route.courseId || ''}/>
    if (route.type === 'studio') return <StudioApp embedded initialProfile={profile} />
    if (route.type === 'privacy') return <PrivacyCenter profile={profile} />
    if (route.type === 'credits') return <DeveloperCreditsPage />
    if (route.type === 'avatar') return <AvatarStudio profile={profile} onSaved={onAvatarChange}/>
    return <HomePage profile={profile} sessionUser={sessionUser} onAvatarIntro={openAvatarWelcome} />
  }, [route.key, route.type, route.courseId, profile, sessionUser, onAvatarChange])

  return <>
    <LearnerShell activeRoute={route.type} profile={profile}>
      <div className="learner-route-transition" key={route.key}>
        <span className="experience-route-progress" aria-hidden="true" />
        <Suspense fallback={<RouteLoading route={route.type} />}>{content}</Suspense>
      </div>
    </LearnerShell>
    {showAvatarWelcome && <Suspense fallback={null}>
      <AvatarWelcome onLater={dismissAvatarWelcome} onCreate={() => {
        dismissAvatarWelcome()
        navigateLearner('/mi-personaje')
      }}/>
    </Suspense>}
  </>
}

function RouteLoading({ route }) {
  const label = route === 'studio'
    ? 'Abriendo Gestión Aula EI…'
    : route === 'preview'
      ? 'Preparando la vista previa…'
    : route === 'credits'
      ? 'Abriendo créditos de desarrollo…'
    : route === 'avatar'
      ? 'Preparando tu personaje…'
    : route === 'coach'
      ? 'Preparando Mi entrenador…'
    : route === 'plan'
      ? 'Organizando tu plan de formación…'
    : route === 'development'
      ? 'Preparando tu desarrollo…'
    : route === 'catalog'
      ? 'Preparando tus capacitaciones…'
      : route === 'games'
        ? 'Preparando Juegos EI…'
        : route === 'course'
          ? 'Abriendo la capacitación…'
          : 'Preparando Aula EI…'

  return <section className="learner-route-loading" aria-busy="true" aria-live="polite">
    <div className="learner-route-loading-hero">
      <span className="learner-route-loading-kicker">Aula EI</span>
      <div className="learner-route-loading-title" />
      <div className="learner-route-loading-copy" />
      <strong>{label}</strong>
    </div>
    <div className="learner-route-loading-grid" aria-hidden="true">
      <i /><i /><i /><i />
    </div>
  </section>
}
