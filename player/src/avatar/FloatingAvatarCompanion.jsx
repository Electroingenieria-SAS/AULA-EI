import React, { useEffect, useState } from 'react'
import { Minus, MessageCircle, X } from 'lucide-react'
import AvatarFigure from './AvatarFigure.jsx'

// Restrict the companion to browsing/learning overview screens. No exams,
// authoring forms, legal acceptance, games or avatar editing are covered.
export const COMPANION_ROUTES = Object.freeze(['home', 'catalog', 'development', 'plan'])

function sessionValue(key) {
  try { return window.sessionStorage.getItem(key) } catch { return null }
}

function writeSessionValue(key, value) {
  try { window.sessionStorage.setItem(key, value) } catch {}
}

export default function FloatingAvatarCompanion({ profile, route, suppressed = false }) {
  const userId = String(profile?.id || '')
  const compactKey = 'aula-ei-companion-compact:' + userId
  const greetingKey = 'aula-ei-companion-greeted:' + userId
  const firstName = String(profile?.full_name || 'compañero').trim().split(/\s+/)[0] || 'compañero'
  const fallback = firstName.slice(0, 2).toUpperCase()
  const [compact, setCompact] = useState(() => {
    const preference = sessionValue(compactKey)
    return preference === '1' || (preference === null && window.matchMedia('(max-width:900px)').matches)
  })
  const [greetingVisible, setGreetingVisible] = useState(false)
  const allowed = COMPANION_ROUTES.includes(route) && !suppressed && Boolean(userId)

  useEffect(() => {
    if (!allowed || compact || sessionValue(greetingKey) === '1' || window.matchMedia('(max-width:900px)').matches) return
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      setGreetingVisible(true)
      writeSessionValue(greetingKey, '1')
    }, 1900)
    return () => window.clearTimeout(timer)
  }, [allowed, compact, greetingKey])

  useEffect(() => {
    if (!greetingVisible) return
    const timer = window.setTimeout(() => setGreetingVisible(false), 5600)
    return () => window.clearTimeout(timer)
  }, [greetingVisible])

  useEffect(() => {
    if (!allowed) setGreetingVisible(false)
  }, [allowed])

  if (!allowed) return null

  const minimize = () => {
    setCompact(true)
    setGreetingVisible(false)
    writeSessionValue(compactKey, '1')
  }
  const greet = () => {
    if (compact) {
      setCompact(false)
      writeSessionValue(compactKey, '0')
    }
    setGreetingVisible((current) => !current || compact)
    writeSessionValue(greetingKey, '1')
  }

  return <aside className={`ei-companion-dock${compact ? ' is-compact' : ''}`} aria-label="Mi compañero de Aula EI">
    {!compact && greetingVisible && <div className="ei-companion-dock__bubble" id="ei-companion-greeting">
      <strong>¡Hola, {firstName}! <span aria-hidden="true">👋</span></strong>
      <span>¡Qué bueno verte por aquí!</span>
      <button type="button" onClick={() => setGreetingVisible(false)} aria-label="Ocultar saludo"><X size={14}/></button>
    </div>}
    <div className="ei-companion-dock__stage">
      {!compact && <span className="ei-companion-dock__wave" aria-hidden="true">👋</span>}
      <button
        type="button"
        className="ei-companion-dock__portrait"
        onClick={greet}
        aria-label={compact ? 'Mostrar mi compañero de Aula EI' : 'Saludar a mi compañero de Aula EI'}
        aria-expanded={!compact && greetingVisible}
        title={compact ? 'Mostrar mi compañero' : 'Saludar'}
      >
        <AvatarFigure avatarUrl={profile?.avatar_url} fallback={fallback} className="ei-companion-dock__figure"/>
        {compact && <MessageCircle className="ei-companion-dock__mini-icon" size={14} aria-hidden="true"/>}
      </button>
      {!compact && <button type="button" className="ei-companion-dock__minimize" onClick={minimize}
        aria-label="Minimizar mi compañero" title="Minimizar mi compañero"><Minus size={15} aria-hidden="true"/></button>}
    </div>
  </aside>
}
