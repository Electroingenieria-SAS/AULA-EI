import React, { useEffect, useMemo, useState } from 'react'
import StudioApp from '../../studio/src/App.jsx'
import CatalogPage from './CatalogPage.jsx'
import CoursePlayer from './CoursePlayer.jsx'
import GamesPage from './GamesPage.jsx'
import HomePage from './HomePage.jsx'
import LearnerShell from './LearnerShell.jsx'
import LearningJourneyPage from './LearningJourneyPage.jsx'
import { supabase } from './supabase.js'
import { startAulaTelemetry } from './telemetry.js'

function readRoute() {
  const hash = window.location.hash || '#/'
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  if (/^#\/catalog(?:\/|$)/.test(hash)) return { key: 'catalog', type: 'catalog' }
  if (/^#\/journey(?:\/|$)/.test(hash)) return { key: 'journey', type: 'journey' }
  if (/^#\/games(?:\/|$)/.test(hash)) return { key: 'games', type: 'games' }
  if (/^#\/studio(?:\/|$)/.test(hash)) return { key: 'studio', type: 'studio' }
  return { key: 'home', type: 'home' }
}

export default function LearnerApp() {
  const [route, setRoute] = useState(() => readRoute())
  const [profile, setProfile] = useState(null)
  const [sessionUser, setSessionUser] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => startAulaTelemetry(supabase), [])

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
    let alive = true
    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session?.user) {
          window.location.replace('/#/login')
          return
        }

        if (alive) setSessionUser(data.session.user)

        // Formación 360 usa este pulso para rachas e inactividad. Si la migración
        // todavía no existe, el error se ignora para mantener compatibilidad.
        supabase.rpc('touch_learning_activity').catch(() => {})

        const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile')
        if (profileError) throw profileError
        const value = Array.isArray(profileData) ? profileData[0] : profileData
        if (alive && value) setProfile(value)
      } catch {
        if (alive) setProfile(null)
      } finally {
        if (alive) setSessionReady(true)
      }
    })()

    return () => { alive = false }
  }, [])

  const content = useMemo(() => {
    if (!sessionReady) return <ModuleLoading label="Preparando Aula EI…" />
    if (route.type === 'course') return <CoursePlayer suppliedSessionUser={sessionUser} />
    if (route.type === 'catalog') return <CatalogPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'journey') return <LearningJourneyPage profile={profile} sessionUser={sessionUser} />
    if (route.type === 'games') return <GamesPage />
    if (route.type === 'studio') {
      return profile
        ? <StudioApp embedded initialProfile={profile} />
        : <ModuleLoading label="Validando Gestión Aula EI…" />
    }
    return <HomePage profile={profile} sessionUser={sessionUser} />
  }, [route.key, route.type, profile, sessionReady, sessionUser])

  return <LearnerShell activeRoute={route.type} profile={profile}>
    <div className="learner-route-transition" key={route.key}>
      <span className="experience-route-progress" aria-hidden="true" />
      {content}
    </div>
  </LearnerShell>
}

function ModuleLoading({ label }) {
  return <section className="global-module-loading" aria-live="polite" aria-busy="true">
    <div className="experience-loading-mark" aria-hidden="true"><i /><i /><i /></div>
    <strong>{label}</strong>
    <span>Estamos preparando el contenido sin recargar la navegación.</span>
    <div className="experience-loading-skeleton" aria-hidden="true">
      <i className="wide" /><i /><i /><i />
    </div>
  </section>
}
