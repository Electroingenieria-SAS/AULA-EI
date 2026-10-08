import React from 'react'
import {
  Activity, AlertTriangle, BadgeCheck, BookOpen, Briefcase, CheckCircle2,
  ChevronRight, Clock3, Download, Layers3, Link2, Loader2, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Sparkles, Target, UserCheck, Users, X,
} from 'lucide-react'
import { complianceCsv } from './analytics-model.js'
import ComplianceFollowup from './ComplianceFollowup.jsx'
import '../styles/compliance-report.css'

const STATE_LABELS = {
  compliant: ['Al día', 'green'],
  expiring: ['Por vencer', 'yellow'],
  overdue: ['Vencida', 'red'],
  expired: ['Evidencia vencida', 'red'],
  in_progress: ['En progreso', 'blue'],
  assigned: ['Asignada', 'blue'],
  not_assigned: ['Sin matrícula', 'neutral'],
}

export function Overview({ snapshot, positions, paths, automationRules, complianceRows, syncEngine, syncing, setSection }) {
  const alerts = complianceRows.filter((row) => ['overdue', 'expired', 'expiring'].includes(row.compliance_state)).slice(0, 6)
  return <div className="compliance-overview">
    <section className="compliance-metrics">
      <Metric icon={Briefcase} label="Cargos activos" value={snapshot.positions || positions.length} />
      <Metric icon={Users} label="Personas con cargo" value={snapshot.users_with_position || 0} helper={(snapshot.without_position || 0) + ' sin cargo'} />
      <Metric icon={Layers3} label="Rutas activas" value={snapshot.paths || paths.length} />
      <Metric icon={Target} label="Requisitos" value={snapshot.requirements || 0} helper={(snapshot.overdue || 0) + ' vencidos'} />
      <Metric icon={BadgeCheck} label="Al día" value={snapshot.compliant || 0} />
      <Metric icon={Activity} label="Automatizaciones" value={automationRules.filter((rule) => rule.is_active).length} helper={automationRules.length + ' configuradas'} />
    </section>

    <div className="compliance-overview-grid">
      <section className="panel-card compliance-flow-card">
        <div className="section-title-row">
          <div><span className="eyebrow">Flujo operativo</span><h3>El motor ya conecta las piezas.</h3><p>Una persona recibe un cargo, el cargo activa rutas, las rutas matriculan cursos y el cumplimiento queda trazable.</p></div>
          <ShieldCheck size={28} />
        </div>
        <div className="compliance-flow">
          {[
            [Briefcase, 'Cargo', 'Define responsabilidad'],
            [Target, 'Competencias', 'Define capacidades'],
            [Layers3, 'Ruta', 'Ordena formación'],
            [BookOpen, 'Capacitaciones', 'Ejecutan aprendizaje'],
            [BadgeCheck, 'Evidencia', 'Prueba cumplimiento'],
          ].map(([Icon, title, copy], index) => <React.Fragment key={title}>
            <article><span><Icon size={19} /></span><strong>{title}</strong><small>{copy}</small></article>
            {index < 4 && <ChevronRight className="flow-chevron" size={17} />}
          </React.Fragment>)}
        </div>
        <div className="compliance-flow-actions">
          <button className="primary-button" onClick={syncEngine}><ShieldCheck size={16} /> Revisar antes de sincronizar</button>
          <button className="secondary-button" onClick={() => setSection('positions')}><UserCheck size={16} /> Asignar cargos</button>
        </div>
      </section>

      <section className="panel-card compliance-alert-card">
        <div className="section-title-row">
          <div><span className="eyebrow">Alertas</span><h3>Atención prioritaria</h3><p>Requisitos vencidos, evidencias por expirar o personas que necesitan seguimiento.</p></div>
          <AlertTriangle size={26} />
        </div>
        <div className="compliance-alert-list">
          {alerts.map((row, index) => <article key={row.user_id + ':' + row.course_id + ':' + index}>
            <span className={'status-dot ' + (STATE_LABELS[row.compliance_state]?.[1] || 'neutral')} />
            <div><strong>{row.full_name}</strong><small>{row.course_title} · {row.position_name}</small></div>
            <StatusBadge state={row.compliance_state} />
          </article>)}
          {!alerts.length && <div className="compliance-empty-compact"><CheckCircle2 size={20} /><span>No hay alertas críticas en los requisitos configurados.</span></div>}
        </div>
      </section>
    </div>
  </div>
}

