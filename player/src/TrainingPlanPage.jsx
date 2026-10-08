import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, CircleAlert,
  ClipboardList, Clock3, LockKeyhole, RefreshCw, Route, ShieldCheck, Sparkles } from 'lucide-react'
import { cachedQuery } from '../../src/data-cache.js'
import { buildDevelopmentSnapshot } from './development/development-data.js'
import { buildTrainingPlan, filterTrainingPlan } from './training-plan/training-plan-model.js'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { supabase } from './supabase.js'
import './styles/training-plan.css'

const FILTERS = [
  { id: 'all', label: 'Todos' }, { id: 'attention', label: 'Prioritarios' },
  { id: 'active', label: 'En curso' }, { id: 'pending', label: 'Pendientes' },
  { id: 'locked', label: 'Bloqueados' }, { id: 'complete', label: 'Terminados' },
]
const iconFor = { overdue: CircleAlert, due: Clock3, active: BookOpen,
  scheduled: CalendarClock, pending: ClipboardList, locked: LockKeyhole, complete: CheckCircle2 }
const dateLabel = (value) => value === null ? 'Sin fecha límite' :
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export default function TrainingPlanPage({ profile, sessionUser }) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState('all')
  const development = useMemo(() => buildDevelopmentSnapshot(snapshot || {}), [snapshot])
  const plan = useMemo(() => buildTrainingPlan(development), [development])
  const filtered = useMemo(() => filterTrainingPlan(plan.items, filter), [plan.items, filter])
  const firstName = String(profile?.full_name || 'Colaborador').trim().split(/\s+/)[0] || 'Colaborador'

  useEffect(() => {
    let active = true
    if (!sessionUser?.id) {
      setSnapshot(null)
      setError('Inicia sesión para consultar tu plan personal de formación.')
      setLoading(false)
      return () => { active = false }
    }
    if (revision) setRefreshing(true)
    else setLoading(true)
    setError('')
    ;(async () => {
      try {
        const result = await cachedQuery('home:snapshot:' + sessionUser.id, async () => {
          const response = await supabase.rpc('get_my_home_snapshot')
          if (response.error) throw response.error
          return response.data || {}
        }, { ttl: 45000, force: revision > 0 })
        if (active) setSnapshot(result)
      } catch (cause) {
        if (active) setError(cause?.message || 'No fue posible consultar tu plan de formación.')
      } finally {
        if (active) { setLoading(false); setRefreshing(false) }
      }
    })()
    return () => { active = false }
  }, [sessionUser?.id, revision])

  if (loading && !snapshot) return <main className="training-plan-page">
    <section className="training-plan-state" role="status" aria-busy="true">
      <RefreshCw size={28}/><h1>Preparando tu plan de formación…</h1>
      <p>Consultamos tus asignaciones y rutas oficiales de Aula EI.</p>
    </section>
  </main>

  if (error && !snapshot) return <main className="training-plan-page">
    <section className="training-plan-state" role="alert">
      <CircleAlert size={28}/><h1>No pudimos cargar tu plan</h1><p>{error}</p>
      <button type="button" onClick={() => setRevision((value) => value + 1)}>
        <RefreshCw size={17}/> Reintentar consulta
      </button>
    </section>
  </main>

  return <main className="training-plan-page">
    <section className="training-plan-hero">
      <div className="training-plan-hero-copy">
        <span className="training-plan-kicker"><Sparkles size={16}/> AULA EI · FASE 7</span>
        <h1>Tu formación, con un plan claro.</h1>
        <p>{firstName}, organiza tus próximas capacitaciones desde un solo lugar. Las prioridades se calculan a partir de tus fechas y rutas institucionales, no de datos inventados.</p>
        <div className="training-plan-hero-actions">
          {plan.next && <button type="button" className="training-plan-primary"
            onClick={() => openLearnerCourse(plan.next.id)}>
            Continuar mi prioridad <ArrowRight size={17}/>
          </button>}
          <button type="button" className="training-plan-secondary" onClick={() => navigateLearner('/development')}>
            <Route size={17}/> Ver rutas y competencias
          </button>
        </div>
      </div>
      <div className="training-plan-hero-score">
        <small>MI AVANCE FORMATIVO</small>
        <strong>{plan.counts.total ? Math.round(100 * plan.counts.complete / plan.counts.total) : 0}%</strong>
        <span>{plan.counts.complete} de {plan.counts.total} capacitaciones cumplidas</span>
        <div role="progressbar" aria-label="Porcentaje de capacitaciones completadas"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={plan.counts.total ? Math.round(100 * plan.counts.complete / plan.counts.total) : 0}>
          <i style={{ width: (plan.counts.total ? Math.round(100 * plan.counts.complete / plan.counts.total) : 0) + '%' }}/>
        </div>
      </div>
    </section>

    <section className="training-plan-stats" aria-label="Estado de mis capacitaciones">
      <article><ClipboardList size={20}/><div><span>Asignadas</span><strong>{plan.counts.total}</strong></div></article>
      <article><CircleAlert size={20}/><div><span>Prioritarias</span><strong>{plan.counts.attention}</strong></div></article>
      <article><BookOpen size={20}/><div><span>Por completar</span><strong>{plan.counts.pending}</strong></div></article>
      <article><BadgeCheck size={20}/><div><span>Cumplidas</span><strong>{plan.counts.complete}</strong></div></article>
    </section>

    {plan.next && <section className="training-plan-next" aria-label="Siguiente capacitación recomendada">
      <span className="training-plan-next-icon"><ArrowRight size={23}/></span>
      <div><small>RECOMENDACIÓN SEGÚN TU PRIORIDAD</small>
        <strong>{plan.next.title}</strong><p>{plan.next.reason}</p></div>
      <button type="button" onClick={() => openLearnerCourse(plan.next.id)}>Continuar <ArrowRight size={17}/></button>
    </section>}
    {error && <div className="training-plan-warning" role="alert">No se pudo actualizar el plan: {error}. Se muestran los datos previamente consultados.</div>}

    <section className="training-plan-board" aria-labelledby="training-plan-board-title">
      <header className="training-plan-board-header">
        <div><small>MI AGENDA DE APRENDIZAJE</small><h2 id="training-plan-board-title">Capacitaciones por prioridad</h2>
          <p>Las rutas bloqueadas se muestran solo como referencia; sus contenidos no se habilitan desde esta pantalla.</p></div>
        <button type="button" disabled={refreshing} onClick={() => setRevision((value) => value + 1)}>
          <RefreshCw size={16}/>{refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>
      <div className="training-plan-filters" role="group" aria-label="Filtrar mis capacitaciones">
        {FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id}
          className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </div>
      <div className="training-plan-list" aria-live="polite">
        {filtered.length ? filtered.map((item) => {
          const Icon = iconFor[item.type]
          return <article key={item.id} className={'training-plan-item is-' + item.type}>
            <span className="training-plan-item-icon"><Icon size={20}/></span>
            <div className="training-plan-item-body">
              <span className={'training-plan-status is-' + item.type}>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.reason}</p>
              <div className="training-plan-meta">
                <span><CalendarClock size={14}/>{dateLabel(item.dueAt)}</span>
                {item.pathNames.slice(0,2).map((name) => <span key={name}><Route size={14}/>{name}</span>)}
              </div>
            </div>
            {item.openable ? <button type="button" className="training-plan-open"
              aria-label={'Continuar ' + item.title} onClick={() => openLearnerCourse(item.id)}>
              Abrir <ArrowRight size={16}/>
            </button> : <span className="training-plan-unavailable">
              {item.type === 'complete' ? 'Cumplida' : <><LockKeyhole size={14}/> Bloqueada</>}
            </span>}
          </article>
        }) : <div className="training-plan-empty" role="status">
          <CheckCircle2 size={29}/><strong>{plan.items.length ? 'Sin capacitaciones en este filtro' : 'Todavía no tienes capacitaciones asignadas'}</strong>
          <p>{plan.items.length ? 'Selecciona otra categoría para consultar el resto de tu plan.' : 'Cuando tengas una asignación válida, aparecerá aquí automáticamente.'}</p>
          {plan.items.length > 0 && <button type="button" onClick={() => setFilter('all')}>Mostrar todas</button>}
        </div>}
      </div>
    </section>
    <p className="training-plan-disclaimer"><ShieldCheck size={16}/>
      Mi plan es una vista de consulta. No cambia asignaciones, fechas, notas ni certificados. Aula EI valida tus permisos nuevamente al abrir cada curso.
    </p>
  </main>
}
