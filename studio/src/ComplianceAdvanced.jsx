import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart3, Bell, BookOpen, Briefcase, CheckCircle2,
  Clock3, Loader2, PlayCircle, RefreshCw, Search, Target, UserCheck, Users, X,
} from 'lucide-react'
import { getError, supabase } from './shared.js'

export function SupervisorAssignments({ people = [], refresh, setMessage }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')

  const activePeople = useMemo(() => people.filter((person) => person.is_active !== false), [people])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activePeople
    return activePeople.filter((person) => [person.full_name, person.email]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  }, [activePeople, query])

  const setSupervisor = async (person, supervisorId) => {
    setBusy(person.id)
    try {
      const { error } = await supabase.rpc('admin_set_user_supervisor', {
        p_user_id: person.id,
        p_supervisor_id: supervisorId || null,
      })
      if (error) throw error
      setMessage('Supervisor actualizado para ' + (person.full_name || person.email) + '.')
      await refresh?.()
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el supervisor.'))
    } finally {
      setBusy('')
    }
  }

  return <section className="panel-card compliance-supervisor-panel">
    <div className="section-title-row">
      <div>
        <span className="eyebrow">Línea de seguimiento</span>
        <h3>Supervisor por colaborador</h3>
        <p>Permite escalar automáticamente alertas formativas, como dos intentos fallidos en un examen.</p>
      </div>
      <UserCheck size={27} />
    </div>

    <label className="search-field compliance-search">
      <Search size={16} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar colaborador…" />
    </label>

    <div className="compliance-supervisor-list">
      {filtered.map((person) => <article key={person.id}>
        <span className="compliance-person-avatar">{initials(person.full_name || person.email)}</span>
        <div><strong>{person.full_name || person.email}</strong><small>{person.email}</small></div>
        <label>
          <span>Supervisor</span>
          <select
            value={person.supervisor_id || ''}
            disabled={busy === person.id}
            onChange={(event) => setSupervisor(person, event.target.value)}
          >
            <option value="">Sin supervisor</option>
            {activePeople.filter((candidate) => candidate.id !== person.id).map((candidate) =>
              <option key={candidate.id} value={candidate.id}>{candidate.full_name || candidate.email}</option>
            )}
          </select>
        </label>
        {busy === person.id && <Loader2 className="spin" size={16} />}
      </article>)}
      {!filtered.length && <div className="compliance-empty-compact">No hay personas que coincidan con la búsqueda.</div>}
    </div>
  </section>
}

