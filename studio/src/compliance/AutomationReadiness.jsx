import React, { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, LockKeyhole, RefreshCw, Route, Users } from 'lucide-react'
import '../styles/automation-readiness.css'

export default function AutomationReadiness({ readiness, onNavigate, onSync, syncing }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => { setAcknowledged(false) }, [readiness])

  const { counts, missing, preview, ready } = readiness
  const visible = showAll ? preview : preview.slice(0, 8)
  return <section className="auto91" aria-labelledby="auto91-title">
    <header className="auto91-header">
      <div className="auto91-icon"><Route size={23} /></div>
      <div>
        <span className="eyebrow">FASE 9.1 · SIMULACIÓN SIN CAMBIOS</span>
        <h3 id="auto91-title">Antes de asignar, revisa el impacto.</h3>
        <p>La simulación utiliza cargos, rutas y cursos ya cargados. No matricula estudiantes ni modifica vencimientos.</p>
      </div>
      <span className={'auto91-state ' + (ready ? 'is-ready' : 'is-pending')}>
        {ready ? <CheckCircle2 size={15}/> : <AlertTriangle size={15}/>}
        {ready ? 'Lista para revisar' : 'Configuración incompleta'}
      </span>
    </header>

    <div className="auto91-stats" aria-label="Cobertura formativa estimada">
      <div><Users size={18}/><small>Personas con cargo</small><strong>{counts.positioned}<span>/{counts.activePeople}</span></strong></div>
      <div><Route size={18}/><small>Personas con cursos</small><strong>{counts.linkedPeople}</strong></div>
      <div><ClipboardList size={18}/><small>Pares persona-curso</small><strong>{counts.candidatePairs}</strong></div>
      <div><CheckCircle2 size={18}/><small>Reglas activas</small><strong>{counts.activeRules}</strong></div>
    </div>

    {missing.length > 0 && <div className="auto91-missing" role="status">
      <strong><AlertTriangle size={17}/> Antes de ejecutar, completa estos pasos</strong>
      {missing.map(item => <div className="auto91-step" key={item.code}>
        <p>{item.message}</p>
        <button type="button" onClick={() => onNavigate(item.section)}>
          {item.action} <ArrowRight size={15}/>
        </button>
      </div>)}
    </div>}

    <div className="auto91-preview">
      <div className="auto91-preview-heading">
        <div><h4>Vista previa por colaborador</h4>
          <p>El motor oficial verifica secuencia, matrículas previas y evidencia antes de decidir cada cambio.</p></div>
        <span>{counts.candidatePairs} coincidencias potenciales</span>
      </div>
      {visible.length ? <div className="auto91-people">
        {visible.map(person => <article key={person.userId}>
          <div className="auto91-person-title"><strong>{person.name}</strong><span>{person.position}</span></div>
          {person.courses.length ? <div className="auto91-person-courses">
            {person.courses.slice(0,4).map(course => <span key={course.id}>{course.title}</span>)}
            {person.courses.length > 4 && <span>+{person.courses.length-4} adicionales</span>}
          </div> : <small>Sin capacitaciones vinculadas mediante una ruta obligatoria.</small>}
          <b>{person.courses.length} posible(s)</b>
        </article>)}
      </div> : <div className="auto91-empty">Aún no existen colaboradores activos con cargo para simular asignaciones.</div>}
      {preview.length > 8 && <button type="button" className="auto91-show" onClick={() => setShowAll(value => !value)}>
        {showAll ? 'Mostrar menos' : 'Ver todos los colaboradores ('+preview.length+')'}
      </button>}
      {counts.peopleWithoutPosition > 0 && <p className="auto91-footnote">
        {counts.peopleWithoutPosition} persona(s) activa(s) sin cargo quedan fuera de la simulación.
      </p>}
      {counts.matrixMissing > 0 && <p className="auto91-footnote">
        La matriz de cumplimiento informa {counts.matrixMissing} requisito(s) sin matrícula. Esta cifra no garantiza que todos estén desbloqueados.
      </p>}
    </div>

    <div className="auto91-confirm">
      <label>
        <input type="checkbox" checked={acknowledged} onChange={event=>setAcknowledged(event.target.checked)} disabled={!ready || syncing}/>
        <span>He revisado las asignaciones potenciales. Entiendo que el motor aplica permisos, evita duplicados y solo habilita requisitos desbloqueados.</span>
      </label>
      <button className="primary-button" type="button" onClick={() => {setAcknowledged(false); onSync()}}
        disabled={!ready || !acknowledged || syncing}>
        {syncing ? <RefreshCw size={16} className="spin"/> : <LockKeyhole size={16}/>}
        {syncing ? 'Sincronizando…' : 'Confirmar sincronización'}
      </button>
    </div>
    <p className="auto91-disclaimer">La vista es orientativa: no lee notas individuales ni predice recertificaciones con exactitud. Las excepciones individuales justificadas necesitan un control persistente del servidor y no se simulan como si estuvieran aplicadas.</p>
  </section>
}
