import React, { useEffect, useMemo, useState } from 'react'
import CatalogPage from './CatalogPage.jsx'
import CoursePlayer from './CoursePlayer.jsx'
import GamesPage from './GamesPage.jsx'
import HomePage from './HomePage.jsx'
import LearnerShell from './LearnerShell.jsx'
import StudioFrame from './StudioFrame.jsx'
import { supabase } from './supabase.js'

function readRoute() {
  const hash = window.location.hash || '#/'
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  if (/^#\/catalog(?:\/|$)/.test(hash)) return { key: 'catalog', type: 'catalog' }
  if (/^#\/games(?:\/|$)/.test(hash)) return { key: 'games', type: 'games' }
  if (/^#\/studio(?:\/|$)/.test(hash)) return { key: 'studio', type: 'studio' }
  return { key: 'home', type: 'home' }
}

export default function LearnerApp() {
  const [route, setRoute] = useState(() => readRoute())
  const [profile, setProfile] = useState(null)

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
    supabase.rpc('get_my_profile').then(({ data, error }) => {
      if (!alive || error) return
      const value = Array.isArray(data) ? data[0] : data
      if (value) setProfile(value)
    })
    return () => { alive = false }
  }, [])

  const content = useMemo(() => {
    if (route.type === 'course') return <CoursePlayer />
    if (route.type === 'catalog') return <CatalogPage profile={profile} />
    if (route.type === 'games') return <GamesPage />
    if (route.type === 'studio') return <StudioFrame />
    return <HomePage profile={profile} />
  }, [route.key, route.type, profile])

  return <LearnerShell activeRoute={route.type} profile={profile}>
    <div className="learner-route-transition" key={route.key}>{content}</div>
  </LearnerShell>
}
