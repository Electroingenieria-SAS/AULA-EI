import React, { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, Download, Eye, Filter, RefreshCw, Search, Target } from 'lucide-react'
import { getError, supabase } from '../shared.js'
import { analyticsCsv, analyticsView } from './analytics-model.js'
import '../styles/analytics-workbench.css'

const formatted = (value) => Number(value || 0).toFixed(1) + '%'
const count = (value) => Number(value || 0).toLocaleString('es-CO')

function saveReport(contents, filename) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }))
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function KeyMetric({ icon: Icon, label, value, helper }) {
  return <article><span><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong>{helper && <em>{helper}</em>}</div></article>
}

function performanceTone(value) {
  const pct = Number(value || 0)
  return pct < 60 ? 'low' : pct < 85 ? 'medium' : 'good'
}

function PercentCell({ value, empty = false, emptyLabel = 'Sin datos' }) {
  if (empty) return <span className="analytics-value is-neutral">{emptyLabel}</span>
  const numberValue = Math.max(0, Math.min(100, Number(value || 0)))
  return <div className={'analytics-percent is-' + performanceTone(numberValue)}>
    <strong>{formatted(numberValue)}</strong>
    <span className="analytics-percent-track" aria-hidden="true">
      <i style={{ width: numberValue + '%' }} />
    </span>
  </div>
}

function EvidenceList({ title, description, rows, kind }) {
  const isQuestion = kind === 'question'
  // A 100% closed block is not an obstacle. Keep it out of the friction ranking.
  const relevantRows = isQuestion ? rows : rows.filter((row) => Number(row.completion_percent) < 100)
  const hasObservations = rows.length > 0
  return <section className="panel-card analytics-review-panel">
    <div className="section-title-row">
      <div>
        <span className="eyebrow">{isQuestion ? 'ANÁLISIS DE PREGUNTAS' : 'REVISIÓN DE CONTENIDOS'}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className={'analytics-panel-symbol ' + (isQuestion ? 'is-question' : 'is-block')}>
        {isQuestion ? <AlertTriangle size={21}/> : <Activity size={21}/>}
      </span>
    </div>
    {relevantRows.length ? <ol className="analytics-evidence-list">
      {relevantRows.slice(0,10).map((row, i) => {
        const score = isQuestion ? Number(row.error_percent || 0) : Number(row.completion_percent || 0)
        const sample = isQuestion ? row.answers_count : row.started_count
        const tone = isQuestion
          ? (score >= 60 ? 'low' : score >= 30 ? 'medium' : 'good')
          : performanceTone(score)
        return <li key={isQuestion ? row.question_id : row.block_id} className={'is-' + tone}>
          <span className="analytics-rank-index" aria-label={'Posición ' + (i + 1)}>{String(i + 1).padStart(2, '0')}</span>
          <div className="analytics-evidence-main">
            <strong>{isQuestion ? row.prompt : row.block_title}</strong>
            <small>{row.course_title}{!isQuestion && row.phase_title ? ' · ' + row.phase_title : ''} · {count(sample)} {isQuestion ? 'respuestas' : 'inicios'}</small>
            <div className="analytics-evidence-track" aria-hidden="true"><span style={{ width: Math.max(0, Math.min(100,score)) + '%' }}/></div>
          </div>
          <span className="analytics-evidence-score">
            <b>{formatted(score)}</b><small>{isQuestion ? 'error' : 'cierre'}</small>
          </span>
        </li>
      })}
    </ol> : <div className="analytics-detail-empty">
      <CheckCircle2 size={22}/>
      <strong>{!isQuestion && hasObservations ? 'Los bloques analizados alcanzan el 100 % de cierre' : 'No hay resultados suficientes'}</strong>
      <p>{!isQuestion && hasObservations
        ? 'No se muestran como obstáculos los contenidos que se han completado en todos los inicios registrados.'
        : 'Cambia la capacitación o reduce la muestra mínima para explorar otros resultados, sin perder el contexto.'}</p>
    </div>}
    <footer className="analytics-review-footer">
      <span>{relevantRows.length ? 'Se muestran hasta 10 registros ordenados por ' + (isQuestion ? 'errores' : 'menor cierre') : 'Datos sujetos al filtro y a la muestra seleccionada'}</span>
    </footer>
  </section>
}

