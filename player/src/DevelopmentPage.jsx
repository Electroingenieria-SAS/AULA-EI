import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, RefreshCw, Target, TrendingUp } from 'lucide-react'
import { supabase } from './supabase.js'
import './styles/development.css'
import { cachedQuery } from '../../src/data-cache.js'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { buildDevelopmentSnapshot } from './development/development-data.js'
import { DevelopmentCompetencies, DevelopmentPaths, DevelopmentDates, DevelopmentCertificates } from './development/DevelopmentSections.jsx'

export default function DevelopmentPage({ profile, sessionUser }) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [dataTime, setDataTime] = useState(null)
  const model = useMemo(() => buildDevelopmentSnapshot(snapshot || {}), [snapshot])
  const firstName = String(profile?.full_name || 'Colaborador').trim().split(/\s+/)[0] || 'Colaborador'

  useEffect(() => {
    let alive = true
    setError('')
    if (!sessionUser?.id) {
      setSnapshot(null)
      setLoading(false)
      setError('Debes iniciar sesión para consultar tu desarrollo formativo.')
      return () => { alive = false }
    }
    if (revision) setRefreshing(true)
    else setLoading(true)
    ;(async () => {
      try {
        const data = await cachedQuery('home:snapshot:' + sessionUser.id, async () => {
          const result = await supabase.rpc('get_my_home_snapshot')
          if (result.error) throw result.error
          return result.data || {}
        }, { ttl: 45000, force: revision > 0 })
        if (!alive) return
        setSnapshot(data)
        setDataTime(new Date())
      } catch (cause) {
        if (alive) setError(cause?.message || 'No se pudo consultar tu información de formación.')
      } finally {
        if (alive) { setLoading(false); setRefreshing(false) }
      }
    })()
    return () => { alive = false }
  }, [sessionUser?.id, revision])

  if (loading && !snapshot) return <main className="learner-development-page">
    <section className="development-loading" role="status" aria-busy="true">
      <TrendingUp size={30}/><h1>Preparando tu mapa de desarrollo…</h1><p>Estamos consultando tus rutas y competencias institucionales.</p>
    </section>
  </main>

  if (error && !snapshot) return <main className="learner-development-page">
    <section className="development-loading" role="alert"><h1>No pudimos cargar tu desarrollo</h1><p>{error}</p>
      <button type="button" onClick={() => setRevision((n) => n + 1)}><RefreshCw size={17}/> Reintentar</button>
    </section>
  </main>

  return <main className="learner-development-page">
    <section className="development-hero">
      <div className="development-hero-copy">
        <span className="development-eyebrow"><TrendingUp size={16}/> MI DESARROLLO PROFESIONAL</span>
        <h1>Tu progreso tiene un camino.</h1>
        <p>{firstName}, aquí puedes ver las habilidades requeridas para tu cargo, las rutas de formación y los próximos pasos para avanzar.</p>
        <div className="development-hero-actions">
          {model.next && <button type="button" className="development-primary" onClick={() => openLearnerCourse(model.next.course.id)}>
            <ArrowRight size={18}/> Continuar siguiente capacitación
          </button>}
          <button type="button" className="development-secondary" onClick={() => navigateLearner('/coach')}>
            <BookOpen size={17}/> Abrir mi entrenador
          </button>
        </div>
      </div>
      <div className="development-hero-profile">
        <small>PERFIL FORMATIVO ACTUAL</small>
        <strong>{model.position?.name || 'Cargo por configurar'}</strong>
        <span>{model.position?.department || 'Desarrollo de competencias de Aula EI'}</span>
        {model.supervisor?.name && <span className="development-supervisor">Acompañamiento: {model.supervisor.name}</span>}
      </div>
    </section>

    <section className="development-kpis" aria-label="Resumen de desarrollo">
      <article><BookOpen size={22}/><div><span>Formaciones asignadas</span><strong>{model.totalAssigned}</strong></div></article>
      <article><CheckCircle2 size={22}/><div><span>Formaciones cumplidas</span><strong>{model.completedCount}</strong></div></article>
      <article><Target size={22}/><div><span>Competencias al nivel requerido</span><strong>{model.competenciesAchieved} / {model.competencies.length}</strong></div></article>
      <article className={model.overdueCount ? 'needs-attention' : ''}><CalendarClock size={22}/><div><span>Vencidas · Próximos 7 días</span>
        <strong>{model.overdueCount} · {model.dueSoonCount}</strong></div></article>
    </section>

    {error && <div className="development-inline-error" role="alert">{error}</div>}
    <div className="development-toolbar">
      <span><BadgeCheck size={15}/> Información personal de Aula EI
        {dataTime && ' · Consultada ' + dataTime.toLocaleTimeString('es-CO', {hour: '2-digit',minute: '2-digit'})}
      </span>
      <button type="button" disabled={refreshing} onClick={() => setRevision((n) => n + 1)}>
        <RefreshCw size={16}/> {refreshing ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>

    <div className="development-layout">
      <DevelopmentCompetencies items={model.competencies}/>
      <DevelopmentPaths paths={model.paths}/>
    </div>
    <div className="development-layout">
      <DevelopmentDates items={model.upcoming}/>
      <DevelopmentCertificates items={model.certificates}/>
    </div>
  </main>
}
