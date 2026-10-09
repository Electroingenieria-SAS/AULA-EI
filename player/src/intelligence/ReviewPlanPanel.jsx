import React from 'react'
import { ArrowRight, BookOpenCheck, BrainCircuit, CalendarClock, CheckCircle2, Clock3, ShieldCheck, Target } from 'lucide-react'
import { buildCoachCoursePlan, scheduleReviewRounds, summarizeReview } from './adaptive-coach-model.js'
import { rankedReviewRounds } from './intelligence-model.js'
import '../styles/adaptive-coach.css'

const count = number => Number(number || 0).toLocaleString('es-CO')
function sourceLabel(item) {
  if (item.kind==='overdue') return 'VENCIDA'
  if (item.kind==='due') return 'PRÓXIMA A VENCER'
  if (item.errors) return 'REFORZAR PRÁCTICA'
  if (item.kind==='route') return 'RUTA ASIGNADA'
  return 'DISPONIBLE'
}

export default function ReviewPlanPanel({enrollments=[],development,practice,groups=[],selected,courseReady=false,onPractice}) {
  const recommendations=buildCoachCoursePlan(enrollments,development,practice)
  const currentPractice=practice?.courses?.[selected]||{}
  const rounds=courseReady ? scheduleReviewRounds(rankedReviewRounds(groups,currentPractice)) : []
  const summary=summarizeReview(rounds)
  const next=rounds.find(round=>round.review?.due) || null
  return <section className="intelligence-panel coach93-panel" aria-labelledby="coach93-title">
    <header className="intelligence-panel-heading">
      <span><BrainCircuit size={23}/></span>
      <div><small>00 · TU GUÍA DE REFUERZO</small><h2 id="coach93-title">Plan personal de aprendizaje</h2>
        <p>Organiza lo que debes atender y tus repasos recomendados con señales de tus rutas institucionales y de las prácticas que hiciste en este navegador.</p>
      </div>
    </header>
    <div className="coach93-body">
      <div className="coach93-summary" aria-label="Estado de repaso de la capacitación seleccionada">
        <article><BookOpenCheck size={20}/><small>Capacitaciones disponibles</small><strong>{count(recommendations.length)}</strong></article>
        <article><Target size={20}/><small>Rondas para repasar ahora</small><strong>{count(summary.due)}</strong></article>
        <article><CheckCircle2 size={20}/><small>Rondas con buena racha</small><strong>{summary.masteredPercent===null?'—':summary.masteredPercent+'%'}</strong></article>
      </div>
      {next && <div className="coach93-next" role="status">
        <div className="coach93-next-icon"><Target size={20}/></div>
        <div><small>REFUERZO SUGERIDO PARA TU CAPACITACIÓN SELECCIONADA</small>
          <strong>{next.title}</strong><p>{next.review.reason} La recomendación se basa únicamente en tus intentos de práctica, no en calificaciones oficiales.</p>
        </div>
        <button type="button" onClick={()=>onPractice(selected)} disabled={!courseReady}>
          Practicar ahora <ArrowRight size={16}/>
        </button>
      </div>}
      <div className="coach93-list-head">
        <div><h3>Qué estudiar primero</h3>
          <p>Las fechas vencidas tienen prioridad, después los repasos con errores recientes. Ningún contenido bloqueado se desbloquea desde aquí.</p></div>
        <span>{recommendations.length} sugerencia(s)</span>
      </div>
      {recommendations.length ? <ol className="coach93-list">{recommendations.map((item,index)=><li key={item.courseId}>
        <span className="coach93-index">{String(index+1).padStart(2,'0')}</span>
        <div className="coach93-item-text"><span className="coach93-type">{sourceLabel(item)}</span>
          <strong>{item.title}</strong><p>{item.reason}</p>
          {item.reviewedRounds>0 && <small>{count(item.reviewedRounds)} ronda(s) practicadas aquí · {count(item.errors)} por reforzar · {count(item.masteredRounds)} con buena racha</small>}
        </div>
        <button type="button" onClick={()=>onPractice(item.courseId)}>
          <span>Ir al repaso</span><ArrowRight size={16}/>
        </button>
      </li>)}</ol>:<div className="coach93-empty">
        <BookOpenCheck size={28}/><strong>No hay capacitaciones disponibles para recomendar</strong>
        <p>Consulta tu catálogo y verifica tus matrículas. Cuando tengas materiales estudiados, podrás practicar sin afectar tus evaluaciones.</p>
      </div>}
      <div className="coach93-method">
        <ShieldCheck size={18}/><div><strong>Recomendaciones explicables, sin IA externa</strong>
          <p>La prioridad usa fechas y rutas que ya tienes asignadas, junto con contadores locales de errores y rachas. No consulta bancos de preguntas, no estima notas de examen y no modifica certificados ni registros de cumplimiento.</p>
          <p><Clock3 size={13}/> Los repasos espaciados son sugerencias, no obligaciones: 1, 3, 7 o 14 días según la racha de práctica.</p>
        </div>
      </div>
    </div>
  </section>
}