export default function AnalyticsWorkbench({ setMessage }) {
  const [analytics, setAnalytics] = useState(null)
  const [questions, setQuestions] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [courseId, setCourseId] = useState('all')
  const [search, setSearch] = useState('')
  const [minimumSample, setMinimumSample] = useState(5)
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [summary, questionResult, blockResult] = await Promise.all([
        supabase.rpc('admin_training_analytics'),
        supabase.rpc('admin_question_analytics'),
        supabase.rpc('admin_content_block_analytics'),
      ])
      const error = [summary, questionResult, blockResult].find((result) => result.error)?.error
      if (error) throw error
      if (!summary.data || !Array.isArray(questionResult.data) || !Array.isArray(blockResult.data)) {
        throw new Error('La respuesta de analítica no contiene todos los conjuntos esperados.')
      }
      setAnalytics(summary.data)
      setQuestions(questionResult.data)
      setBlocks(blockResult.data)
      setUpdatedAt(new Date())
    } catch (error) {
      const message = getError(error, 'No fue posible cargar la analítica de formación.')
      setLoadError(message)
      setMessage?.(message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const view = useMemo(() => analyticsView(analytics, questions, blocks, {
    courseId, search, minimumSample,
  }), [analytics, questions, blocks, courseId, search, minimumSample])
  const findings = view.findings
  const highCount = findings.filter((item) => item.priority === 'high').length
  const exportReport = () => {
    if (!view.courses.length) return
    try {
      saveReport(analyticsCsv(view), 'aula-ei-analitica-' + new Date().toISOString().slice(0,10) + '.csv')
    } catch {
      setMessage?.('No fue posible descargar el informe. Intenta de nuevo desde un navegador actualizado.')
    }
  }

  if (loading && !analytics) return <section className="compliance-loading compact" role="status" aria-busy="true">
    <RefreshCw className="spin" size={22}/><strong>Calculando analítica de formación…</strong>
  </section>
  if (!analytics) return <section className="analytics-workbench-error" role="alert">
    <strong>No se pudo cargar la analítica</strong><p>{loadError}</p>
    <button type="button" onClick={load}><RefreshCw size={16}/> Reintentar</button>
  </section>

  return <div className="compliance-analytics analytics-workbench">
    <section className="compliance-metrics analytics-metrics" aria-label="Indicadores generales de toda Aula EI">
      <KeyMetric icon={CheckCircle2} label="Finalización general" value={formatted(analytics.completion_percent)} helper={count(analytics.completed) + ' completadas'}/>
      <KeyMetric icon={Activity} label="Aprobación general por intento" value={formatted(analytics.pass_percent)} helper={count(analytics.exam_attempts) + ' intentos'}/>
      <KeyMetric icon={Target} label="Nota promedio general" value={formatted(analytics.average_score)} />
      <KeyMetric icon={Clock3} label="Tiempo medio general" value={Number(analytics.average_completion_days || 0).toFixed(1) + ' d'} helper="Asignación → cierre"/>
      <KeyMetric icon={AlertTriangle} label="Personas con alertas" value={count(analytics.at_risk_users)} helper="Vencimientos o evidencias expiradas"/>
    </section>

    <section className="analytics-filter-panel panel-card" aria-label="Filtros de analítica">
      <div className="analytics-filter-heading">
        <div><span className="eyebrow"><Filter size={14}/> EXPLORADOR DE FORMACIÓN</span><h3>Encuentra dónde intervenir</h3>
          <p>Los indicadores superiores son globales. Los filtros siguientes afectan los hallazgos, tablas y archivos exportados.</p></div>
        <button type="button" className="secondary-button compact" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''}/> {loading ? 'Actualizando…' : 'Actualizar datos'}
        </button>
      </div>
      <div className="analytics-controls">
        <label>Capacitación
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="all">Todas las capacitaciones</option>
            {(analytics.courses || []).map((row) => <option key={row.course_id} value={row.course_id}>{row.course_title}</option>)}
          </select>
        </label>
        <label>Buscar por nombre
          <span className="analytics-search-wrap"><Search size={17}/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre de capacitación…"/></span>
        </label>
        <label>Muestra mínima
          <select value={minimumSample} onChange={(event) => setMinimumSample(Number(event.target.value))}>
            <option value={3}>3 observaciones</option><option value={5}>5 observaciones</option><option value={10}>10 observaciones</option>
            <option value={20}>20 observaciones</option>
          </select>
        </label>
      </div>
      <div className="analytics-controls-footer">
        <span><Eye size={15}/> {count(view.courses.length)} capacitación(es) · {count(findings.length)} hallazgo(s)
          {updatedAt && ' · Consultado ' + updatedAt.toLocaleTimeString('es-CO', { hour:'2-digit',minute:'2-digit' })}
        </span>
        <button type="button" onClick={exportReport} disabled={!view.courses.length}><Download size={17}/> Exportar informe CSV</button>
      </div>
      {loadError && <p className="analytics-workbench-warning" role="alert">No se pudieron actualizar los datos. Se conservan los resultados anteriores: {loadError}</p>}
    </section>

    <section className="panel-card analytics-action-panel" aria-labelledby="analytics-action-title">
      <div className="section-title-row"><div><span className="eyebrow">SEGUIMIENTO PRIORITARIO</span>
        <h3 id="analytics-action-title">Acciones sugeridas por evidencia</h3>
        <p>Reglas orientativas: finalización o aprobación menor del 60 %, preguntas con más del 60 % de error y bloques con cierre menor del 50 %. Se exige la muestra mínima que seleccionaste.</p>
      </div><strong className={highCount ? 'analytics-priority-count is-high' : 'analytics-priority-count'}>{highCount} alta prioridad</strong></div>
      {findings.length ? <div className="analytics-action-list">
        {findings.slice(0,20).map((finding) => <article key={finding.key}>
          <span className={'analytics-priority-pill is-' + finding.priority}>{finding.priority === 'high' ? 'Alta' : 'Revisar'}</span>
          <div><strong>{finding.title}</strong><small>{finding.course_title} · Muestra: {count(finding.sample)}</small>
            <p>{finding.detail}</p><span>{finding.action}</span>
          </div>
        </article>)}
      </div> : <div className="analytics-insight-empty">
        <span className="analytics-insight-icon"><CheckCircle2 size={24}/></span>
        <div>
          <strong>Sin alertas prioritarias para estos filtros</strong>
          <p>Los resultados disponibles no superan los umbrales de intervención. No es una certificación de calidad.</p>
        </div>
        <span className="analytics-insight-guidance">¿Quieres ampliar el análisis? Selecciona otra capacitación o ajusta la muestra mínima.</span>
      </div>}
      {findings.length > 20 && <p className="analytics-workbench-foot">Se muestran los 20 hallazgos más prioritarios. El CSV exporta todos los hallazgos filtrados.</p>}
    </section>

    <section className="panel-card analytics-course-panel">
      <div className="section-title-row">
        <div><span className="eyebrow">RENDIMIENTO POR CAPACITACIÓN</span><h3>Finalización, intentos y aprobación</h3>
          <p>Las cifras de aprobación corresponden a intentos de examen y no necesariamente a personas únicas.</p></div>
        <BarChart3 size={26}/>
      </div>
      <div className="compliance-table-wrap analytics-table-scroll" role="region" aria-label="Resultados por capacitación; desplázate horizontalmente para ver todas las columnas" tabIndex={0}>
        <table className="compliance-table analytics-table">
          <thead><tr><th>Capacitación</th><th>Asignadas</th><th>Completadas</th><th>Finalización</th><th>Intentos</th><th>Aprobación</th><th>Nota</th></tr></thead>
          <tbody>{view.courses.map((row) => <tr key={row.course_id}>
            <td className="analytics-course-name"><strong>{row.course_title}</strong></td>
            <td><span className="analytics-count">{count(row.assigned)}</span></td>
            <td><span className="analytics-count">{count(row.completed)}</span></td>
            <td><PercentCell value={row.completion_percent} empty={!row.assigned} emptyLabel="Sin asignaciones"/></td>
            <td><span className="analytics-count">{count(row.exam_attempts)}</span></td>
            <td><PercentCell value={row.pass_percent} empty={!row.exam_attempts} emptyLabel="Sin intentos"/></td>
            <td><PercentCell value={row.average_score} empty={!row.exam_attempts} emptyLabel="—"/></td>
          </tr>)}</tbody>
        </table>
        {!view.courses.length && <p className="analytics-workbench-empty">No se encontraron capacitaciones con este filtro.</p>}
      </div>
    </section>

    <div className="analytics-detail-grid" aria-label="Indicadores para revisión pedagógica">
      <EvidenceList kind="question" rows={view.questions} title="Preguntas con mayor dificultad"
        description="Ordenadas por porcentaje de error. Solo incluye preguntas que alcanzan el mínimo de respuestas seleccionado."/>
      <EvidenceList kind="block" rows={view.blocks} title="Bloques con menor cierre"
        description="Ordenados por porcentaje de finalización. Revisa primero los que tengan suficiente actividad."/>
    </div>
    <p className="analytics-workbench-foot">Este tablero es exclusivamente administrativo. Utiliza los agregados existentes de Supabase y no revela respuestas individuales del examen.</p>
  </div>
}
