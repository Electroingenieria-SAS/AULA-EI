import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Award, Bell, BookOpen, Bot, BrainCircuit, CalendarClock,
  CheckCircle2, ChevronRight, CircleGauge, Clock3, Cloud, Database, FileArchive,
  Flame, Gauge, GraduationCap, Layers3, Link2, Loader2, Medal, Network, Package,
  PlayCircle, PlugZap, RefreshCw, Route, Search, ShieldCheck, Sparkles, Target,
  Trophy, UserCheck, Users, WandSparkles, Waypoints, Workflow, X, Zap,
} from 'lucide-react'
import {
  PREVIEW_AUTOMATIONS,
  PREVIEW_COMPETENCIES,
  PREVIEW_CONNECTORS,
  PREVIEW_MISSIONS,
  PREVIEW_PATHS,
  PREVIEW_POSITIONS,
  PREVIEW_POSITION_COMPETENCIES,
  dueBucket,
  previewSnapshot,
} from '../../learning360/preview.js'
import { getError, supabase } from './shared.js'

const SECTIONS = [
  ['overview', 'Resumen', CircleGauge],
  ['positions', 'Cargos y competencias', Users],
  ['paths', 'Rutas', Route],
  ['automations', 'Automatizaciones', Workflow],
  ['compliance', 'Cumplimiento', ShieldCheck],
  ['analytics', 'Analítica', Gauge],
  ['ecosystem', 'Ecosistema', Network],
]

const PACKAGE_STANDARDS = [
  ['scorm_1_2', 'SCORM 1.2'],
  ['scorm_2004', 'SCORM 2004'],
  ['xapi', 'xAPI'],
  ['cmi5', 'cmi5'],
  ['lti_1_3', 'LTI 1.3'],
]

function missingSchema(error) {
  const code = String(error?.code || '')
  const text = String(error?.message || error || '').toLowerCase()
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST204'].includes(code)
    || text.includes('does not exist')
    || text.includes('schema cache')
    || text.includes('could not find the table')
    || text.includes('could not find the function')
}