export function CompetencyCourseMapper({ competencies = [], courses = [], setMessage }) {
  const [mappings, setMappings] = useState([])
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('course_competencies')
        .select('course_id,competency_id,level_awarded,created_at')
      if (error) throw error
      setMappings(data || [])
      if (!selectedCompetencyId && competencies.length) setSelectedCompetencyId(competencies[0].id)
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar el vínculo entre cursos y competencias.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [competencies.length])

  const selected = competencies.find((item) => item.id === selectedCompetencyId) || competencies[0] || null
  const linked = mappings.filter((item) => item.competency_id === selected?.id)
  const linkedIds = new Set(linked.map((item) => item.course_id))

  const linkCourse = async (courseId) => {
    if (!selected || !courseId) return
    setBusy('link:' + courseId)
    try {
      const { error } = await supabase.from('course_competencies').upsert({
        course_id: courseId,
        competency_id: selected.id,
        level_awarded: 1,
      }, { onConflict: 'course_id,competency_id' })
      if (error) throw error
      setMessage('Capacitación vinculada a ' + selected.name + '.')
      await load()
    } catch (error) {
      setMessage(getError(error, 'No fue posible vincular la capacitación.'))
    } finally {
      setBusy('')
    }
  }

  const updateLevel = async (courseId, level) => {
    if (!selected) return
    setBusy('level:' + courseId)
    try {
      const { error } = await supabase.from('course_competencies')
        .update({ level_awarded: Number(level) })
        .eq('course_id', courseId)
        .eq('competency_id', selected.id)
      if (error) throw error
      await load()
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el nivel aportado.'))
    } finally {
      setBusy('')
    }
  }

  const unlink = async (courseId) => {
    if (!selected) return
    setBusy('unlink:' + courseId)
    try {
      const { error } = await supabase.from('course_competencies')
        .delete()
        .eq('course_id', courseId)
        .eq('competency_id', selected.id)
      if (error) throw error
      setMessage('Capacitación retirada de la competencia.')
      await load()
    } catch (error) {
      setMessage(getError(error, 'No fue posible retirar el vínculo.'))
    } finally {
      setBusy('')
    }
  }

  return <section className="panel-card compliance-course-competency-map">
    <div className="section-title-row">
      <div>
        <span className="eyebrow">Cierre de brechas</span>
        <h3>¿Qué capacitación desarrolla cada competencia?</h3>
        <p>Cuando una persona completa un curso vinculado, Aula EI puede calcular el nivel alcanzado frente al nivel requerido por su cargo.</p>
      </div>
      <Target size={27} />
    </div>

    <div className="course-competency-toolbar">
      <label>
        <span>Competencia</span>
        <select value={selected?.id || ''} onChange={(event) => setSelectedCompetencyId(event.target.value)}>
          {competencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>
        <span>Vincular capacitación</span>
        <select defaultValue="" onChange={(event) => { if (event.target.value) linkCourse(event.target.value); event.target.value = '' }}>
          <option value="">Selecciona una capacitación…</option>
          {courses.filter((course) => !linkedIds.has(course.id)).map((course) =>
            <option key={course.id} value={course.id}>{course.title}</option>
          )}
        </select>
      </label>
    </div>

    {loading ? <div className="compliance-inline-loading"><Loader2 className="spin" size={17} /> Cargando vínculos…</div> :
      <div className="course-competency-links">
        {linked.map((relation) => {
          const course = courses.find((item) => item.id === relation.course_id)
          if (!course) return null
          return <article key={relation.course_id}>
            <span><BookOpen size={18} /></span>
            <div><strong>{course.title}</strong><small>Nivel que acredita al completarse</small></div>
            <select value={relation.level_awarded} onChange={(event) => updateLevel(relation.course_id, event.target.value)} disabled={busy === 'level:' + relation.course_id}>
              {[1,2,3,4,5].map((level) => <option key={level} value={level}>Nivel {level}</option>)}
            </select>
            <button className="icon-button danger-soft" title="Retirar vínculo" onClick={() => unlink(relation.course_id)} disabled={busy === 'unlink:' + relation.course_id}><X size={16} /></button>
          </article>
        })}
        {!linked.length && <div className="compliance-empty-compact">Esta competencia todavía no tiene capacitaciones vinculadas.</div>}
      </div>}
  </section>
}

export function AutomationRunPanel({ setMessage }) {
  const [runs, setRuns] = useState([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('training_automation_runs')
      .select('id,started_at,finished_at,status,counters,error_message')
      .order('id', { ascending: false })
      .limit(8)
    setRuns(data || [])
  }

  useEffect(() => { load() }, [])

  const run = async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_run_training_automations')
      if (error) throw error
      const total = Number(data?.notifications || 0)
      const recertifications = Number(data?.recertifications || 0)
      setMessage('Automatizaciones ejecutadas: ' + total + ' aviso(s) y ' + recertifications + ' recertificación(es).')
      await load()
    } catch (error) {
      setMessage(getError(error, 'No fue posible ejecutar las automatizaciones.'))
    } finally {
      setBusy(false)
    }
  }

  return <section className="panel-card compliance-automation-runs">
    <div className="section-title-row">
      <div>
        <span className="eyebrow">Ejecución real</span>
        <h3>Motor programado y auditable</h3>
        <p>Supabase ejecuta el motor diariamente a las 08:05 de Colombia. También puedes lanzarlo manualmente para pruebas o cierres de auditoría.</p>
      </div>
      <button className="primary-button" onClick={run} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <PlayCircle size={16} />} Ejecutar ahora</button>
    </div>

    <div className="automation-run-list">
      {runs.map((item) => <article key={item.id} className={item.status}>
        <span>{item.status === 'success' ? <CheckCircle2 size={18} /> : item.status === 'error' ? <AlertTriangle size={18} /> : <Clock3 size={18} />}</span>
        <div><strong>Ejecución #{item.id}</strong><small>{formatDateTime(item.started_at)}</small></div>
        <div className="automation-run-counters">
          <b>{item.counters?.notifications || 0}</b><span>avisos</span>
          <b>{item.counters?.recertifications || 0}</b><span>recert.</span>
        </div>
      </article>)}
      {!runs.length && <div className="compliance-empty-compact">Aún no hay ejecuciones registradas.</div>}
    </div>
  </section>
}

