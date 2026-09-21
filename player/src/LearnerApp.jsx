import React, { useEffect, useMemo, useState } from 'react'
import CatalogPage from './CatalogPage.jsx'
import CoursePlayer from './CoursePlayer.jsx'
import LearnerShell from './LearnerShell.jsx'
import { supabase } from './supabase.js'

function readRoute() {
  const hash = window.location.hash || '#/catalog'
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  return { key: 'catalog', type: 'catalog' }
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

  const content = useMemo(
    () => route.type === 'course' ? <CoursePlayer /> : <CatalogPage profile={profile} />,
    [route.key, route.type, profile],
  )

  return <LearnerShell activeRoute={route.type} profile={profile}>
    <div className="learner-route-transition" key={route.key}>{content}</div>
  </LearnerShell>
}
