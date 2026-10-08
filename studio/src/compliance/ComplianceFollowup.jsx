import React from 'react'
import { AlertTriangle, ArrowRight, ClipboardCheck, Clock3, ShieldCheck, Users } from 'lucide-react'
import { prioritizedComplianceFollowups } from './followup-model.js'
import '../styles/compliance-followup.css'

export default function ComplianceFollowup({ rows, onFocus }) {
  const people = prioritizedComplianceFollowups(rows)
  return <section className="compliance-followup" aria-labelledby="compliance-followup-title">
    <header className="compliance-followup-head">
      <span className="compliance-followup-icon"><ClipboardCheck size={22}/></span>
      <div><small>FASE 7.3 · SEGUIMIENTO INSTITUCIONAL</small>
        <h3 id="compliance-followup-title">Casos que requieren acompañamiento</h3>
        <p>Resumen de personas con requisitos pendientes, elaborado únicamente con la matriz administrativa que tienes autorizada.</p>
      </div>
    </header>
    <div className="compliance-followup-body">
      {people.length ? <div className="compliance-followup-list">
        {people.map((person) => <article key={person.id} className="compliance-followup-person">
          <span className="compliance-followup-avatar"><Users size={19}/></span>
          <div className="compliance-followup-copy">
            <strong>{person.name}</strong><small>{person.position}</small>
            <div className="compliance-followup-flags">
              {person.critical > 0 && <span className="is-critical"><AlertTriangle size={13}/>{person.critical} vencidos</span>}
              {person.soon > 0 && <span className="is-soon"><Clock3 size={13}/>{person.soon} por vencer</span>}
              {person.pending > 0 && <span>{person.pending} pendientes</span>}
            </div>
            <p>{person.cases.slice(0,2).map((item) => item.course).join(' · ')}</p>
          </div>
          <button type="button" onClick={() => onFocus(person.email || person.name)}
            aria-label={'Filtrar matriz para ' + person.name}>
            Ver casos <ArrowRight size={16}/>
          </button>
        </article>)}
      </div> : <div className="compliance-followup-empty"><ShieldCheck size={26}/>
        <strong>Sin casos prioritarios en el filtro actual</strong>
        <p>Selecciona otro filtro o actualiza la información para revisar más requisitos.</p>
      </div>}
    </div>
    <p className="compliance-followup-footnote">
      Uso exclusivo de gestión autorizada. Esta vista no asigna responsables, sanciones ni conclusiones sobre el desempeño de las personas.
    </p>
  </section>
}
