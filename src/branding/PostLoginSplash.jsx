import React, { useEffect, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { assetUrl } from '../paths.js'
import './developer-branding.css'

/**
 * One-time experience after explicit login, only after profile/legal/MFA gates.
 * This view neither authorizes access nor persists any private information.
 */
export default function PostLoginSplash({ onComplete }) {
  const finish = useRef(onComplete)
  finish.current = onComplete
  useEffect(() => {
    const timeout = window.setTimeout(() => finish.current(), 1250)
    return () => window.clearTimeout(timeout)
  }, [])

  return <main className="dev-splash" role="status" aria-live="polite" aria-label="Accediendo a Aula EI">
    <div className="dev-splash-orbit" aria-hidden="true" />
    <div className="dev-splash-card">
      <span className="dev-splash-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> Acceso autorizado · Aula EI</span>
      <img className="dev-splash-logo"
        src={assetUrl('brand/developer/juan-perez-primary-blue.webp')}
        alt="Juan E. Pérez desarrollos, identidad de créditos de software" width="135" height="240" />
      <h1>Bienvenido a Aula EI</h1>
      <p>Tu espacio de aprendizaje está listo.</p>
      <div className="dev-splash-progress" aria-hidden="true"><span/></div>
      <small>Una experiencia de Electroingeniería S.A.S. · Créditos de desarrollo: Juan E. Pérez</small>
    </div>
  </main>
}
