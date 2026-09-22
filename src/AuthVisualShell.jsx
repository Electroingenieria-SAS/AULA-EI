import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { assetUrl } from './paths.js'

export default function AuthVisualShell({
  children,
  title = 'Formación que se siente moderna, clara y segura.',
  description = 'Aula EI reúne capacitaciones, evaluaciones, certificados y rutas de aprendizaje en una experiencia visual pensada para trabajar rápido desde computador o celular.',
  overline = 'Aprendizaje que deja evidencia',
  panelClassName = '',
}) {
  return <main
    className="auth-page"
    style={{ '--auth-photo': `url("${assetUrl('brand/fondo.jpg')}")` }}
  >
    <div className="auth-backdrop" aria-hidden="true">
      <span className="auth-orb auth-orb-one" />
      <span className="auth-orb auth-orb-two" />
      <span className="auth-orb auth-orb-three" />
      <span className="auth-grid-glow" />
    </div>

    <section className="auth-hero-clean">
      <div className="auth-brand-row">
        <div className="auth-brand-card">
          <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
        </div>
        <span className="auth-kicker">Academia interna · Electroingeniería</span>
      </div>

      <div className="auth-copy">
        <span className="auth-overline">{overline}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="auth-feature-row" aria-label="Características principales">
        <span><strong>01</strong><small>Rutas y competencias</small></span>
        <span><strong>02</strong><small>Certificación trazable</small></span>
        <span><strong>03</strong><small>Seguridad con RLS + MFA</small></span>
      </div>
    </section>

    <section className={'auth-panel-clean' + (panelClassName ? ' ' + panelClassName : '')}>
      {children}
    </section>
  </main>
}

export function AuthPanelBrand({ secureLabel = 'Acceso protegido' }) {
  return <div className="auth-panel-brand">
    <img className="company-logo" src={assetUrl('brand/logo-electroingenieria.jpg')} alt="Electroingeniería" />
    <span className="auth-panel-badge"><ShieldCheck size={15} /> {secureLabel}</span>
  </div>
}