export default function Formation360({ profiles = [], courses = [], enrollments = [], setMessage, refresh }) {
  const [section, setSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [persistent, setPersistent] = useState(null)
  const [positions, setPositions] = useState(PREVIEW_POSITIONS)
  const [competencies, setCompetencies] = useState(PREVIEW_COMPETENCIES)
  const [positionCompetencies, setPositionCompetencies] = useState(PREVIEW_POSITION_COMPETENCIES)
  const [paths, setPaths] = useState(PREVIEW_PATHS)
  const [automations, setAutomations] = useState(PREVIEW_AUTOMATIONS)
  const [connectors, setConnectors] = useState(PREVIEW_CONNECTORS)
  const [missions, setMissions] = useState(PREVIEW_MISSIONS)
  const [people, setPeople] = useState(profiles)
  const [snapshot, setSnapshot] = useState(() => previewSnapshot({ profiles, enrollments, courses }))
  const [calendar, setCalendar] = useState([])
  const [packages, setPackages] = useState([])
  const [aiRequests, setAiRequests] = useState([])
  const [localAssignments, setLocalAssignments] = useState({})
  const [positionSearch, setPositionSearch] = useState('')
  const [personSearch, setPersonSearch] = useState('')
  const [pathSearch, setPathSearch] = useState('')
  const [packageForm, setPackageForm] = useState({ title: '', standard: 'scorm_1_2', launch_url: '' })
  const [calendarForm, setCalendarForm] = useState({ title: '', event_type: 'training', starts_at: '', location: '' })
  const [aiForm, setAiForm] = useState({ request_type: 'outline', prompt: '' })

  const load = async () => {
    setLoading(true)
    try {
      const positionsResult = await supabase.from('job_positions').select('*').order('name')
      if (positionsResult.error) {
        if (missingSchema(positionsResult.error)) {
          setPersistent(false)
          setPositions(PREVIEW_POSITIONS)
          setCompetencies(PREVIEW_COMPETENCIES)
          setPositionCompetencies(PREVIEW_POSITION_COMPETENCIES)
          setPaths(PREVIEW_PATHS)
          setAutomations(PREVIEW_AUTOMATIONS)
          setConnectors(PREVIEW_CONNECTORS)
          setMissions(PREVIEW_MISSIONS)
          setPeople(profiles)
          setSnapshot(previewSnapshot({ profiles, enrollments, courses }))
          return
        }
        throw positionsResult.error
      }

      setPersistent(true)
      const [
        competencyResult,
        mappingResult,
        pathResult,
        stepResult,
        automationResult,
        connectorResult,
        missionResult,
        peopleResult,
        snapshotResult,
        calendarResult,
        packagesResult,
        aiResult,
      ] = await Promise.all([
        supabase.from('competencies').select('*').order('category').order('name'),
        supabase.from('job_position_competencies').select('*'),
        supabase.from('learning_paths').select('*').order('name'),
        supabase.from('learning_path_steps').select('*').order('path_id').order('sort_order'),
        supabase.from('learning_automation_rules').select('*').order('priority'),
        supabase.from('integration_connectors').select('*').order('name'),
        supabase.from('gamification_missions').select('*').eq('active', true).order('title'),
        supabase.from('profiles').select('id,email,full_name,role,is_active,job_position_id,department,site,supervisor_id').order('full_name'),
        supabase.rpc('admin_learning_360_snapshot'),
        supabase.from('training_calendar_events').select('*').order('starts_at', { ascending: true }).limit(30),
        supabase.from('external_content_packages').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('ai_authoring_requests').select('*').order('created_at', { ascending: false }).limit(30),
      ])

      const errors = [
        competencyResult.error, mappingResult.error, pathResult.error, stepResult.error,
        automationResult.error, connectorResult.error, missionResult.error, peopleResult.error,
      ].filter(Boolean)
      if (errors.length) throw errors[0]

      const steps = stepResult.data || []
      setPositions(positionsResult.data || [])
      setCompetencies(competencyResult.data || [])
      setPositionCompetencies(mappingResult.data || [])
      setPaths((pathResult.data || []).map((path) => ({
        ...path,
        steps: steps.filter((step) => step.path_id === path.id),
      })))
      setAutomations(automationResult.data || [])
      setConnectors(connectorResult.data || [])
      setMissions(missionResult.data || [])
      setPeople(peopleResult.data || profiles)
      setSnapshot(snapshotResult.error ? previewSnapshot({ profiles, enrollments, courses }) : (snapshotResult.data || {}))
      setCalendar(calendarResult.error ? [] : (calendarResult.data || []))
      setPackages(packagesResult.error ? [] : (packagesResult.data || []))
      setAiRequests(aiResult.error ? [] : (aiResult.data || []))
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible cargar Formación 360.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const positionById = useMemo(() => new Map(positions.map((item) => [item.id, item])), [positions])
  const competencyById = useMemo(() => new Map(competencies.map((item) => [item.id, item])), [competencies])
  const positionCounts = useMemo(() => {
    const map = new Map()
    people.forEach((person) => {
      const positionId = person.job_position_id || localAssignments[person.id]
      if (positionId) map.set(positionId, (map.get(positionId) || 0) + 1)
    })
    return map
  }, [people, localAssignments])

  const filteredPeople = useMemo(() => {
    const query = personSearch.trim().toLowerCase()
    if (!query) return people
    return people.filter((person) => ((person.full_name || '') + ' ' + (person.email || '')).toLowerCase().includes(query))
  }, [people, personSearch])

  const filteredPositions = useMemo(() => {
    const query = positionSearch.trim().toLowerCase()
    if (!query) return positions
    return positions.filter((item) => (item.name + ' ' + (item.department || '')).toLowerCase().includes(query))
  }, [positions, positionSearch])

  const filteredPaths = useMemo(() => {
    const query = pathSearch.trim().toLowerCase()
    if (!query) return paths
    return paths.filter((item) => (item.name + ' ' + (item.description || '')).toLowerCase().includes(query))
  }, [paths, pathSearch])

  const dueRows = useMemo(() => {
    return enrollments
      .map((item) => ({
        ...item,
        bucket: dueBucket(item.due_at),
        person: item.user || people.find((person) => person.id === item.user_id),
        course: item.course || courses.find((course) => course.id === item.course_id),
      }))
      .filter((item) => item.bucket && !['completed', 'cancelled'].includes(item.status))
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
  }, [enrollments, people, courses])

  const assignPosition = async (userId, positionId) => {
    if (!positionId) return
    setWorking('position:' + userId)
    try {
      if (!persistent) {
        setLocalAssignments((current) => ({ ...current, [userId]: positionId }))
        setMessage?.('Cargo aplicado en modo provisional. Se persistirá cuando se aplique la migración Formación 360.')
        return
      }
      const { error } = await supabase.rpc('admin_assign_profile_position', {
        p_user_id: userId,
        p_position_id: positionId,
      })
      if (error) throw error
      setMessage?.('Cargo y rutas asociadas actualizados.')
      await load()
      await refresh?.()
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible asignar el cargo.'))
    } finally {
      setWorking('')
    }
  }

  const validatePosition = async (position) => {
    setWorking('validate:' + position.id)
    try {
      if (!persistent) {
        setPositions((current) => current.map((item) => item.id === position.id ? { ...item, status: 'validated' } : item))
        setMessage?.('Cargo marcado como validado solo en esta sesión provisional.')
        return
      }
      const { error } = await supabase.from('job_positions').update({ status: 'validated', updated_at: new Date().toISOString() }).eq('id', position.id)
      if (error) throw error
      await load()
      setMessage?.('Cargo marcado como validado.')
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible validar el cargo.'))
    } finally {
      setWorking('')
    }
  }

  const linkCourse = async (step, courseId) => {
    setWorking('step:' + step.id)
    try {
      if (!persistent) {
        setPaths((current) => current.map((path) => ({
          ...path,
          steps: (path.steps || []).map((item) => item.id === step.id ? { ...item, course_id: courseId || null } : item),
        })))
        setMessage?.('Vinculación aplicada en modo provisional.')
        return
      }
      const { error } = await supabase.from('learning_path_steps').update({ course_id: courseId || null }).eq('id', step.id)
      if (error) throw error
      await load()
      setMessage?.('Paso de ruta vinculado a la capacitación.')
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible vincular la capacitación.'))
    } finally {
      setWorking('')
    }
  }

  const toggleAutomation = async (rule) => {
    setWorking('automation:' + rule.id)
    try {
      if (!persistent) {
        setAutomations((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))
        return
      }
      const { error } = await supabase.from('learning_automation_rules')
        .update({ active: !rule.active, updated_at: new Date().toISOString() })
        .eq('id', rule.id)
      if (error) throw error
      await load()
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible actualizar la automatización.'))
    } finally {
      setWorking('')
    }
  }

  const runAutomations = async () => {
    setWorking('run-automations')
    try {
      if (!persistent) {
        setMessage?.('Simulación: rutas por cargo, avisos a 7 días, fallos repetidos, inactividad y recertificación están configurados. La ejecución real requiere aplicar la migración.')
        return
      }
      const { data, error } = await supabase.rpc('admin_run_learning_automations')
      if (error) throw error
      const total = Number(data?.paths_assigned || 0) + Number(data?.course_enrollments || 0) + Number(data?.notifications || 0)
      setMessage?.('Automatizaciones ejecutadas. ' + total + ' acción(es) generadas.')
      await load()
      await refresh?.()
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible ejecutar las automatizaciones.'))
    } finally {
      setWorking('')
    }
  }

  const registerPackage = async (event) => {
    event.preventDefault()
    if (!packageForm.title.trim()) return
    setWorking('package')
    try {
      const payload = {
        title: packageForm.title.trim(),
        standard: packageForm.standard,
        launch_url: packageForm.launch_url.trim() || null,
        status: 'registered',
      }
      if (!persistent) {
        setPackages((current) => [{ id: 'preview-package-' + Date.now(), ...payload, created_at: new Date().toISOString() }, ...current])
        setPackageForm({ title: '', standard: 'scorm_1_2', launch_url: '' })
        setMessage?.('Paquete registrado en modo provisional.')
        return
      }
      const { error } = await supabase.from('external_content_packages').insert(payload)
      if (error) throw error
      setPackageForm({ title: '', standard: 'scorm_1_2', launch_url: '' })
      await load()
      setMessage?.('Paquete externo registrado.')
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible registrar el paquete.'))
    } finally {
      setWorking('')
    }
  }

  const createCalendarEvent = async (event) => {
    event.preventDefault()
    if (!calendarForm.title.trim() || !calendarForm.starts_at) return
    setWorking('calendar')
    try {
      const payload = {
        title: calendarForm.title.trim(),
        event_type: calendarForm.event_type,
        starts_at: new Date(calendarForm.starts_at).toISOString(),
        location: calendarForm.location.trim() || null,
        active: true,
      }
      if (!persistent) {
        setCalendar((current) => [...current, { id: 'preview-event-' + Date.now(), ...payload }].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
        setCalendarForm({ title: '', event_type: 'training', starts_at: '', location: '' })
        setMessage?.('Evento creado en modo provisional.')
        return
      }
      const { error } = await supabase.from('training_calendar_events').insert(payload)
      if (error) throw error
      setCalendarForm({ title: '', event_type: 'training', starts_at: '', location: '' })
      await load()
      setMessage?.('Evento agregado al calendario.')
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible crear el evento.'))
    } finally {
      setWorking('')
    }
  }

  const queueAiRequest = async (event) => {
    event.preventDefault()
    if (!aiForm.prompt.trim()) return
    setWorking('ai')
    try {
      const payload = {
        request_type: aiForm.request_type,
        prompt: aiForm.prompt.trim(),
        status: 'queued',
      }
      if (!persistent) {
        setAiRequests((current) => [{ id: 'preview-ai-' + Date.now(), ...payload, created_at: new Date().toISOString() }, ...current])
        setAiForm({ request_type: 'outline', prompt: '' })
        setMessage?.('Solicitud IA agregada a la cola provisional. Falta conectar el proveedor de IA.')
        return
      }
      const { data: session } = await supabase.auth.getSession()
      const requestedBy = session.session?.user?.id
      const { error } = await supabase.from('ai_authoring_requests').insert({ ...payload, requested_by: requestedBy })
      if (error) throw error
      setAiForm({ request_type: 'outline', prompt: '' })
      await load()
      setMessage?.('Solicitud IA en cola. El ejecutor de IA se conectará en la siguiente capa.')
    } catch (error) {
      setMessage?.(getError(error, 'No fue posible registrar la solicitud IA.'))
    } finally {
      setWorking('')
    }
  }

  if (loading) return <FormationLoading />

  return <div className="formation360">
    <section className="formation360-hero">
      <div>
        <span className="formation360-kicker"><Sparkles size={15} /> Motor de formación y cumplimiento</span>
        <h2>Aula EI Formación 360</h2>
        <p>Conecta cargo, competencia, ruta, capacitación, evidencia, vencimiento, recertificación y analítica en un mismo ciclo.</p>
        <div className="formation360-hero-actions">
          <button className="primary-button" onClick={runAutomations} disabled={working === 'run-automations'}>
            {working === 'run-automations' ? <Loader2 className="spin" size={17} /> : <Zap size={17} />}
            Ejecutar automatizaciones
          </button>
          <button className="secondary-button" onClick={load}><RefreshCw size={16} /> Actualizar motor</button>
        </div>
      </div>
      <div className="formation360-score">
        <strong>{snapshot.people_with_position || 0}<small>/{snapshot.people_total || 0}</small></strong>
        <span>personas con cargo configurado</span>
        <div><i style={{ width: ((snapshot.people_total ? (snapshot.people_with_position || 0) / snapshot.people_total : 0) * 100) + '%' }} /></div>
      </div>
    </section>

    <div className={'formation360-mode ' + (persistent ? 'ready' : 'preview')}>
      {persistent ? <Database size={16} /> : <AlertTriangle size={16} />}
      <div>
        <strong>{persistent ? 'Motor persistente activo' : 'Primera instancia en modo provisional'}</strong>
        <span>{persistent
          ? 'Cargos, rutas, automatizaciones y analítica están leyendo/escribiendo en Supabase.'
          : 'La migración está versionada en el repositorio, pero el conector actual no permite aplicarla. Puedes revisar y configurar esta primera propuesta sin afectar producción.'}</span>
      </div>
    </div>

    <nav className="formation360-tabs">
      {SECTIONS.map(([id, label, Icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
        <Icon size={16} /><span>{label}</span>
      </button>)}
    </nav>

    {section === 'overview' && <Overview
      snapshot={snapshot}
      positions={positions}
      paths={paths}
      automations={automations}
      missions={missions}
      dueRows={dueRows}
      onOpen={setSection}
    />}

    {section === 'positions' && <Positions
      positions={filteredPositions}
      allPositions={positions}
      competencies={competencies}
      mappings={positionCompetencies}
      competencyById={competencyById}
      counts={positionCounts}
      people={filteredPeople}
      localAssignments={localAssignments}
      positionSearch={positionSearch}
      setPositionSearch={setPositionSearch}
      personSearch={personSearch}
      setPersonSearch={setPersonSearch}
      assignPosition={assignPosition}
      validatePosition={validatePosition}
      working={working}
    />}

    {section === 'paths' && <Paths
      paths={filteredPaths}
      courses={courses}
      positions={positionById}
      pathSearch={pathSearch}
      setPathSearch={setPathSearch}
      linkCourse={linkCourse}
      working={working}
    />}

    {section === 'automations' && <Automations
      rules={automations}
      toggle={toggleAutomation}
      run={runAutomations}
      working={working}
    />}

    {section === 'compliance' && <Compliance
      snapshot={snapshot}
      dueRows={dueRows}
    />}

    {section === 'analytics' && <Analytics snapshot={snapshot} />}

    {section === 'ecosystem' && <Ecosystem
      connectors={connectors}
      packages={packages}
      packageForm={packageForm}
      setPackageForm={setPackageForm}
      registerPackage={registerPackage}
      calendar={calendar}
      calendarForm={calendarForm}
      setCalendarForm={setCalendarForm}
      createCalendarEvent={createCalendarEvent}
      missions={missions}
      aiRequests={aiRequests}
      aiForm={aiForm}
      setAiForm={setAiForm}
      queueAiRequest={queueAiRequest}
      working={working}
      persistent={persistent}
    />}
  </div>
}

function Overview({ snapshot, positions, paths, automations, missions, dueRows, onOpen }) {
  const metrics = [
    ['Personas activas', snapshot.people_total || 0, Users, 'positions'],
    ['Cargos provisionales/activos', snapshot.positions_total || positions.length, Waypoints, 'positions'],
    ['Rutas disponibles', snapshot.paths_total || paths.length, Route, 'paths'],
    ['Reglas activas', snapshot.automation_rules_active || automations.filter((item) => item.active).length, Workflow, 'automations'],
    ['Vencidos', snapshot.overdue_enrollments || 0, AlertTriangle, 'compliance'],
    ['Próximos 7 días', snapshot.due_7 || 0, Clock3, 'compliance'],
  ]
  return <div className="formation360-section">
    <div className="formation360-metric-grid">
      {metrics.map(([label, value, Icon, target]) => <button key={label} className="formation360-metric" onClick={() => onOpen(target)}>
        <span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div><ChevronRight size={16} />
      </button>)}
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Ciclo empresarial</span><h3>Del cargo a la evidencia</h3></div><Route size={22} /></header>
        <div className="formation360-flow">
          {[
            ['Cargo', 'Define qué debe saber la persona', Waypoints],
            ['Competencias', 'Identifica brechas por nivel', Target],
            ['Ruta', 'Ordena requisitos y prerrequisitos', Route],
            ['Capacitación', 'Entrega contenidos y evaluación', BookOpen],
            ['Certificación', 'Genera evidencia y vigencia', Award],
            ['Recertificación', 'Vuelve a activar el ciclo', RefreshCw],
          ].map(([title, text, Icon], index) => <div key={title} className="formation360-flow-step">
            <span>{index + 1}</span><Icon size={19} /><div><strong>{title}</strong><small>{text}</small></div>
          </div>)}
        </div>
      </article>

      <article className="formation360-panel">
        <header><div><span className="eyebrow">Atención</span><h3>Lo que requiere acción</h3></div><Bell size={22} /></header>
        <div className="formation360-alert-list">
          <AlertRow icon={AlertTriangle} label="Vencidos" value={snapshot.overdue_enrollments || 0} tone="red" />
          <AlertRow icon={Clock3} label="Vencen en 7 días" value={snapshot.due_7 || 0} tone="yellow" />
          <AlertRow icon={CalendarClock} label="Vencen en 30 días" value={snapshot.due_30 || 0} tone="blue" />
          <AlertRow icon={RefreshCw} label="Certificados por renovar en 30 días" value={snapshot.certificates_expiring_30 || 0} tone="purple" />
        </div>
        <button className="text-action" onClick={() => onOpen('compliance')}>Abrir centro de cumplimiento <ChevronRight size={15} /></button>
      </article>
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Automatización</span><h3>Motor activo</h3></div><Zap size={22} /></header>
        <div className="formation360-rule-mini">
          {automations.filter((item) => item.active).slice(0, 5).map((item) => <div key={item.id}><span /><div><strong>{item.name}</strong><small>{item.description}</small></div></div>)}
        </div>
      </article>
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Gamificación</span><h3>Misiones de aprendizaje</h3></div><Trophy size={22} /></header>
        <div className="formation360-missions">
          {missions.map((mission) => <div key={mission.id}><Medal size={18} /><div><strong>{mission.title}</strong><small>{mission.description}</small></div><b>+{mission.xp_reward} XP</b></div>)}
        </div>
      </article>
    </div>

    {dueRows.length > 0 && <article className="formation360-panel">
      <header><div><span className="eyebrow">Próximos movimientos</span><h3>Vencimientos más cercanos</h3></div><CalendarClock size={22} /></header>
      <div className="formation360-mini-table">
        {dueRows.slice(0, 6).map((item) => <div key={item.id}>
          <div><strong>{item.person?.full_name || item.person?.email || 'Colaborador'}</strong><small>{item.course?.title || 'Capacitación'}</small></div>
          <DueBadge bucket={item.bucket} date={item.due_at} />
        </div>)}
      </div>
    </article>}
  </div>
}

function Positions({
  positions, allPositions, competencies, mappings, competencyById, counts, people, localAssignments,
  positionSearch, setPositionSearch, personSearch, setPersonSearch, assignPosition, validatePosition, working,
}) {
  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Estructura organizacional</span><h3>Cargos y matriz de competencias</h3><p>Los cargos iniciales están marcados como provisionales hasta que se valide la planta completa.</p></div>
      <div className="formation360-search"><Search size={16} /><input value={positionSearch} onChange={(event) => setPositionSearch(event.target.value)} placeholder="Buscar cargo…" /></div>
    </section>

    <div className="formation360-position-grid">
      {positions.map((position) => {
        const required = mappings.filter((item) => item.job_position_id === position.id)
        return <article key={position.id} className="formation360-position-card">
          <header>
            <div><span className={'formation360-status ' + position.status}>{position.status === 'validated' ? 'Validado' : 'Provisional'}</span><h4>{position.name}</h4><small>{position.department || 'Área por definir'}</small></div>
            <strong>{counts.get(position.id) || 0}<small> personas</small></strong>
          </header>
          <p>{position.source_note || position.description || 'Pendiente de completar descripción.'}</p>
          <div className="formation360-competency-list">
            {required.map((map) => {
              const competency = competencyById.get(map.competency_id)
              return competency ? <div key={map.id}><span>{competency.name}</span><LevelDots value={map.required_level} /></div> : null
            })}
            {!required.length && <small>Sin competencias vinculadas todavía.</small>}
          </div>
          {position.status !== 'validated' && <button className="secondary-button compact" disabled={working === 'validate:' + position.id} onClick={() => validatePosition(position)}>
            <CheckCircle2 size={15} /> Marcar como validado
          </button>}
        </article>
      })}
    </div>

    <section className="formation360-panel formation360-people-position">
      <header><div><span className="eyebrow">Asignación</span><h3>Asignar cargo a personas</h3></div><div className="formation360-search"><Search size={15} /><input value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} placeholder="Buscar persona…" /></div></header>
      <div className="formation360-person-list">
        {people.slice(0, 60).map((person) => {
          const selected = person.job_position_id || localAssignments[person.id] || ''
          return <div key={person.id}>
            <span className="avatar-mini">{String(person.full_name || person.email || 'EI').slice(0, 2).toUpperCase()}</span>
            <div><strong>{person.full_name || person.email || 'Sin nombre'}</strong><small>{person.email} · {person.role}</small></div>
            <select value={selected} onChange={(event) => assignPosition(person.id, event.target.value)} disabled={working === 'position:' + person.id}>
              <option value="">Cargo por confirmar</option>
              {allPositions.filter((item) => item.active !== false).map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
            </select>
          </div>
        })}
      </div>
    </section>
  </div>
}

function Paths({ paths, courses, positions, pathSearch, setPathSearch, linkCourse, working }) {
  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Aprendizaje progresivo</span><h3>Rutas y prerrequisitos</h3><p>Vincula las capacitaciones reales de Aula EI a cada paso. Evaluación y certificación permanecen como hitos de cierre.</p></div>
      <div className="formation360-search"><Search size={16} /><input value={pathSearch} onChange={(event) => setPathSearch(event.target.value)} placeholder="Buscar ruta…" /></div>
    </section>

    <div className="formation360-path-list">
      {paths.map((path) => <article key={path.id} className="formation360-path-card">
        <header>
          <div><span className="formation360-path-code">{path.code}</span><h4>{path.name}</h4><p>{path.description}</p></div>
          <div className="formation360-path-meta"><span>{positions.get(path.job_position_id)?.name || 'Transversal'}</span><strong>{path.default_due_days} días</strong></div>
        </header>
        <div className="formation360-path-steps">
          {(path.steps || []).map((step, index) => <div key={step.id} className={'formation360-path-step ' + step.step_type}>
            <span className="formation360-step-number">{index + 1}</span>
            <div className="formation360-step-icon">{step.step_type === 'course' ? <BookOpen size={17} /> : step.step_type === 'assessment' ? <BrainCircuit size={17} /> : <Award size={17} />}</div>
            <div><strong>{step.title}</strong><small>{step.description || step.step_type}</small></div>
            {step.step_type === 'course' ? <select value={step.course_id || ''} onChange={(event) => linkCourse(step, event.target.value)} disabled={working === 'step:' + step.id}>
              <option value="">Pendiente de vincular</option>
              {courses.filter((course) => course.status === 'published').map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select> : <span className="formation360-step-system">Hito del sistema</span>}
          </div>)}
        </div>
      </article>)}
    </div>
  </div>
}

function Automations({ rules, toggle, run, working }) {
  const iconFor = (trigger) => trigger === 'exam_attempt' ? BrainCircuit : trigger === 'position_assigned' ? Users : Clock3
  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Motor de reglas</span><h3>Automatizaciones</h3><p>Reduce gestión manual: asignación, recordatorios, reincidencia, inactividad y recertificación.</p></div>
      <button className="primary-button" onClick={run} disabled={working === 'run-automations'}>{working === 'run-automations' ? <Loader2 className="spin" size={16} /> : <PlayCircle size={16} />} Ejecutar ahora</button>
    </section>
    <div className="formation360-automation-grid">
      {rules.map((rule) => {
        const Icon = iconFor(rule.trigger_type)
        return <article key={rule.id} className={'formation360-automation-card ' + (rule.active ? 'active' : 'paused')}>
          <span><Icon size={20} /></span>
          <div><strong>{rule.name}</strong><small>{rule.description}</small><em>{rule.trigger_type}</em></div>
          <button className={'formation360-switch ' + (rule.active ? 'on' : '')} aria-pressed={rule.active} onClick={() => toggle(rule)} disabled={working === 'automation:' + rule.id}><i /></button>
        </article>
      })}
    </div>
  </div>
}

function Compliance({ snapshot, dueRows }) {
  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Cumplimiento y recertificación</span><h3>Centro de cumplimiento</h3><p>Visualiza incumplimientos, ventanas de vencimiento y próximos ciclos de renovación.</p></div>
    </section>
    <div className="formation360-compliance-grid">
      <ComplianceMetric label="Vencidos" value={snapshot.overdue_enrollments || 0} icon={AlertTriangle} tone="red" />
      <ComplianceMetric label="Vencen ≤ 7 días" value={snapshot.due_7 || 0} icon={Clock3} tone="yellow" />
      <ComplianceMetric label="Vencen ≤ 30 días" value={snapshot.due_30 || 0} icon={CalendarClock} tone="blue" />
      <ComplianceMetric label="Vencen ≤ 60 días" value={snapshot.due_60 || 0} icon={CalendarClock} tone="purple" />
      <ComplianceMetric label="Recertificación ≤ 30 días" value={snapshot.certificates_expiring_30 || 0} icon={RefreshCw} tone="green" />
    </div>
    <section className="formation360-panel">
      <header><div><span className="eyebrow">Detalle</span><h3>Personas y capacitaciones con fecha</h3></div><ShieldCheck size={22} /></header>
      {dueRows.length ? <div className="formation360-compliance-table">
        <div className="head"><span>Persona</span><span>Capacitación</span><span>Estado</span><span>Fecha</span></div>
        {dueRows.slice(0, 100).map((item) => <div key={item.id}>
          <span><strong>{item.person?.full_name || item.person?.email || 'Colaborador'}</strong><small>{item.person?.email || ''}</small></span>
          <span>{item.course?.title || 'Capacitación'}</span>
          <span><DueBadge bucket={item.bucket} /></span>
          <span>{item.due_at ? new Date(item.due_at).toLocaleDateString('es-CO') : '—'}</span>
        </div>)}
      </div> : <EmptyState icon={CheckCircle2} title="Sin vencimientos registrados" text="Las capacitaciones con fecha límite aparecerán aquí." />}
    </section>
  </div>
}

function Analytics({ snapshot }) {
  const passRate = snapshot.exam_pass_rate
  const avgScore = snapshot.avg_exam_score
  const completionHours = snapshot.avg_completion_hours
  const avgAttempts = snapshot.avg_attempts_per_user

  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Analítica avanzada</span><h3>Salud del aprendizaje</h3><p>Desempeño, riesgo, tiempo, dificultad real, estancamiento y cohortes en una sola lectura.</p></div>
    </section>

    <div className="formation360-analytics-grid">
      <AnalyticsCard label="Promedio de examen" value={avgScore == null ? '—' : avgScore + '%'} icon={BrainCircuit} />
      <AnalyticsCard label="Tasa de aprobación" value={passRate == null ? '—' : passRate + '%'} icon={CheckCircle2} />
      <AnalyticsCard label="Tiempo medio de cierre" value={completionHours == null ? '—' : completionHours + ' h'} icon={Clock3} />
      <AnalyticsCard label="Intentos promedio" value={avgAttempts == null ? '—' : avgAttempts} icon={RefreshCw} />
      <AnalyticsCard label="Certificados emitidos" value={snapshot.certificates_total || 0} icon={Award} />
      <AnalyticsCard label="Usuarios en riesgo" value={(snapshot.risk_users || []).length} icon={AlertTriangle} />
      <AnalyticsCard label="Errores técnicos 24 h" value={snapshot.telemetry_errors_24h || 0} icon={Activity} />
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Riesgo</span><h3>Personas que requieren seguimiento</h3></div><AlertTriangle size={22} /></header>
        {(snapshot.risk_users || []).length ? <div className="formation360-risk-list">
          {snapshot.risk_users.map((item) => <div key={item.id}><span className="avatar-mini">{String(item.full_name || item.email || 'EI').slice(0, 2).toUpperCase()}</span><div><strong>{item.full_name || item.email}</strong><small>{item.overdue || 0} vencido(s) · {item.failed_attempts || 0} intento(s) fallido(s)</small></div></div>)}
        </div> : <EmptyState icon={CheckCircle2} title="Sin señales críticas" text="Cuando existan vencimientos o reincidencias aparecerán aquí." compact />}
      </article>

      <article className="formation360-panel">
        <header><div><span className="eyebrow">Cobertura</span><h3>Personas por cargo</h3></div><Users size={22} /></header>
        <div className="formation360-breakdown">
          {(snapshot.position_breakdown || []).map((item) => <div key={item.id}><span>{item.name}</span><div><i style={{ width: Math.min(100, (Number(item.people || 0) / Math.max(1, Number(snapshot.people_total || 1))) * 100) + '%' }} /></div><strong>{item.people || 0}</strong></div>)}
        </div>
      </article>
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Dificultad</span><h3>Preguntas con mayor error</h3></div><BrainCircuit size={22} /></header>
        <div className="formation360-question-health">
          {(snapshot.hardest_questions || []).map((item) => <div key={item.id}>
            <div><strong>{item.prompt}</strong><small>{item.course_title} · {item.responses || 0} respuesta(s)</small></div>
            <b>{item.error_rate == null ? '—' : item.error_rate + '% error'}</b>
          </div>)}
          {!(snapshot.hardest_questions || []).length && <EmptyState icon={BrainCircuit} title="Sin datos de dificultad" text="La métrica se activa cuando existan intentos de examen." compact />}
        </div>
      </article>

      <article className="formation360-panel">
        <header><div><span className="eyebrow">Abandono</span><h3>Bloques con mayor estancamiento</h3></div><Layers3 size={22} /></header>
        <div className="formation360-question-health">
          {(snapshot.stalled_blocks || []).map((item) => <div key={item.id}>
            <div><strong>{item.title}</strong><small>{item.course_title} · {item.total_progress_records || 0} registro(s)</small></div>
            <b>{item.stalled || 0} estancado(s)</b>
          </div>)}
          {!(snapshot.stalled_blocks || []).length && <EmptyState icon={Layers3} title="Sin estancamientos detectados" text="Aparecerán cuando existan contenidos iniciados sin cierre." compact />}
        </div>
      </article>
    </div>

    <article className="formation360-panel">
      <header><div><span className="eyebrow">Capacitaciones</span><h3>Salud de evaluaciones</h3></div><Gauge size={22} /></header>
      <div className="formation360-course-health">
        {(snapshot.course_health || []).map((item) => <div key={item.id}>
          <div><strong>{item.title}</strong><small>{item.attempts || 0} intento(s)</small></div>
          <span>Promedio <b>{item.avg_score == null ? '—' : item.avg_score + '%'}</b></span>
          <span>Aprobación <b>{item.pass_rate == null ? '—' : item.pass_rate + '%'}</b></span>
        </div>)}
      </div>
    </article>

    <article className="formation360-panel">
      <header><div><span className="eyebrow">Cohortes</span><h3>Asignación y cierre por mes</h3></div><CalendarClock size={22} /></header>
      <div className="formation360-cohorts">
        {(snapshot.cohorts || []).map((item) => <div key={item.month}>
          <strong>{item.month}</strong>
          <span>{item.assigned || 0} asignadas</span>
          <span>{item.completed || 0} completadas</span>
          <div><i style={{ width: Math.min(100, Number(item.completion_rate || 0)) + '%' }} /></div>
          <b>{item.completion_rate == null ? '—' : item.completion_rate + '%'}</b>
        </div>)}
        {!(snapshot.cohorts || []).length && <EmptyState icon={CalendarClock} title="Sin cohortes todavía" text="La evolución mensual aparecerá con nuevas asignaciones." compact />}
      </div>
    </article>
  </div>
}

function Ecosystem({
  connectors, packages, packageForm, setPackageForm, registerPackage,
  calendar, calendarForm, setCalendarForm, createCalendarEvent,
  missions, aiRequests, aiForm, setAiForm, queueAiRequest, working, persistent,
}) {
  return <div className="formation360-section">
    <section className="formation360-section-head">
      <div><span className="eyebrow">Ecosistema</span><h3>Interoperabilidad, móvil, IA y engagement</h3><p>Primera instancia técnica para crecer hacia LMS/LXP empresarial sin rehacer la plataforma.</p></div>
    </section>

    <div className="formation360-ecosystem-grid">
      <EcosystemCard icon={Cloud} title="PWA / aplicación instalable" status="base-ready" text="Shell instalable y estrategia offline preparada. El siguiente paso es empaquetar contenidos descargables por curso." />
      <EcosystemCard icon={Bell} title="Notificaciones y calendario" status="ready" text="Modelo persistente para avisos, vencimientos, sesiones, evaluaciones y recertificación." />
      <EcosystemCard icon={Trophy} title="Gamificación" status="ready" text="XP, niveles, rachas, insignias y misiones forman parte del nuevo motor." />
      <EcosystemCard icon={Activity} title="Observabilidad" status="ready" text="Modelo de telemetría para errores, rendimiento y actividad técnica." />
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Estándares e integraciones</span><h3>Conectores</h3></div><PlugZap size={22} /></header>
        <div className="formation360-connectors">
          {connectors.map((connector) => <div key={connector.id}><span><PlugZap size={16} /></span><div><strong>{connector.name}</strong><small>{connector.connector_type}</small></div><em className={'connector-status ' + connector.status}>{connector.status}</em></div>)}
        </div>
      </article>
      <article className="formation360-panel">
        <header><div><span className="eyebrow">Gamificación</span><h3>Misiones activas</h3></div><Flame size={22} /></header>
        <div className="formation360-missions">
          {missions.map((mission) => <div key={mission.id}><Medal size={18} /><div><strong>{mission.title}</strong><small>{mission.description}</small></div><b>+{mission.xp_reward} XP</b></div>)}
        </div>
      </article>
    </div>

    <div className="formation360-overview-grid">
      <article className="formation360-panel">
        <header><div><span className="eyebrow">SCORM / xAPI / cmi5 / LTI</span><h3>Registrar paquete externo</h3></div><Package size={22} /></header>
        <form className="formation360-form" onSubmit={registerPackage}>
          <label>Título<input value={packageForm.title} onChange={(event) => setPackageForm({ ...packageForm, title: event.target.value })} placeholder="Ej. Seguridad eléctrica · Rise 360" required /></label>
          <label>Estándar<select value={packageForm.standard} onChange={(event) => setPackageForm({ ...packageForm, standard: event.target.value })}>{PACKAGE_STANDARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="wide">URL de lanzamiento / origen<input value={packageForm.launch_url} onChange={(event) => setPackageForm({ ...packageForm, launch_url: event.target.value })} placeholder="Opcional en esta primera instancia" /></label>
          <button className="primary-button" disabled={working === 'package'}>{working === 'package' ? <Loader2 className="spin" size={16} /> : <FileArchive size={16} />} Registrar</button>
        </form>
        <div className="formation360-package-list">
          {packages.slice(0, 8).map((item) => <div key={item.id}><Package size={16} /><div><strong>{item.title}</strong><small>{item.standard} · {item.status}</small></div></div>)}
          {!packages.length && <small>Aún no hay paquetes registrados.</small>}
        </div>
      </article>

      <article className="formation360-panel">
        <header><div><span className="eyebrow">Calendario de formación</span><h3>Crear evento</h3></div><CalendarClock size={22} /></header>
        <form className="formation360-form" onSubmit={createCalendarEvent}>
          <label className="wide">Título<input value={calendarForm.title} onChange={(event) => setCalendarForm({ ...calendarForm, title: event.target.value })} placeholder="Ej. Jornada de inducción" required /></label>
          <label>Tipo<select value={calendarForm.event_type} onChange={(event) => setCalendarForm({ ...calendarForm, event_type: event.target.value })}><option value="training">Capacitación</option><option value="session">Sesión</option><option value="assessment">Evaluación</option><option value="recertification">Recertificación</option></select></label>
          <label>Fecha y hora<input type="datetime-local" value={calendarForm.starts_at} onChange={(event) => setCalendarForm({ ...calendarForm, starts_at: event.target.value })} required /></label>
          <label className="wide">Lugar<input value={calendarForm.location} onChange={(event) => setCalendarForm({ ...calendarForm, location: event.target.value })} placeholder="Presencial, Teams, sede…" /></label>
          <button className="primary-button" disabled={working === 'calendar'}>{working === 'calendar' ? <Loader2 className="spin" size={16} /> : <CalendarClock size={16} />} Agregar</button>
        </form>
        <div className="formation360-package-list">
          {calendar.slice(0, 8).map((item) => <div key={item.id}><CalendarClock size={16} /><div><strong>{item.title}</strong><small>{new Date(item.starts_at).toLocaleString('es-CO')} {item.location ? '· ' + item.location : ''}</small></div></div>)}
          {!calendar.length && <small>No hay eventos programados todavía.</small>}
        </div>
      </article>
    </div>

    <article className="formation360-panel">
      <header><div><span className="eyebrow">IA útil, no decorativa</span><h3>Cola de autoría asistida</h3><p>La interfaz y el contrato están listos; el ejecutor necesita conectar un proveedor de IA antes de procesar solicitudes.</p></div><Bot size={22} /></header>
      <form className="formation360-ai-form" onSubmit={queueAiRequest}>
        <select value={aiForm.request_type} onChange={(event) => setAiForm({ ...aiForm, request_type: event.target.value })}>
          <option value="outline">Proponer estructura de capacitación</option>
          <option value="questions">Generar banco de preguntas</option>
          <option value="summary">Generar resumen</option>
          <option value="ambiguity_review">Detectar preguntas ambiguas</option>
          <option value="alternate_bank">Crear banco alternativo</option>
        </select>
        <textarea value={aiForm.prompt} onChange={(event) => setAiForm({ ...aiForm, prompt: event.target.value })} placeholder="Describe qué debe analizar o generar…" required />
        <button className="primary-button" disabled={working === 'ai'}>{working === 'ai' ? <Loader2 className="spin" size={16} /> : <WandSparkles size={16} />} Enviar a cola</button>
      </form>
      <div className="formation360-ai-queue">
        {aiRequests.slice(0, 10).map((item) => <div key={item.id}><Bot size={16} /><div><strong>{aiTypeLabel(item.request_type)}</strong><small>{item.prompt || 'Solicitud registrada'} · {item.status}</small></div></div>)}
      </div>
      {!persistent && <div className="formation360-note"><Database size={16} /><span>Esta cola es provisional hasta aplicar la migración y conectar el proveedor de IA.</span></div>}
    </article>
  </div>
}

function AlertRow({ icon: Icon, label, value, tone }) {
  return <div className={'formation360-alert ' + tone}><span><Icon size={16} /></span><strong>{value}</strong><small>{label}</small></div>
}

function ComplianceMetric({ label, value, icon: Icon, tone }) {
  return <article className={'formation360-compliance-metric ' + tone}><span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function AnalyticsCard({ label, value, icon: Icon }) {
  return <article className="formation360-analytics-card"><span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function EcosystemCard({ icon: Icon, title, status, text }) {
  const label = status === 'ready' ? 'Base funcional' : status === 'base-ready' ? 'Primera capa' : status
  return <article className="formation360-ecosystem-card"><span><Icon size={22} /></span><div><strong>{title}</strong><p>{text}</p><small>{label}</small></div></article>
}

function LevelDots({ value = 0 }) {
  return <span className="formation360-level-dots" aria-label={'Nivel ' + value + ' de 5'}>{Array.from({ length: 5 }).map((_, index) => <i key={index} className={index < value ? 'filled' : ''} />)}</span>
}

function DueBadge({ bucket, date }) {
  const labels = {
    overdue: 'Vencido',
    due7: '≤ 7 días',
    due30: '≤ 30 días',
    due60: '≤ 60 días',
    later: 'Programado',
  }
  return <span className={'formation360-due ' + (bucket || 'later')}>{labels[bucket] || labels.later}{date ? ' · ' + new Date(date).toLocaleDateString('es-CO') : ''}</span>
}

function EmptyState({ icon: Icon, title, text, compact = false }) {
  return <div className={'formation360-empty ' + (compact ? 'compact' : '')}><Icon size={26} /><strong>{title}</strong><span>{text}</span></div>
}

function aiTypeLabel(type) {
  return {
    outline: 'Estructura de capacitación',
    questions: 'Banco de preguntas',
    summary: 'Resumen',
    ambiguity_review: 'Revisión de ambigüedad',
    alternate_bank: 'Banco alternativo',
    learner_answer: 'Respuesta al aprendiz',
  }[type] || type
}

function FormationLoading() {
  return <section className="formation360-loading" aria-busy="true">
    <div className="experience-loading-mark"><i /><i /><i /></div>
    <strong>Preparando Formación 360…</strong>
    <span>Conectando cargos, rutas, cumplimiento y analítica.</span>
    <div><i /><i /><i /><i /></div>
  </section>
}
