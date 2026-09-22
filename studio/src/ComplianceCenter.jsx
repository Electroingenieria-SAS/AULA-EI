import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BadgeCheck, BookOpen, Briefcase, CheckCircle2,
  ChevronRight, Clock3, Layers3, Link2, Loader2, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Sparkles, Target, UserCheck, Users, X,
} from 'lucide-react'
import { getError, slugify, supabase } from './shared.js'
import {
  AutomationRunPanel, ComplianceAnalytics, CompetencyCourseMapper, SupervisorAssignments,
} from './ComplianceAdvanced.jsx'

const SECTION_LABELS = {
  overview: 'Resumen',
  positions: 'Cargos y personas',
  competencies: 'Competencias',
  paths: 'Rutas',
  automation: 'Automatizaciones',
  compliance: 'Cumplimiento',
  analytics: 'Analítica',
}

const STATE_LABELS = {
  compliant: ['Al día', 'green'],
  expiring: ['Por vencer', 'yellow'],
  overdue: ['Vencida', 'red'],
  expired: ['Evidencia vencida', 'red'],
  in_progress: ['En progreso', 'blue'],
  assigned: ['Asignada', 'blue'],
  not_assigned: ['Sin matrícula', 'neutral'],
}

export default function ComplianceCenter({ courses = [], profiles = [], setMessage }) {
  const [section, setSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [schemaReady, setSchemaReady] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [positions, setPositions] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [positionCompetencies, setPositionCompetencies] = useState([])
  const [paths, setPaths] = useState([])
  const [pathCourses, setPathCourses] = useState([])
  const [positionPaths, setPositionPaths] = useState([])
  const [people, setPeople] = useState([])
  const [automationRules, setAutomationRules] = useState([])
  const [complianceRows, setComplianceRows] = useState([])
  const [snapshot, setSnapshot] = useState({})

  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [selectedPathId, setSelectedPathId] = useState('')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [complianceQuery, setComplianceQuery] = useState('')
  const [positionDraft, setPositionDraft] = useState({ name: '', department: '', position_type: 'cargo' })
  const [competencyDraft, setCompetencyDraft] = useState({ name: '', category: 'corporativa' })
  const [pathDraft, setPathDraft] = useState({ name: '', description: '' })

  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === 'published'),
    [courses],
  )

  const selectedPosition = positions.find((item) => item.id === selectedPositionId) || positions[0] || null
  const selectedPath = paths.find((item) => item.id === selectedPathId) || paths[0] || null

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        positionsResult,
        competenciesResult,
        positionCompetenciesResult,
        pathsResult,
        pathCoursesResult,
        positionPathsResult,
        peopleResult,
        rulesResult,
        snapshotResult,
        rowsResult,
      ] = await Promise.all([
        supabase.from('job_positions').select('*').order('sort_order').order('name'),
        supabase.from('training_competencies').select('*').order('category').order('name'),
        supabase.from('job_position_competencies').select('position_id,competency_id,required_level,weight'),
        supabase.from('learning_paths').select('*').order('name'),
        supabase.from('learning_path_courses').select('path_id,course_id,sort_order,required,due_days,recertification_months').order('sort_order'),
        supabase.from('job_position_paths').select('position_id,path_id,required,due_days,recertification_months'),
        supabase.from('profiles').select('id,email,full_name,is_active,job_position_id,supervisor_id').order('full_name'),
        supabase.from('training_automation_rules').select('*').order('created_at'),
        supabase.rpc('admin_training_engine_snapshot'),
        supabase.rpc('admin_training_compliance_rows'),
      ])

      const results = [
        positionsResult, competenciesResult, positionCompetenciesResult, pathsResult,
        pathCoursesResult, positionPathsResult, peopleResult, rulesResult,
        snapshotResult, rowsResult,
      ]
      const firstError = results.find((result) => result.error)?.error
      if (firstError) {
        const code = String(firstError.code || '')
        const message = String(firstError.message || '')
        const missingSchema = ['42P01', '42703', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code)
          || /job_positions|training_competencies|learning_paths|admin_training_engine/i.test(message)
        if (missingSchema) {
          setSchemaReady(false)
          setLoadError('La interfaz ya está instalada, pero la migración del Motor de Formación y Cumplimiento todavía no está aplicada en este proyecto de Supabase.')
          return
        }
        throw firstError
      }

      setSchemaReady(true)
      setPositions(positionsResult.data || [])
      setCompetencies(competenciesResult.data || [])
      setPositionCompetencies(positionCompetenciesResult.data || [])
      setPaths(pathsResult.data || [])
      setPathCourses(pathCoursesResult.data || [])
      setPositionPaths(positionPathsResult.data || [])
      setPeople(peopleResult.data || [])
      setAutomationRules(rulesResult.data || [])
      setSnapshot(snapshotResult.data || {})
      setComplianceRows(rowsResult.data || [])

      if (!selectedPositionId && positionsResult.data?.length) setSelectedPositionId(positionsResult.data[0].id)
      if (!selectedPathId && pathsResult.data?.length) setSelectedPathId(pathsResult.data[0].id)
    } catch (error) {
      setLoadError(getError(error, 'No fue posible cargar el Motor de Formación y Cumplimiento.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const run = async (key, operation, success) => {
    setBusy(key)
    try {
      await operation()
      if (success) setMessage(success)
      await load()
    } catch (error) {
      setMessage(getError(error, 'No fue posible completar la operación.'))
    } finally {
      setBusy('')
    }
  }

  const createPosition = async () => {
    const name = positionDraft.name.trim()
    if (name.length < 3) return setMessage('Escribe un nombre de cargo de al menos 3 caracteres.')
    const code = slugify(name).replaceAll('-', '_').toUpperCase()
    await run('create-position', async () => {
      const { error } = await supabase.from('job_positions').insert({
        code,
        name,
        department: positionDraft.department.trim() || null,
        position_type: positionDraft.position_type,
        is_active: true,
      })
      if (error) throw error
      setPositionDraft({ name: '', department: '', position_type: 'cargo' })
    }, 'Cargo creado correctamente.')
  }

  const createCompetency = async () => {
    const name = competencyDraft.name.trim()
    if (name.length < 3) return setMessage('Escribe una competencia de al menos 3 caracteres.')
    const code = slugify(name).replaceAll('-', '_').toUpperCase()
    await run('create-competency', async () => {
      const { error } = await supabase.from('training_competencies').insert({
        code,
        name,
        category: competencyDraft.category.trim() || 'corporativa',
        is_active: true,
      })
      if (error) throw error
      setCompetencyDraft({ name: '', category: 'corporativa' })
    }, 'Competencia creada correctamente.')
  }

  const createPath = async () => {
    const name = pathDraft.name.trim()
    if (name.length < 3) return setMessage('Escribe un nombre de ruta de al menos 3 caracteres.')
    const code = 'RUTA_' + slugify(name).replaceAll('-', '_').toUpperCase()
    await run('create-path', async () => {
      const { error } = await supabase.from('learning_paths').insert({
        code,
        name,
        description: pathDraft.description.trim() || null,
        is_active: true,
      })
      if (error) throw error
      setPathDraft({ name: '', description: '' })
    }, 'Ruta creada correctamente.')
  }

  const assignPosition = async (userId, positionId) => {
    await run('person:' + userId, async () => {
      const { data, error } = await supabase.rpc('admin_set_user_job_position', {
        p_user_id: userId,
        p_position_id: positionId || null,
        p_notes: 'Asignado desde Motor de Formación y Cumplimiento',
      })
      if (error) throw error
      const processed = Number(data?.sync?.processed || 0)
      setMessage('Cargo actualizado. El motor revisó ' + processed + ' obligación(es) formativa(s).')
    })
  }

  const syncEngine = async () => {
    await run('sync-engine', async () => {
      const { data, error } = await supabase.rpc('admin_sync_training_engine')
      if (error) throw error
      setMessage('Motor sincronizado: ' + String(data?.users_processed || 0) + ' persona(s) y ' + String(data?.requirements_processed || 0) + ' requisito(s) procesados.')
    })
  }

  const setCompetencyForPosition = async (competencyId, enabled) => {
    if (!selectedPosition) return
    await run('competency:' + competencyId, async () => {
      if (enabled) {
        const { error } = await supabase.from('job_position_competencies').upsert({
          position_id: selectedPosition.id,
          competency_id: competencyId,
          required_level: 1,
          weight: 1,
        }, { onConflict: 'position_id,competency_id' })
        if (error) throw error
      } else {
        const { error } = await supabase.from('job_position_competencies')
          .delete().eq('position_id', selectedPosition.id).eq('competency_id', competencyId)
        if (error) throw error
      }
    })
  }

  const updateCompetencyLevel = async (competencyId, level) => {
    if (!selectedPosition) return
    await run('level:' + competencyId, async () => {
      const { error } = await supabase.from('job_position_competencies').update({
        required_level: Number(level),
      }).eq('position_id', selectedPosition.id).eq('competency_id', competencyId)
      if (error) throw error
    })
  }

  const setPathForPosition = async (pathId, enabled) => {
    if (!selectedPosition) return
    await run('position-path:' + pathId, async () => {
      if (enabled) {
        const { error } = await supabase.from('job_position_paths').upsert({
          position_id: selectedPosition.id,
          path_id: pathId,
          required: true,
          due_days: 30,
          recertification_months: null,
        }, { onConflict: 'position_id,path_id' })
        if (error) throw error
      } else {
        const { error } = await supabase.from('job_position_paths')
          .delete().eq('position_id', selectedPosition.id).eq('path_id', pathId)
        if (error) throw error
      }
    })
  }

  const linkCourseToPath = async (courseId) => {
    if (!selectedPath || !courseId) return
    const existing = pathCourses.filter((item) => item.path_id === selectedPath.id)
    const nextOrder = existing.length ? Math.max(...existing.map((item) => Number(item.sort_order || 0))) + 10 : 10
    await run('path-course:' + courseId, async () => {
      const { error } = await supabase.from('learning_path_courses').upsert({
        path_id: selectedPath.id,
        course_id: courseId,
        sort_order: nextOrder,
        required: true,
        due_days: 30,
        recertification_months: null,
      }, { onConflict: 'path_id,course_id' })
      if (error) throw error
    }, 'Capacitación agregada a la ruta.')
  }

  const unlinkCourseFromPath = async (courseId) => {
    if (!selectedPath) return
    await run('unlink-course:' + courseId, async () => {
      const { error } = await supabase.from('learning_path_courses')
        .delete().eq('path_id', selectedPath.id).eq('course_id', courseId)
      if (error) throw error
    }, 'Capacitación retirada de la ruta.')
  }

  const updatePathCourse = async (courseId, patch) => {
    if (!selectedPath) return
    await run('path-course-settings:' + courseId, async () => {
      const { error } = await supabase.from('learning_path_courses')
        .update(patch).eq('path_id', selectedPath.id).eq('course_id', courseId)
      if (error) throw error
    })
  }

  const toggleAutomation = async (rule) => {
    await run('automation:' + rule.id, async () => {
      const { error } = await supabase.from('training_automation_rules')
        .update({ is_active: !rule.is_active }).eq('id', rule.id)
      if (error) throw error
    }, 'Automatización actualizada.')
  }

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase()
    if (!q) return people
    return people.filter((person) => [person.full_name, person.email]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  }, [people, peopleQuery])

  const filteredCompliance = useMemo(() => {
    const q = complianceQuery.trim().toLowerCase()
    if (!q) return complianceRows
    return complianceRows.filter((row) => [
      row.full_name, row.email, row.position_name, row.path_name, row.course_title, row.compliance_state,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [complianceRows, complianceQuery])

  if (loading) return <ComplianceLoading />
  if (!schemaReady) return <ComplianceSetupPending error={loadError} />
  if (loadError) return <ComplianceError text={loadError} retry={load} />

  return <div className="compliance-center">
    <section className="compliance-hero">
      <div>
        <span className="eyebrow-light">Motor de Formación y Cumplimiento</span>
        <h2>Cargo → competencias → ruta → evidencia.</h2>
        <p>Conecta el puesto de cada persona con las capacidades esperadas, las capacitaciones obligatorias, sus vencimientos y la recertificación.</p>
      </div>
      <div className="compliance-hero-score">
        <span>Cumplimiento actual</span>
        <strong>{Number(snapshot.compliance_percent || 0).toFixed(1)}%</strong>
        <small>{snapshot.compliant || 0} de {snapshot.requirements || 0} requisitos al día</small>
      </div>
    </section>

    <nav className="compliance-tabs">
      {Object.entries(SECTION_LABELS).map(([key, label]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}>
        {sectionIcon(key)}<span>{label}</span>
      </button>)}
    </nav>

    {section === 'overview' && <Overview
      snapshot={snapshot}
      positions={positions}
      paths={paths}
      automationRules={automationRules}
      complianceRows={complianceRows}
      syncEngine={syncEngine}
      syncing={busy === 'sync-engine'}
      setSection={setSection}
    />}

    {section === 'positions' && <>
      <PositionsPanel
        positions={positions}
        selectedPosition={selectedPosition}
        setSelectedPositionId={setSelectedPositionId}
        positionDraft={positionDraft}
        setPositionDraft={setPositionDraft}
        createPosition={createPosition}
        creating={busy === 'create-position'}
        people={filteredPeople}
        peopleQuery={peopleQuery}
        setPeopleQuery={setPeopleQuery}
        assignPosition={assignPosition}
        busy={busy}
        paths={paths}
        positionPaths={positionPaths}
        setPathForPosition={setPathForPosition}
      />
      <SupervisorAssignments people={people} refresh={load} setMessage={setMessage} />
    </>}

    {section === 'competencies' && <>
      <CompetenciesPanel
        positions={positions}
        selectedPosition={selectedPosition}
        setSelectedPositionId={setSelectedPositionId}
        competencies={competencies}
        mappings={positionCompetencies}
        setCompetencyForPosition={setCompetencyForPosition}
        updateCompetencyLevel={updateCompetencyLevel}
        busy={busy}
        draft={competencyDraft}
        setDraft={setCompetencyDraft}
        createCompetency={createCompetency}
      />
      <CompetencyCourseMapper competencies={competencies} courses={publishedCourses} setMessage={setMessage} />
    </>}

    {section === 'paths' && <PathsPanel
      paths={paths}
      selectedPath={selectedPath}
      setSelectedPathId={setSelectedPathId}
      pathCourses={pathCourses}
      courses={publishedCourses}
      linkCourseToPath={linkCourseToPath}
      unlinkCourseFromPath={unlinkCourseFromPath}
      updatePathCourse={updatePathCourse}
      busy={busy}
      draft={pathDraft}
      setDraft={setPathDraft}
      createPath={createPath}
    />}

    {section === 'automation' && <>
      <AutomationPanel
        rules={automationRules}
        toggleAutomation={toggleAutomation}
        busy={busy}
        syncEngine={syncEngine}
        syncing={busy === 'sync-engine'}
      />
      <AutomationRunPanel setMessage={setMessage} />
    </>}

    {section === 'compliance' && <CompliancePanel
      rows={filteredCompliance}
      query={complianceQuery}
      setQuery={setComplianceQuery}
      snapshot={snapshot}
    />}

    {section === 'analytics' && <ComplianceAnalytics setMessage={setMessage} />}
  </div>
}

function Overview({ snapshot, positions, paths, automationRules, complianceRows, syncEngine, syncing, setSection }) {
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
          <button className="primary-button" onClick={syncEngine} disabled={syncing}>{syncing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} Sincronizar motor</button>
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

function PositionsPanel({
  positions, selectedPosition, setSelectedPositionId, positionDraft, setPositionDraft, createPosition, creating,
  people, peopleQuery, setPeopleQuery, assignPosition, busy, paths, positionPaths, setPathForPosition,
}) {
  const linkedPathIds = new Set(positionPaths.filter((item) => item.position_id === selectedPosition?.id).map((item) => item.path_id))
  return <div className="compliance-two-column">
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
}

function CompetenciesPanel({
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

function PathsPanel({
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

function AutomationPanel({ rules, toggleAutomation, busy, syncEngine, syncing }) {
  return <div className="compliance-automation">
    <section className="panel-card compliance-automation-intro">
      <div>
        <span className="eyebrow">Automatización</span>
        <h3>La plataforma debe buscar al usuario, no al revés.</h3>
        <p>Las reglas conectan cambios de cargo, vencimientos y recertificación con acciones automáticas.</p>
      </div>
      <button className="primary-button" onClick={syncEngine} disabled={syncing}>{syncing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} Ejecutar sincronización ahora</button>
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

function CompliancePanel({ rows, query, setQuery, snapshot }) {
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

    <label className="search-field compliance-matrix-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar persona, cargo, ruta o capacitación…" /></label>

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

function ComplianceLoading() {
  return <div className="compliance-loading" aria-busy="true">
    <div className="experience-loading-mark"><i /><i /><i /></div>
    <strong>Preparando Motor de Formación y Cumplimiento…</strong>
    <span>Conectando cargos, rutas, matrículas y evidencia.</span>
    <div className="compliance-loading-grid"><i /><i /><i /><i /></div>
  </div>
}

function ComplianceSetupPending({ error }) {
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

function ComplianceError({ text, retry }) {
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
