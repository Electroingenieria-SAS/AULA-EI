import React from 'react'
import { ArrowRight, Compass, GraduationCap, ShieldCheck, Target } from 'lucide-react'
import { navigateLearner, openLearnerCourse } from '../navigation.js'
import { recommendedLearning } from './intelligence-model.js'

export default function RoutesPanel({ development }) {
  const suggestions = recommendedLearning(development)
  const gaps = development?.competencies?.filter((item) => item.gap > 0) || []
  return <section className="intelligence-panel" aria-labelledby="paths-title">
    <header className="intelligence-panel-heading"><span><Compass size={23}/></span>
      <div><small>04 · SIGUIENTE PASO</small><h2 id="paths-title">Rutas recomendadas para ti</h2>
        <p>Prioridad por vencimientos y los siguientes cursos habilitados en tus rutas asignadas, sin liberar contenidos bloqueados.</p></div>
    </header>
    <div className="intelligence-routes-body">
      {gaps.length > 0 && <aside className="intelligence-skills-summary">
        <Target size={18}/><div><strong>{gaps.length} competencia(s) por fortalecer</strong>
          <p>{gaps.slice(0,3).map((item) => item.name).join(' · ')}</p>
          <small>Las brechas proceden de tu perfil institucional; no asumimos que un curso específico las resuelva sin una asociación explícita.</small></div>
      </aside>}
      {suggestions.length ? <ol className="intelligence-recommendations">{suggestions.map((item,i) =>
        <li key={item.courseId}>
          <span>{String(i+1).padStart(2,'0')}</span>
          <div><strong>{item.title}</strong><small>{item.reason}</small></div>
          <button type="button" onClick={() => openLearnerCourse(item.courseId)}>
            Abrir <ArrowRight size={16}/></button>
        </li>)}</ol> : <div className="intelligence-empty"><GraduationCap size={26}/>
        <strong>Tu ruta no tiene pendientes habilitados</strong>
        <p>Consulta tus capacitaciones o solicita al área de formación una nueva asignación.</p></div>}
      <button className="intelligence-text-action" type="button" onClick={() => navigateLearner('/development')}>
        <ShieldCheck size={16}/> Ver mapa de competencias y rutas oficiales <ArrowRight size={16}/>
      </button>
    </div>
  </section>
}
