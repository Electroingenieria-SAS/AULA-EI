import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, RefreshCw, Target } from 'lucide-react'
import LearningGame from '../games/LearningGame.jsx'
import { rankedReviewRounds } from './intelligence-model.js'
import { scheduleReviewRounds, summarizeReview } from './adaptive-coach-model.js'
import { CheckCircle2, Clock3 } from 'lucide-react'

export default function AdaptivePanel({ groups, courseId, practice, onResult }) {
  const [run, setRun] = useState(0)
  const [completedThisRound, setCompletedThisRound] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const rounds = useMemo(() => scheduleReviewRounds(rankedReviewRounds(groups, practice)), [groups, practice])
  const summary = useMemo(() => summarizeReview(rounds), [rounds])
  const current = rounds.find((item) => item.id === activeId) || rounds[0]
  const position = Math.max(0, rounds.findIndex((item) => item.id === current?.id))
  useEffect(() => { setRun(0); setCompletedThisRound(false); setActiveId(null) }, [courseId])
  const next = () => {
    setActiveId(rounds.length ? rounds[(position + 1) % rounds.length].id : null)
    setRun((value) => value + 1)
    setCompletedThisRound(false)
  }
  return <section className="intelligence-panel" aria-labelledby="adaptive-title">
    <header className="intelligence-panel-heading"><span><BrainCircuit size={23}/></span>
      <div><small>02 · REPASO PERSONALIZADO</small><h2 id="adaptive-title">Entrenamiento adaptativo</h2>
        <p>Empieza por las dinámicas en las que más te equivocaste. Las rondas nuevas también tienen prioridad sobre las que ya dominas.</p></div>
    </header>
    <div className="coach93-adaptive-summary" aria-label="Estado de repaso de esta capacitación">
      <span className="coach93-due"><Clock3 size={16}/> {summary.due} rondas sugeridas para repasar</span>
      <span className="coach93-mastered"><CheckCircle2 size={16}/> {summary.mastered} con buena racha de {summary.total}</span>
      <p>La prioridad considera los errores de la última práctica y intervalos estimados de 1, 3, 7 o 14 días. Puedes practicar cualquier ronda cuando quieras.</p>
    </div>
    {current ? <div className="intelligence-adaptive-content">
      <div className="intelligence-training-status">
        <div><small>RECOMENDACIÓN ACTUAL · {Math.min(position+1,rounds.length)} DE {rounds.length}</small>
          <strong>{current.title}</strong><span>{current.review?.due ? 'Repaso sugerido ahora' : 'Ronda disponible para consolidar'}</span>
          <small className="coach93-now-reason">{current.review?.reason}</small>
          <div className="intelligence-round-progress" role="progressbar" aria-label="Avance por rondas disponibles"
            aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={Math.min(position+1,rounds.length)}>
            <i style={{width:(100*(position+1)/rounds.length)+'%'}}/>
          </div></div>
        <button type="button" onClick={next}><RefreshCw size={17}/> Cambiar ronda</button>
      </div>
      <LearningGame key={courseId + ':' + current.id + ':' + run}
        content={current.content} title={current.title} onResult={(result) => {
          if (completedThisRound || !result.success) return
          setActiveId(current.id)
          setCompletedThisRound(true)
          onResult?.(current.id,result)
        }}/>
      {completedThisRound && <div className="intelligence-success" role="status">
        <Target size={19}/><span>Ronda completada. Registramos solo un contador local para preparar tu próximo repaso.</span>
        <button type="button" onClick={next}>Siguiente <ArrowRight size={16}/></button>
      </div>}
    </div> : <div className="intelligence-empty"><BrainCircuit size={28}/>
      <strong>No hay rondas disponibles todavía</strong>
      <p>Completa bloques con descripciones suficientes o actividades creadas por tu instructor para activar este entrenamiento.</p>
    </div>}
  </section>
}
