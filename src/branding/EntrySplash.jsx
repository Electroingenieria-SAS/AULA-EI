import React, { useEffect, useRef } from 'react'
import { assetUrl } from '../paths.js'
import './developer-branding.css'

/** Intro to the PUBLIC login only. Never authorizes a user or bypasses legal/MFA gates. */
export default function EntrySplash({ onComplete }) {
  const finish = useRef(onComplete)
  finish.current = onComplete

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const timer = window.setTimeout(() => finish.current(), reducedMotion ? 250 : 1450)
    return () => window.clearTimeout(timer)
  }, [])

  return <main className="dev-splash" role="status" aria-live="polite" aria-label="Abriendo el acceso de Aula EI">
    <div className="dev-splash-orbit" aria-hidden="true" />
    <div className="dev-splash-card">
      <span className="dev-splash-eyebrow">ELECTROINGENIERÍA · ACADEMIA INTERNA</span>
      <img className="dev-splash-logo"
        src={assetUrl('brand/developer/juan-perez-primary-blue.webp')}
        alt="Logo de desarrollos Juan E. Pérez" width="135" height="240" />
      <h1>Una nueva forma de aprender.</h1>
      <p>Preparando tu acceso a Aula EI…</p>
      <div className="dev-splash-progress" aria-hidden="true"><span/></div>
      <small>Identidad institucional de Aula EI · Créditos de desarrollo: Juan E. Pérez</small>
    </div>
  </main>
}
