import React, { useEffect, useMemo, useState } from 'react'
import StudioApp from '../../studio/src/App.jsx'
import CatalogPage from './CatalogPage.jsx'
import CoursePlayer from './CoursePlayer.jsx'
import GamesPage from './GamesPage.jsx'
import HomePage from './HomePage.jsx'
import LearnerShell from './LearnerShell.jsx'

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
      {content}
    </div>
  </LearnerShell>
}
