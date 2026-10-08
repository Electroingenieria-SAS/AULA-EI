import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, RefreshCw, Target } from 'lucide-react'
import LearningGame from '../games/LearningGame.jsx'
import { rankedReviewRounds } from './intelligence-model.js'

export default function AdaptivePanel({ groups, courseId, practice, onResult }) {
  const [index, setIndex] = useState(0)
  const [completedThisRound, setCompletedThisRound] = useState(false)
  const rounds = useMemo(() => rankedReviewRounds(groups, practice), [groups, practice])
  const current = rounds[index % rounds.length]
  useEffect(() => { setIndex(0); setCompletedThisRound(false) }, [courseId])
  const next = () => { setIndex((value) => value + 1); setCompletedThisRound(false) }
  return <section className="intelligence-panel" aria-labelledby="adaptive-title">
    <header className="intelligence-panel-heading"><span><BrainCircuit size={23}/></span>
      <div><small>02 · REPASO PERSONALIZADO</small><h2 id="adaptive-title">Entrenamiento adaptativo</h2>
        <p>Empieza por las dinámicas en las que más te equivocaste. Las rondas nuevas también tienen prioridad sobre las que ya dominas.</p></div>
    </header>
    {current ? <div className="intelligence-adaptive-content">
      <div className="intelligence-training-status">
        <div><small>RECOMENDACIÓN ACTUAL · {Math.min(index+1,rounds.length)} DE {rounds.length}</small>
          <strong>{current.title}</strong><span>{current.practice?.mistakes ? 'Tema para reforzar · ' + current.practice.mistakes + ' errores registrados' : 'Tema disponible para practicar'}</span></div>
        <button type="button" onClick={next}><RefreshCw size={17}/> Cambiar ronda</button>
      </div>
      <LearningGame key={courseId + ':' + current.id + ':' + index}
        content={current.content} title={current.title} onResult={(result) => {
          if (completedThisRound || !result.success) return
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