export function ComplianceAnalytics({ setMessage }) {
  const [analytics, setAnalytics] = useState(null)
  const [questions, setQuestions] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [summary, questionResult, blockResult] = await Promise.all([
        supabase.rpc('admin_training_analytics'),
        supabase.rpc('admin_question_analytics'),
        supabase.rpc('admin_content_block_analytics'),
      ])
      const firstError = [summary, questionResult, blockResult].find((result) => result.error)?.error
      if (firstError) throw firstError
      setAnalytics(summary.data || {})
      setQuestions(questionResult.data || [])
      setBlocks(blockResult.data || [])
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar la analítica de formación.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const hardest = useMemo(() => [...questions]
    .filter((row) => Number(row.answers_count || 0) > 0)
    .sort((a,b) => Number(b.error_percent || 0) - Number(a.error_percent || 0))
    .slice(0,10), [questions])

  const friction = useMemo(() => [...blocks]
    .filter((row) => Number(row.started_count || 0) > 0)
    .sort((a,b) => Number(a.completion_percent || 0) - Number(b.completion_percent || 0))
    .slice(0,10), [blocks])

  if (loading) return <div className="compliance-loading compact"><Loader2 className="spin" size={22} /><strong>Calculando analítica…</strong></div>

  const courses = analytics?.courses || []

  return <div className="compliance-analytics">
    <section className="compliance-metrics analytics-metrics">
      <Metric icon={CheckCircle2} label="Finalización" value={formatPercent(analytics?.completion_percent)} helper={(analytics?.completed || 0) + ' completadas'} />
      <Metric icon={Activity} label="Aprobación de exámenes" value={formatPercent(analytics?.pass_percent)} helper={(analytics?.exam_attempts || 0) + ' intentos'} />
      <Metric icon={Target} label="Nota promedio" value={formatPercent(analytics?.average_score)} />
      <Metric icon={Clock3} label="Tiempo medio" value={Number(analytics?.average_completion_days || 0).toFixed(1) + ' d'} helper="Asignación → cierre" />
      <Metric icon={AlertTriangle} label="Usuarios en riesgo" value={analytics?.at_risk_users || 0} helper="Vencidos o evidencia expirada" />
    </section>

    <section className="panel-card analytics-course-panel">
      <div className="section-title-row">
        <div><span className="eyebrow">Rendimiento por capacitación</span><h3>Finalización, intentos y aprobación</h3><p>Permite detectar cursos con baja finalización o exámenes que requieren ajuste.</p></div>
        <BarChart3 size={27} />
      </div>
      <div className="compliance-table-wrap">
        <table className="compliance-table analytics-table">
          <thead><tr><th>Capacitación</th><th>Asignadas</th><th>Completadas</th><th>Finalización</th><th>Intentos</th><th>Aprobación</th><th>Nota</th></tr></thead>
          <tbody>{courses.map((row) => <tr key={row.course_id}>
            <td><strong>{row.course_title}</strong></td>
            <td>{row.assigned}</td><td>{row.completed}</td>
            <td>{formatPercent(row.completion_percent)}</td>
            <td>{row.exam_attempts}</td><td>{formatPercent(row.pass_percent)}</td><td>{formatPercent(row.average_score)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <div className="analytics-detail-grid">
      <section className="panel-card analytics-question-panel">
        <div className="section-title-row"><div><span className="eyebrow">Dificultad real</span><h3>Preguntas con más error</h3></div><AlertTriangle size={24} /></div>
        <div className="analytics-ranked-list">
          {hardest.map((row,index) => <article key={row.question_id}>
            <b>{index+1}</b><div><strong>{row.prompt}</strong><small>{row.course_title} · {row.answers_count} respuesta(s)</small></div><span>{formatPercent(row.error_percent)} error</span>
          </article>)}
          {!hardest.length && <div className="compliance-empty-compact">Todavía no hay respuestas suficientes.</div>}
        </div>
      </section>

      <section className="panel-card analytics-question-panel">
        <div className="section-title-row"><div><span className="eyebrow">Fricción de contenido</span><h3>Bloques con menor cierre</h3></div><Activity size={24} /></div>
        <div className="analytics-ranked-list">
          {friction.map((row,index) => <article key={row.block_id}>
            <b>{index+1}</b><div><strong>{row.block_title}</strong><small>{row.course_title} · {row.phase_title}</small></div><span>{formatPercent(row.completion_percent)} cierre</span>
          </article>)}
          {!friction.length && <div className="compliance-empty-compact">Todavía no hay progreso suficiente.</div>}
        </div>
      </section>
    </div>

    <button className="secondary-button compliance-analytics-refresh" onClick={load}><RefreshCw size={15} /> Actualizar analítica</button>
  </div>
}

function Metric({ icon: Icon, label, value, helper }) {
  return <article><span><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong>{helper && <em>{helper}</em>}</div></article>
}

function initials(value) {
  return String(value || 'EI').split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase()
}

function formatPercent(value) {
  return Number(value || 0).toFixed(1) + '%'
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value))
  } catch {
    return String(value)
  }
}
