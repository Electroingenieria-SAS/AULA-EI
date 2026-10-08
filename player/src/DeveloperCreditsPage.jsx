import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Code2, ExternalLink, Layers3, ShieldCheck } from 'lucide-react'
import { assetUrl, navigateLearner } from './navigation.js'
import './styles/developer-credits.css'

export default function DeveloperCreditsPage() {
  const [expanded, setExpanded] = useState(false)

  return <main className="dev-credits-page">
    <header className="dev-credits-heading">
      <button type="button" onClick={() => navigateLearner('/privacy')}><ArrowLeft size={17}/> Volver</button>
      <span><BadgeCheck size={16}/> Información y créditos de desarrollo</span>
    </header>

    <section className="dev-credit-showcase" aria-labelledby="dev-credit-heading">
      <div className="dev-credit-intro">
        <span className="dev-credit-overline"><Code2 size={17}/> IDENTIDAD DE DESARROLLO</span>
        <h1 id="dev-credit-heading">Las personas detrás de las soluciones.</h1>
        <p>Conoce el reconocimiento de las contribuciones de diseño, desarrollo e integración vinculadas a Aula EI, sin desplazar la identidad institucional de Electroingeniería.</p>
        <div className="dev-credit-feature-list">
          <span><Layers3 size={17}/> Diseño e integración</span>
          <span><Code2 size={17}/> Desarrollo de software</span>
          <span><ShieldCheck size={17}/> Autoría de aportes verificables</span>
        </div>
      </div>

      <div className="dev-credit-flip-region">
        <div className={'dev-credit-card ' + (expanded ? 'is-open' : '')}>
          <div className="dev-credit-card-art">
            <img src={assetUrl('brand/developer/juan-perez-secondary-blue.webp')}
              alt="Identidad visual Juan E. Pérez desarrollos: mapache programador y llama azul"
              width="109" height="210" loading="lazy" />
          </div>
          <div className="dev-credit-card-body">
            <span className="dev-credit-card-label">CRÉDITOS DE DESARROLLO</span>
            <h2>Juan E. Pérez</h2>
            <p>Software y soluciones digitales</p>
            {expanded && <div className="dev-credit-card-details" id="dev-credit-details">
              <strong>Reconocimiento de contribuciones</strong>
              <p>Crédito por las contribuciones de diseño, programación, arquitectura, integración y mejora de software que correspondan a su participación efectiva y verificable.</p>
              <small>El reconocimiento de derechos morales de autoría no determina por sí solo la titularidad ni cesión de derechos patrimoniales.</small>
            </div>}
            <button type="button" aria-expanded={expanded} aria-controls="dev-credit-details"
              onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Ocultar detalles' : 'Ver contribuciones y atribución'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer className="dev-credit-footer">
      <p><strong>Aula EI</strong> es una plataforma institucional de Electroingeniería S.A.S. La atribución identifica aportes del desarrollador sin sustituir los acuerdos de propiedad intelectual ni atribuir obras de terceros.</p>
      <a href="https://www.derechodeautor.gov.co/es/registro-de-software" target="_blank" rel="noopener noreferrer">
        Información oficial sobre registro de software <ExternalLink size={15}/>
      </a>
    </footer>
  </main>
}