export function PositionsPanel({
  positions, selectedPosition, setSelectedPositionId, positionDraft, setPositionDraft, createPosition, creating,
  people, peopleQuery, setPeopleQuery, assignPosition, busy, paths, positionPaths, setPathForPosition,
}) {
  const linkedPathIds = new Set(positionPaths.filter((item) => item.position_id === selectedPosition?.id).map((item) => item.path_id))
  return <>
    <section className="mobile-position-overview mobile-data-view">
      <div className="mobile-position-overview-head">
        <div><span className="eyebrow">Cargos disponibles</span><strong>{positions.length} cargo(s) configurado(s)</strong></div>
        <Briefcase size={22} />
      </div>
      <div className="mobile-position-card-list">
        {positions.map((position) => {
          const assigned = people.filter((person) => person.job_position_id === position.id).length
          return <button key={position.id} className={selectedPosition?.id === position.id ? 'active' : ''} onClick={() => setSelectedPositionId(position.id)}>
            <span className="compliance-position-icon"><Briefcase size={16} /></span>
            <span><strong>{position.name}</strong><small>{position.department || 'Sin dependencia'} · {assigned} persona(s)</small></span>
            <ChevronRight size={16} />
          </button>
        })}
      </div>
    </section>

    <div className="compliance-two-column">
    <section className="panel-card compliance-catalog-panel">
      <div className="section-title-row">
        <div><span className="eyebrow">Catálogo</span><h3>Cargos y categorías</h3><p>Esta primera instancia contiene los cargos ya levantados y dos categorías generales provisionales.</p></div>
        <Briefcase size={27} />
      </div>

      <div className="compliance-position-list">
        {positions.map((position) => <button key={position.id} className={selectedPosition?.id === position.id ? 'active' : ''} onClick={() => setSelectedPositionId(position.id)}>
          <span className="compliance-position-icon"><Briefcase size={16} /></span>
          <div><strong>{position.name}</strong><small>{position.department || 'Sin dependencia'} · {position.position_type === 'categoria' ? 'Categoría provisional' : 'Cargo'}</small></div>
          <ChevronRight size={16} />
        </button>)}
      </div>

      <div className="compliance-create-box">
        <strong>Agregar otro cargo</strong>
        <input value={positionDraft.name} onChange={(event) => setPositionDraft({ ...positionDraft, name: event.target.value })} placeholder="Nombre del cargo" />
        <input value={positionDraft.department} onChange={(event) => setPositionDraft({ ...positionDraft, department: event.target.value })} placeholder="Dependencia / área" />
        <div className="compliance-inline-fields">
          <select value={positionDraft.position_type} onChange={(event) => setPositionDraft({ ...positionDraft, position_type: event.target.value })}>
            <option value="cargo">Cargo</option>
            <option value="categoria">Categoría general</option>
          </select>
          <button className="primary-button compact" onClick={createPosition} disabled={creating}>{creating ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Crear</button>
        </div>
      </div>
    </section>

    <div className="compliance-stack">
      <section className="panel-card compliance-position-detail">
        <div className="section-title-row">
          <div><span className="eyebrow">Configuración del cargo</span><h3>{selectedPosition?.name || 'Selecciona un cargo'}</h3><p>Vincula las rutas que debe cumplir una persona con este cargo.</p></div>
          <Layers3 size={26} />
        </div>
        {selectedPosition && <div className="compliance-path-toggle-grid">
          {paths.map((path) => {
            const active = linkedPathIds.has(path.id)
            return <button key={path.id} className={active ? 'active' : ''} onClick={() => setPathForPosition(path.id, !active)} disabled={busy === 'position-path:' + path.id}>
              <span>{active ? <CheckCircle2 size={18} /> : <Layers3 size={18} />}</span>
              <div><strong>{path.name}</strong><small>{active ? 'Obligatoria para este cargo' : 'No vinculada'}</small></div>
            </button>
          })}
          {!paths.length && <div className="compliance-empty-compact">Crea primero una ruta de aprendizaje.</div>}
        </div>}
      </section>

      <section className="panel-card compliance-people-panel">
        <div className="section-title-row">
          <div><span className="eyebrow">Personas</span><h3>Asignación de cargo</h3><p>Al cambiar el cargo, el motor sincroniza automáticamente las rutas obligatorias.</p></div>
          <Users size={26} />
        </div>
        <label className="search-field compliance-search"><Search size={16} /><input value={peopleQuery} onChange={(event) => setPeopleQuery(event.target.value)} placeholder="Buscar persona o correo…" /></label>
        <div className="compliance-people-list">
          {people.map((person) => <article key={person.id}>
            <div className="compliance-person-avatar">{initials(person.full_name || person.email)}</div>
            <div className="compliance-person-copy"><strong>{person.full_name || person.email}</strong><small>{person.email}</small></div>
            <select value={person.job_position_id || ''} onChange={(event) => assignPosition(person.id, event.target.value)} disabled={busy === 'person:' + person.id || person.is_active === false}>
              <option value="">Sin cargo asignado</option>
              {positions.filter((position) => position.is_active).map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
            </select>
            {busy === 'person:' + person.id && <Loader2 className="spin" size={16} />}
          </article>)}
          {!people.length && <div className="compliance-empty-compact">No hay personas que coincidan con la búsqueda.</div>}
        </div>
      </section>
    </div>
  </div>
  </>
}

export function CompetenciesPanel({
  positions, selectedPosition, setSelectedPositionId, competencies, mappings,
  setCompetencyForPosition, updateCompetencyLevel, busy, draft, setDraft, createCompetency,
}) {
  const mapped = new Map(mappings.filter((item) => item.position_id === selectedPosition?.id).map((item) => [item.competency_id, item]))
  return <div className="compliance-competency-layout">
    <section className="panel-card compliance-competency-head">
      <div>
        <span className="eyebrow">Matriz de competencias</span>
        <h3>¿Qué debe dominar cada cargo?</h3>
        <p>Activa las competencias esperadas y define un nivel requerido de 1 a 5.</p>
      </div>
      <select value={selectedPosition?.id || ''} onChange={(event) => setSelectedPositionId(event.target.value)}>
        {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
      </select>
    </section>

    <section className="compliance-competency-grid">
      {competencies.map((competency) => {
        const relation = mapped.get(competency.id)
        const active = Boolean(relation)
        return <article key={competency.id} className={'compliance-competency-card ' + (active ? 'active' : '')}>
          <button className="competency-toggle" onClick={() => setCompetencyForPosition(competency.id, !active)} disabled={busy === 'competency:' + competency.id}>
            <span>{active ? <CheckCircle2 size={20} /> : <Target size={20} />}</span>
            <div><strong>{competency.name}</strong><small>{competency.category}</small></div>
          </button>
          <p>{competency.description || 'Competencia configurable dentro del modelo de formación.'}</p>
          <div className="competency-level-row">
            <span>Nivel requerido</span>
            <div className="competency-level-buttons">
              {[1,2,3,4,5].map((level) => <button key={level} className={Number(relation?.required_level || 0) >= level ? 'filled' : ''} disabled={!active || busy === 'level:' + competency.id} onClick={() => updateCompetencyLevel(competency.id, level)}>{level}</button>)}
            </div>
          </div>
        </article>
      })}
    </section>

    <section className="panel-card compliance-create-competency">
      <div><span className="eyebrow">Ampliar catálogo</span><h3>Nueva competencia</h3></div>
      <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nombre de la competencia" />
      <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Categoría" />
      <button className="primary-button" onClick={createCompetency} disabled={busy === 'create-competency'}>{busy === 'create-competency' ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Crear competencia</button>
    </section>
  </div>
}

export function PathsPanel({
  paths, selectedPath, setSelectedPathId, pathCourses, courses, linkCourseToPath,
  unlinkCourseFromPath, updatePathCourse, busy, draft, setDraft, createPath,
}) {
  const linked = pathCourses.filter((item) => item.path_id === selectedPath?.id).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  const linkedIds = new Set(linked.map((item) => item.course_id))
  return <div className="compliance-path-layout">
    <section className="panel-card compliance-path-sidebar">
      <div className="section-title-row"><div><span className="eyebrow">Rutas</span><h3>Rutas de aprendizaje</h3></div><Layers3 size={25} /></div>
      <div className="compliance-path-list">
        {paths.map((path) => <button key={path.id} className={selectedPath?.id === path.id ? 'active' : ''} onClick={() => setSelectedPathId(path.id)}>
          <span><Layers3 size={16} /></span><div><strong>{path.name}</strong><small>v{path.version}</small></div><ChevronRight size={15} />
        </button>)}
      </div>
      <div className="compliance-create-box">
        <strong>Nueva ruta</strong>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nombre de la ruta" />
        <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Objetivo de la ruta" rows={3} />
        <button className="primary-button compact" onClick={createPath} disabled={busy === 'create-path'}>{busy === 'create-path' ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Crear ruta</button>
      </div>
    </section>

    <section className="panel-card compliance-path-builder">
      <div className="section-title-row">
        <div><span className="eyebrow">Constructor de ruta</span><h3>{selectedPath?.name || 'Selecciona una ruta'}</h3><p>{selectedPath?.description || 'Agrega capacitaciones publicadas y define su vigencia.'}</p></div>
        <BookOpen size={27} />
      </div>

      {selectedPath && <>
        <div className="compliance-linked-courses">
          {linked.map((relation, index) => {
            const course = courses.find((item) => item.id === relation.course_id)
            if (!course) return null
            return <article key={relation.course_id}>
              <span className="path-course-number">{index + 1}</span>
              <div className="path-course-copy"><strong>{course.title}</strong><small>{relation.required ? 'Obligatoria' : 'Opcional'} · aprobación {course.passing_score || 80}%</small></div>
              <label><span>Plazo</span><input key={'due:' + relation.course_id + ':' + String(relation.due_days ?? '')} type="number" min="0" defaultValue={relation.due_days ?? ''} placeholder="Días" onBlur={(event) => {
                const next = event.target.value === '' ? null : Number(event.target.value)
                if (next !== relation.due_days) updatePathCourse(relation.course_id, { due_days: next })
              }} /></label>
              <label><span>Vigencia</span><input key={'validity:' + relation.course_id + ':' + String(relation.recertification_months ?? '')} type="number" min="1" defaultValue={relation.recertification_months ?? ''} placeholder="Meses" onBlur={(event) => {
                const next = event.target.value === '' ? null : Number(event.target.value)
                if (next !== relation.recertification_months) updatePathCourse(relation.course_id, { recertification_months: next })
              }} /></label>
              <button className="icon-button danger-soft" title="Retirar de la ruta" onClick={() => unlinkCourseFromPath(relation.course_id)} disabled={busy === 'unlink-course:' + relation.course_id}><X size={16} /></button>
            </article>
          })}
          {!linked.length && <div className="compliance-empty-path"><Layers3 size={30} /><strong>La ruta todavía está vacía.</strong><span>Agrega una capacitación publicada desde el catálogo inferior.</span></div>}
        </div>

        <div className="compliance-course-pool">
          <div><strong>Capacitaciones disponibles</strong><span>Solo se muestran capacitaciones publicadas.</span></div>
          <div className="compliance-course-pool-grid">
            {courses.filter((course) => !linkedIds.has(course.id)).map((course) => <button key={course.id} onClick={() => linkCourseToPath(course.id)} disabled={busy === 'path-course:' + course.id}>
              <span><BookOpen size={16} /></span><div><strong>{course.title}</strong><small>Aprobación {course.passing_score || 80}%</small></div><Plus size={16} />
            </button>)}
          </div>
        </div>
      </>}
    </section>
  </div>
}

export function AutomationPanel({ rules, toggleAutomation, busy }) {
  return <div className="compliance-automation">
    <section className="panel-card compliance-automation-intro">
      <div>
        <span className="eyebrow">Automatización</span>
        <h3>La plataforma debe buscar al usuario, no al revés.</h3>
        <p>Las reglas conectan cambios de cargo, vencimientos y recertificación con acciones automáticas.</p>
      </div>
      <span className="automation-rule-info">La ejecución masiva se confirma exclusivamente en la simulación anterior.</span>
    </section>

    <div className="compliance-rule-grid">
      {rules.map((rule) => <article key={rule.id} className={rule.is_active ? 'active' : ''}>
        <div className="automation-rule-icon"><Settings2 size={21} /></div>
        <div className="automation-rule-copy"><span>{rule.trigger_type}</span><h3>{rule.name}</h3><p>{rule.description}</p></div>
        <div className="automation-rule-footer">
          <span className={'automation-state ' + (rule.is_active ? 'on' : 'off')}>{rule.is_active ? 'Activa' : 'Preparada'}</span>
          <button className={rule.is_active ? 'secondary-button compact' : 'primary-button compact'} onClick={() => toggleAutomation(rule)} disabled={busy === 'automation:' + rule.id}>{rule.is_active ? 'Desactivar' : 'Activar'}</button>
        </div>
      </article>)}
    </div>
  </div>
}

export function CompliancePanel({ rows, query, setQuery, snapshot, statusFilter, setStatusFilter }) {
  const exportRows = () => {
    if (!rows.length || !window.confirm('Este archivo contiene datos personales de colaboradores. ¿Descargar la matriz filtrada para uso administrativo autorizado?')) return
    const data = complianceCsv(rows)
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'aula-ei-cumplimiento-' + new Date().toISOString().slice(0,10) + '.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="compliance-matrix">
    <section className="panel-card compliance-matrix-head">
      <div>
        <span className="eyebrow">Matriz de cumplimiento</span>
        <h3>Quién debe qué, y en qué estado está.</h3>
        <p>Esta vista une cargo, ruta, capacitación, matrícula y vigencia de evidencia.</p>
      </div>
      <div className="compliance-matrix-summary">
        <span><BadgeCheck size={16} /> {snapshot.compliant || 0} al día</span>
        <span className="warning"><Clock3 size={16} /> {snapshot.due_soon || 0} por vencer</span>
        <span className="danger"><AlertTriangle size={16} /> {snapshot.overdue || 0} vencidos</span>
      </div>
    </section>

    <ComplianceFollowup rows={rows} onFocus={(identity) => {
      setStatusFilter('all')
      setQuery(identity)
    }} />

    <div className="compliance-matrix-controls">
      <label className="search-field compliance-matrix-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar persona, cargo, ruta o capacitación…" /></label>
      <label className="compliance-matrix-filter">Estado
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos</option>
          {Object.entries(STATE_LABELS).map(([code, info]) => <option key={code} value={code}>{info[0]}</option>)}
        </select>
      </label>
      <button type="button" className="secondary-button compact" disabled={!rows.length} onClick={exportRows}>
        <Download size={16}/> Exportar {rows.length} fila(s)
      </button>
    </div>
    <p className="compliance-matrix-confidential">Exportación con confirmación · Contiene datos personales · Protege el archivo y compártelo solo con personal autorizado.</p>

    <div className="compliance-table-wrap">
      <table className="compliance-table">
        <thead><tr><th>Persona</th><th>Cargo</th><th>Ruta</th><th>Capacitación</th><th>Vencimiento</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.user_id + ':' + row.course_id + ':' + index}>
            <td><strong>{row.full_name}</strong><small>{row.email}</small></td>
            <td>{row.position_name}</td>
            <td>{row.path_name}</td>
            <td><strong>{row.course_title}</strong></td>
            <td>{formatDate(row.evidence_expires_at || row.due_at)}</td>
            <td><StatusBadge state={row.compliance_state} /></td>
          </tr>)}
        </tbody>
      </table>
      {!rows.length && <div className="compliance-empty-table"><ShieldCheck size={28} /><strong>No hay requisitos que mostrar.</strong><span>Vincula cursos a las rutas para comenzar a medir cumplimiento.</span></div>}
    </div>
  </div>
}

function Metric({ icon: Icon, label, value, helper }) {
  return <article><span><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong>{helper && <em>{helper}</em>}</div></article>
}

function StatusBadge({ state }) {
  const [label, tone] = STATE_LABELS[state] || [state || 'Sin estado', 'neutral']
  return <span className={'compliance-status ' + tone}>{label}</span>
}

export function ComplianceLoading() {
  return <div className="compliance-loading" aria-busy="true">
    <div className="experience-loading-mark"><i /><i /><i /></div>
    <strong>Preparando Motor de Formación y Cumplimiento…</strong>
    <span>Conectando cargos, rutas, matrículas y evidencia.</span>
    <div className="compliance-loading-grid"><i /><i /><i /><i /></div>
  </div>
}

export function ComplianceSetupPending({ error }) {
  return <section className="panel-card compliance-setup-pending">
    <span className="compliance-setup-icon"><Settings2 size={30} /></span>
    <div>
      <span className="eyebrow">Configuración pendiente</span>
      <h2>El módulo ya está listo; falta instalar su esquema en Supabase.</h2>
      <p>{error}</p>
      <small>Migración preparada: <code>20260921164500_training_compliance_engine_v1.sql</code></small>
    </div>
  </section>
}

export function ComplianceError({ text, retry }) {
  return <section className="panel-card compliance-setup-pending error">
    <span className="compliance-setup-icon"><AlertTriangle size={30} /></span>
    <div><span className="eyebrow">No fue posible cargar el motor</span><h2>Revisa la conexión y vuelve a intentar.</h2><p>{text}</p><button className="secondary-button" onClick={retry}><RefreshCw size={15} /> Reintentar</button></div>
  </section>
}

function sectionIcon(key) {
  const map = {
    overview: <Activity size={16} />,
    positions: <Briefcase size={16} />,
    competencies: <Target size={16} />,
    paths: <Layers3 size={16} />,
    automation: <Settings2 size={16} />,
    compliance: <ShieldCheck size={16} />,
    analytics: <Activity size={16} />,
  }
  return map[key]
}

function initials(value) {
  return String(value || 'EI').split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Sin vencimiento'
  try {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  } catch {
    return String(value)
  }
}
