import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import LearnerShell from './LearnerShell.jsx'
import HomePage from './HomePage.jsx'

const loadStudioApp = () => import('../../studio/src/App.jsx')
const loadCatalogPage = () => import('./CatalogPage.jsx')
const loadCoursePlayer = () => import('./CoursePlayer.jsx')
const loadGamesPage = () => import('./GamesPage.jsx')

const StudioApp = lazy(loadStudioApp)
const CatalogPage = lazy(loadCatalogPage)
const CoursePlayer = lazy(loadCoursePlayer)
const GamesPage = lazy(loadGamesPage)

function readRoute() {
  const hash = window.location.hash || '#/'
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  if (/^#\/catalog(?:\/|$)/.test(hash)) return { key: 'catalog', type: 'catalog' }
  if (/^#\/games(?:\/|$)/.test(hash)) return { key: 'games', type: 'games' }
  if (/^#\/studio(?:\/|$)/.test(hash)) return { key: 'studio', type: 'studio' }
  return { key: 'home', type: 'home' }
}

export default function LearnerApp({ profile, sessionUser }) {
  const [route, setRoute] = useState(() => readRoute())

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
      void loadCatalogPage()
      void loadGamesPage()
      if (['creador_contenido', 'revisor', 'admin', 'super_admin'].includes(String(profile?.role || ''))) {
        void loadStudioApp()
      }
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
    if (route.type === 'catalog') void loadCatalogPage()
    if (route.type === 'games') void loadGamesPage()
    if (route.type === 'studio') void loadStudioApp()
  }, [route.type])

  const content = useMemo(() => {
    if (route.type === 'course') return <CoursePlayer suppliedSessionUser={sessionUser} />
    if (route.type === 'catalog') return <CatalogPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'games') return <GamesPage />
    if (route.type === 'studio') return <StudioApp embedded initialProfile={profile} />
    return <HomePage profile={profile} sessionUser={sessionUser} />
  }, [route.key, route.type, profile, sessionUser])

  return <LearnerShell activeRoute={route.type} profile={profile}>
    <div className="learner-route-transition" key={route.key}>
      <span className="experience-route-progress" aria-hidden="true" />
      <Suspense fallback={<RouteLoading route={route.type} />}>{content}</Suspense>
    </div>
  </LearnerShell>
}

function RouteLoading({ route }) {
  const label = route === 'studio'
    ? 'Abriendo Gestión Aula EI…'
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
