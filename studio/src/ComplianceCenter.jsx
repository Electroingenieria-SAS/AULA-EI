import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Briefcase, Layers3, Settings2, ShieldCheck, Target } from 'lucide-react'
import { getError, slugify, supabase } from './shared.js'
import {
  AutomationRunPanel, ComplianceAnalytics, CompetencyCourseMapper, SupervisorAssignments,
} from './ComplianceAdvanced.jsx'
import {
  AutomationPanel, ComplianceError, ComplianceLoading, CompliancePanel,
  ComplianceSetupPending, CompetenciesPanel, Overview, PathsPanel, PositionsPanel,
} from './compliance/CompliancePanels.jsx'

const SECTION_LABELS = {
  overview: 'Resumen',
  positions: 'Cargos y personas',
  competencies: 'Competencias',
  paths: 'Rutas',
  automation: 'Automatizaciones',
  compliance: 'Cumplimiento',
  analytics: 'Analítica',
}

function sectionIcon(key) {
  const icons = {
    overview: Activity,
    positions: Briefcase,
    competencies: Target,
    paths: Layers3,
    automation: Settings2,
    compliance: ShieldCheck,
    analytics: Activity,
  }
  const Icon = icons[key] || Activity
  return <Icon size={16} />
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
  const [complianceStatus, setComplianceStatus] = useState('all')
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
    return complianceRows.filter((row) => (complianceStatus === 'all' || row.compliance_state === complianceStatus) && [
      row.full_name, row.email, row.position_name, row.path_name, row.course_title, row.compliance_state,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [complianceRows, complianceQuery, complianceStatus])

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
      statusFilter={complianceStatus}
      setStatusFilter={setComplianceStatus}
      snapshot={snapshot}
    />}

    {section === 'analytics' && <ComplianceAnalytics setMessage={setMessage} />}
  </div>
}
