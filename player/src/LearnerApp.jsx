import React, { useEffect, useMemo, useState } from 'react'
import CatalogPage from './CatalogPage.jsx'
import CoursePlayer from './CoursePlayer.jsx'

function readRoute() {
  const hash = window.location.hash || '#/catalog'
  const courseMatch = hash.match(/^#\/course\/([^/?#]+)/)
  if (courseMatch?.[1]) return { key: 'course:' + courseMatch[1], type: 'course' }
  return { key: 'catalog', type: 'catalog' }
}

export default function LearnerApp() {
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

  const content = useMemo(() => route.type === 'course' ? <CoursePlayer /> : <CatalogPage />, [route.key, route.type])

  return <div className="learner-route-transition" key={route.key}>{content}</div>
}
