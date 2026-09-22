import React, { useEffect, useMemo, useState } from 'react'
import {
  Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2,
  ChevronDown, CircleAlert, Download, Edit3, ExternalLink, File, FileAudio,
  FileQuestion, FileText, Gamepad2, Image, LayoutList, Link2, Loader2, MonitorPlay,
  Plus, Presentation, Rocket, Save, Search, Settings2, ShieldCheck, Sparkles,
  Trash2, Upload, Video, X,
} from 'lucide-react'
import { getError, signedAsset, slugify, supabase, uploadCourseAsset } from './shared.js'
import { appUrl } from '../../src/paths.js'

const EMPTY_COURSE = { title: '', description: '', passing_score: 80 }
const EMPTY_BLOCK = {
  type: 'text',
  title: '',
  description: '',
  required: true,
  text: '',
  url: '',
  prompt: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctIndex: 0,
  gameType: 'multiple_choice',
  instructions: '',
  status: 'published',
}
const EMPTY_QUESTION = { prompt: '', a: '', b: '', c: '', d: '', correct: 'A' }

const COURSE_TEMPLATES = [
  {
    id: 'blank',
    name: 'Desde cero',
    description: 'Tú decides la estructura paso a paso.',
    icon: Sparkles,
    phases: [],
  },
  {
    id: 'short',
    name: 'Curso corto',
    description: 'Ideal para inducciones, refuerzos y temas puntuales.',
    icon: Rocket,
    phases: ['Bienvenida y contexto', 'Contenido principal', 'Cierre y evaluación'],
  },
  {
    id: 'modules',
    name: 'Curso por módulos',
    description: 'Para capacitaciones más completas y progresivas.',
    icon: LayoutList,
    phases: ['Introducción', 'Módulo 1', 'Módulo 2', 'Cierre'],
  },
]

const BLOCK_TYPES = [
  { value: 'text', label: 'Lectura', detail: 'Texto, guía o explicación corta.', icon: FileText },
  { value: 'video', label: 'Video', detail: 'Video subido o enlace externo.', icon: Video },
  { value: 'presentation', label: 'Presentación', detail: 'Diapositivas o material visual.', icon: Presentation },
  { value: 'image', label: 'Imagen', detail: 'Infografía, esquema o pieza gráfica.', icon: Image },
  { value: 'audio', label: 'Audio', detail: 'Audio explicativo o cápsula.', icon: FileAudio },
  { value: 'file', label: 'Archivo', detail: 'PDF, documento o recurso descargable.', icon: File },
  { value: 'link', label: 'Enlace', detail: 'Drive, OneDrive o recurso web.', icon: Link2 },
  { value: 'game', label: 'Juego', detail: 'Actividad interactiva o práctica.', icon: Gamepad2 },
  { value: 'validation', label: 'Validación', detail: 'Pregunta rápida dentro del contenido.', icon: ShieldCheck },
]

export default function CoursesManager({ courses, refresh, setMessage }) {
  const [selectedId, setSelectedId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_COURSE)
  const [templateId, setTemplateId] = useState('blank')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const selected = courses.find((course) => course.id === selectedId) || null

  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter((course) => course.status === 'published').length,
    drafts: courses.filter((course) => course.status === 'draft').length,
    archived: courses.filter((course) => course.status === 'archived').length,
  }), [courses])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return courses.filter((course) => {
      if (statusFilter !== 'all' && course.status !== statusFilter) return false
      if (!query) return true
      return `${course.title || ''} ${course.description || ''}`.toLowerCase().includes(query)
    })
  }, [courses, search, statusFilter])

  const createCourse = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return setMessage('Escribe un título para la capacitación.')
    setBusy(true)
    try {
      const slug = slugify(form.title) + '-' + String(Date.now()).slice(-5)
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          passing_score: Number(form.passing_score) || 80,
          slug,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      const template = COURSE_TEMPLATES.find((item) => item.id === templateId)
      let templateWarning = ''
      if (template?.phases?.length) {
        const { error: phaseError } = await supabase.from('course_phases').insert(
          template.phases.map((title, index) => ({
            course_id: data.id,
            title,
            sort_order: index,
          })),
        )
        if (phaseError) templateWarning = ' La capacitación se creó, pero la estructura sugerida no pudo agregarse automáticamente.'
      }

      setForm(EMPTY_COURSE)
      setTemplateId('blank')
      setCreateOpen(false)
      await refresh()
      setSelectedId(data.id)
      setMessage('Capacitación creada. El constructor ya está listo para completar el contenido.' + templateWarning)
    } catch (error) {
      setMessage(getError(error, 'No fue posible crear la capacitación.'))
    } finally {
      setBusy(false)
    }
  }

  if (selected) {
    return (
      <CourseBuilder
        course={selected}
        onBack={() => setSelectedId(null)}
        refresh={refresh}
        setMessage={setMessage}
      />
    )
  }

  return <div className="courses-center">
    <section className="panel-card courses-overview">
      <div className="courses-overview-head">
        <div>
          <span className="eyebrow">Capacitaciones</span>
          <h2>Diseña experiencias de aprendizaje completas.</h2>
          <p>Crea, estructura, revisa y publica cursos desde un constructor guiado. No necesitas conocer la estructura técnica de Aula EI.</p>
        </div>
        <button className="primary-button courses-create-button" onClick={() => setCreateOpen(true)}>
          <Plus size={18} /> Nueva capacitación
        </button>
      </div>

      <div className="course-metrics-grid">
        <MetricCard icon={BookOpen} label="Total" value={stats.total} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <MetricCard icon={CheckCircle2} label="Publicadas" value={stats.published} active={statusFilter === 'published'} onClick={() => setStatusFilter(statusFilter === 'published' ? 'all' : 'published')} />
        <MetricCard icon={Edit3} label="Borradores" value={stats.drafts} active={statusFilter === 'draft'} onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')} />
        <MetricCard icon={Archive} label="Archivadas" value={stats.archived} active={statusFilter === 'archived'} onClick={() => setStatusFilter(statusFilter === 'archived' ? 'all' : 'archived')} />
      </div>
    </section>

    <section className="panel-card courses-library">
      <div className="courses-library-toolbar">
        <div className="search-field courses-main-search">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar capacitación por título o descripción…" />
        </div>
        <label className="filter-select">
          <Settings2 size={15} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
            <option value="archived">Archivadas</option>
          </select>
        </label>
      </div>

      <div className="courses-library-meta">
        <div><strong>{filteredCourses.length}</strong> capacitación(es)</div>
        <button className="text-action" onClick={() => { setSearch(''); setStatusFilter('all') }}>Limpiar filtros</button>
      </div>

      {filteredCourses.length ? (
        <div className="course-library-grid">
          {filteredCourses.map((course) => (
            <button className="course-library-card" key={course.id} onClick={() => setSelectedId(course.id)}>
              <div className="course-library-card-top">
                <span className={'course-status-badge ' + course.status}>{statusLabel(course.status)}</span>
                <span className="course-edit-link">Editar <ArrowRight size={15} /></span>
              </div>
              <div className="course-library-card-body">
                <span className="course-library-icon"><BookOpen size={22} /></span>
                <div>
                  <strong>{course.title}</strong>
                  <p>{course.description || 'Sin descripción. Puedes completarla desde el constructor.'}</p>
                </div>
              </div>
              <div className="course-library-card-footer">
                <span>Aprobación <strong>{course.passing_score || 80}%</strong></span>
                <span>{course.cover_path ? 'Portada lista' : 'Sin portada'}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="courses-empty-state">
          <Search size={30} />
          <strong>No hay capacitaciones para mostrar</strong>
          <span>Prueba con otra búsqueda o crea una nueva capacitación.</span>
        </div>
      )}
    </section>

    {createOpen && (
      <CreateCourseModal
        form={form}
        setForm={setForm}
        templateId={templateId}
        setTemplateId={setTemplateId}
        busy={busy}
        onSubmit={createCourse}
        onClose={() => {
          if (busy) return
          setCreateOpen(false)
          setForm(EMPTY_COURSE)
          setTemplateId('blank')
        }}
      />
    )}
  </div>
}

function MetricCard({ icon: Icon, label, value, active, onClick }) {
  return <button className={'course-metric-card ' + (active ? 'active' : '')} onClick={onClick}>
    <span><Icon size={18} /></span>
    <div><strong>{value}</strong><small>{label}</small></div>
  </button>
}

function CreateCourseModal({ form, setForm, templateId, setTemplateId, busy, onSubmit, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="course-create-modal">
      <header>
        <div>
          <span className="eyebrow">Nueva capacitación</span>
          <h2>Comienza con una estructura clara.</h2>
          <p>Define lo esencial. Aula EI creará el borrador y después te guiará para completar contenidos, evaluación y publicación.</p>
        </div>
        <button className="icon-button" onClick={onClose} disabled={busy}><X size={18} /></button>
      </header>

      <form onSubmit={onSubmit}>
        <section className="course-create-section">
          <div className="course-create-section-title">
            <span>1</span>
            <div><strong>Datos básicos</strong><small>Lo primero que verá la persona que reciba la capacitación.</small></div>
          </div>
          <div className="course-create-fields">
            <label className="wide">Título de la capacitación
              <input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Inducción corporativa 2026" required />
              <small className="helper-text">{form.title.length}/100 · usa un nombre corto y fácil de reconocer.</small>
            </label>
            <label className="wide">Descripción
              <textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explica en pocas líneas qué aprenderá la persona y para qué sirve esta capacitación." />
            </label>
            <label>Nota mínima para aprobar
              <div className="score-input-row">
                <input type="range" min="1" max="100" value={form.passing_score} onChange={(event) => setForm({ ...form, passing_score: Number(event.target.value) })} />
                <input className="score-number-input" type="number" min="1" max="100" value={form.passing_score} onChange={(event) => setForm({ ...form, passing_score: clampScore(event.target.value) })} />
                <strong>%</strong>
              </div>
            </label>
          </div>
        </section>

        <section className="course-create-section">
          <div className="course-create-section-title">
            <span>2</span>
            <div><strong>Elige una forma de comenzar</strong><small>Solo crea la estructura inicial. Todo se puede cambiar después.</small></div>
          </div>
          <div className="course-template-grid">
            {COURSE_TEMPLATES.map((template) => {
              const Icon = template.icon
              return <button type="button" key={template.id} className={'course-template-card ' + (templateId === template.id ? 'selected' : '')} onClick={() => setTemplateId(template.id)}>
                <span><Icon size={21} /></span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
                {templateId === template.id && <CheckCircle2 size={18} className="template-check" />}
              </button>
            })}
          </div>
        </section>

        <div className="course-create-summary">
          <CheckCircle2 size={18} />
          <div><strong>Se creará como borrador</strong><span>Nadie podrá verla hasta que tú decidas publicarla.</span></div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="primary-button" disabled={busy || !form.title.trim()}>
            {busy ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}
            {busy ? 'Creando…' : 'Crear y abrir constructor'}
          </button>
        </div>
      </form>
    </section>
  </div>
}

function CourseBuilder({ course, onBack, refresh, setMessage }) {
  const [config, setConfig] = useState({
    title: course.title,
    description: course.description || '',
    status: course.status,
    passing_score: course.passing_score || 80,
    cover_path: course.cover_path || null,
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [phases, setPhases] = useState([])
  const [questions, setQuestions] = useState([])
  const [phaseTitle, setPhaseTitle] = useState('')
  const [openEditor, setOpenEditor] = useState(null)
  const [openPhase, setOpenPhase] = useState(null)
  const [busy, setBusy] = useState(false)
  const [activeStep, setActiveStep] = useState('overview')
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const load = async () => {
    const [phaseResult, questionResult] = await Promise.all([
      supabase.from('course_phases').select('*,blocks:content_blocks(*)').eq('course_id', course.id).order('sort_order'),
      supabase.from('questions').select('*,options:question_options(*)').eq('course_id', course.id).order('sort_order'),
    ])
    if (phaseResult.error) setMessage(phaseResult.error.message)
    else {
      const loaded = (phaseResult.data || []).map((phase) => ({
        ...phase,
        blocks: [...(phase.blocks || [])].sort((a, b) => a.sort_order - b.sort_order),
      }))
      setPhases(loaded)
      if (openPhase === null && loaded[0]) setOpenPhase(loaded[0].id)
    }
    if (questionResult.error) setMessage(questionResult.error.message)
    else setQuestions(questionResult.data || [])
  }

  useEffect(() => { load() }, [course.id])

  useEffect(() => {
    setConfig({
      title: course.title,
      description: course.description || '',
      status: course.status,
      passing_score: course.passing_score || 80,
      cover_path: course.cover_path || null,
    })
    setDirty(false)
  }, [course.id])

  useEffect(() => {
    let alive = true
    if (coverFile) {
      const url = URL.createObjectURL(coverFile)
      setCoverUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (!config.cover_path) { setCoverUrl(null); return }
    signedAsset(config.cover_path)
      .then((url) => { if (alive) setCoverUrl(url) })
      .catch(() => { if (alive) setCoverUrl(null) })
    return () => { alive = false }
  }, [coverFile, config.cover_path])

  const totalBlocks = useMemo(
    () => phases.reduce((sum, phase) => sum + (phase.blocks || []).length, 0),
    [phases],
  )
  const requiredBlocks = useMemo(
    () => phases.reduce((sum, phase) => sum + (phase.blocks || []).filter((block) => block.required).length, 0),
    [phases],
  )

  const readiness = useMemo(() => {
    const checks = [
      { id: 'title', label: 'Título definido', done: Boolean(config.title.trim()), step: 'overview' },
      { id: 'description', label: 'Descripción completa', done: config.description.trim().length >= 20, step: 'overview' },
      { id: 'cover', label: 'Imagen de portada', done: Boolean(config.cover_path || coverFile), step: 'overview', optional: true },
      { id: 'phase', label: 'Al menos una fase', done: phases.length > 0, step: 'structure' },
      { id: 'block', label: 'Contenido agregado', done: totalBlocks > 0, step: 'structure' },
      { id: 'exam', label: 'Examen creado', done: questions.length > 0, step: 'exam' },
    ]
    const requiredChecks = checks.filter((item) => !item.optional)
    const completed = requiredChecks.filter((item) => item.done).length
    return {
      checks,
      percent: Math.round((completed / requiredChecks.length) * 100),
      ready: requiredChecks.every((item) => item.done),
    }
  }, [config.title, config.description, config.cover_path, coverFile, phases.length, totalBlocks, questions.length])

  const updateConfig = (patch) => {
    setConfig((current) => ({ ...current, ...patch }))
    setDirty(true)
  }

  const saveConfig = async (overrides = null) => {
    setBusy(true)
    try {
      let coverPath = config.cover_path
      if (coverFile) coverPath = await uploadCourseAsset(course.id, coverFile)
      const payload = {
        ...(overrides ? { ...config, ...overrides } : config),
        title: (overrides?.title ?? config.title).trim(),
        description: (overrides?.description ?? config.description).trim(),
        passing_score: Number(overrides?.passing_score ?? config.passing_score) || 80,
        cover_path: coverPath,
      }
      const { error } = await supabase.from('courses').update(payload).eq('id', course.id)
      if (error) throw error
      setConfig(payload)
      setCoverFile(null)
      setDirty(false)
      setLastSaved(new Date())
      await refresh()
      setMessage('Cambios guardados.')
      return true
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar la capacitación.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const publishCourse = async () => {
    if (!readiness.ready) {
      setMessage('Antes de publicar completa los elementos obligatorios marcados en la lista de revisión.')
      setActiveStep('publish')
      return
    }
    if (dirty) {
      const saved = await saveConfig({ status: 'published' })
      if (saved) setMessage('Capacitación publicada correctamente.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.from('courses').update({ status: 'published' }).eq('id', course.id)
      if (error) throw error
      updateConfig({ status: 'published' })
      setDirty(false)
      await refresh()
      setMessage('Capacitación publicada correctamente.')
    } catch (error) {
      setMessage(getError(error, 'No fue posible publicar la capacitación.'))
    } finally {
      setBusy(false)
    }
  }

  const setCourseStatus = async (status) => {
    const saved = await saveConfig({ status })
    if (!saved) return
    setMessage(status === 'archived' ? 'Capacitación archivada.' : status === 'draft' ? 'Capacitación guardada como borrador.' : 'Estado actualizado.')
  }

  const safeBack = () => {
    if (dirty && !window.confirm('Hay cambios de configuración sin guardar. ¿Quieres salir de todas formas?')) return
    onBack()
  }

  const preview = () => {
    const anchor = document.createElement('a')
    anchor.href = new URL(appUrl('/course/' + course.id), window.location.origin).href
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.click()
  }

  const addPhase = async (event) => {
    event.preventDefault()
    if (!phaseTitle.trim()) return
    const { data, error } = await supabase
      .from('course_phases')
      .insert({ course_id: course.id, title: phaseTitle.trim(), sort_order: phases.length })
      .select()
      .single()
    if (error) return setMessage(error.message)
    setPhaseTitle('')
    setOpenPhase(data.id)
    await load()
    setMessage('Fase agregada. Ahora puedes añadir contenidos.')
  }

  const deletePhase = async (phaseId) => {
    const phase = phases.find((item) => item.id === phaseId)
    if (!window.confirm(`¿Eliminar "${phase?.title || 'esta fase'}" y todos sus contenidos? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('course_phases').delete().eq('id', phaseId)
    if (error) setMessage(error.message)
    else {
      if (openPhase === phaseId) setOpenPhase(null)
      await load()
      setMessage('Fase eliminada.')
    }
  }

  const movePhase = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= phases.length) return
    const current = phases[index]
    const other = phases[target]
    const results = await Promise.all([
      supabase.from('course_phases').update({ sort_order: target }).eq('id', current.id),
      supabase.from('course_phases').update({ sort_order: index }).eq('id', other.id),
    ])
    const failure = results.find((result) => result.error)
    if (failure?.error) setMessage(failure.error.message)
    else await load()
  }

  const steps = [
    { id: 'overview', label: 'Información', detail: 'Datos, portada y aprobación', icon: Settings2 },
    { id: 'structure', label: 'Ruta de aprendizaje', detail: `${phases.length} fases · ${totalBlocks} contenidos`, icon: LayoutList },
    { id: 'exam', label: 'Examen final', detail: `${questions.length} preguntas`, icon: FileQuestion },
    { id: 'publish', label: 'Revisión y publicación', detail: readiness.ready ? 'Lista para publicar' : 'Revisa pendientes', icon: Rocket },
  ]

  return <div className="course-authoring-studio">
    <header className="course-authoring-header">
      <button className="text-action" onClick={safeBack}><ArrowLeft size={17} /> Capacitaciones</button>
      <div className="course-authoring-title">
        <div className="course-authoring-title-row">
          <span className={'course-status-badge ' + config.status}>{statusLabel(config.status)}</span>
          {dirty ? <span className="save-state dirty">Cambios sin guardar</span> : <span className="save-state saved"><Check size={13} /> Guardado</span>}
        </div>
        <h2>{config.title || 'Capacitación sin título'}</h2>
        <small>{lastSaved ? 'Último guardado: ' + lastSaved.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Constructor de capacitación'}</small>
      </div>
      <div className="course-authoring-actions">
        <button className="secondary-button compact" onClick={preview}><ExternalLink size={16} /> Vista previa</button>
        <button className="primary-button compact" onClick={() => saveConfig()} disabled={busy || !dirty}>
          {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </header>

    <div className="course-authoring-layout">
      <aside className="course-authoring-nav">
        <div className="authoring-progress-card">
          <div className="authoring-progress-top">
            <span>Preparación</span>
            <strong>{readiness.percent}%</strong>
          </div>
          <div className="authoring-progress-track"><span style={{ width: readiness.percent + '%' }} /></div>
          <small>{readiness.ready ? 'La capacitación cumple los mínimos para publicación.' : 'Completa los pasos obligatorios para poder publicar.'}</small>
        </div>

        <nav className="authoring-step-nav">
          {steps.map((step, index) => {
            const Icon = step.icon
            return <button key={step.id} className={activeStep === step.id ? 'active' : ''} onClick={() => setActiveStep(step.id)}>
              <span className="step-number">{index + 1}</span>
              <span className="step-icon"><Icon size={17} /></span>
              <span className="step-copy"><strong>{step.label}</strong><small>{step.detail}</small></span>
              <ChevronDown size={15} className="step-chevron" />
            </button>
          })}
        </nav>

        <div className="authoring-help-card">
          <Sparkles size={18} />
          <div><strong>Consejo rápido</strong><span>Una capacitación clara suele tener fases cortas, contenidos variados y un examen que evalúe lo esencial.</span></div>
        </div>
      </aside>

      <main className="course-authoring-main">
        {activeStep === 'overview' && (
          <CourseOverviewStep
            config={config}
            updateConfig={updateConfig}
            coverUrl={coverUrl}
            coverFile={coverFile}
            setCoverFile={(file) => { setCoverFile(file); setDirty(true) }}
            saveConfig={saveConfig}
            busy={busy}
          />
        )}

        {activeStep === 'structure' && (
          <section className="authoring-section">
            <SectionHeader
              eyebrow="Paso 2"
              title="Construye la ruta de aprendizaje"
              description="Organiza el curso en fases. Dentro de cada fase puedes combinar lecturas, videos, archivos, imágenes, enlaces, juegos y validaciones."
              icon={LayoutList}
            />

            <form className="phase-quick-create" onSubmit={addPhase}>
              <div>
                <strong>Agregar una nueva fase</strong>
                <small>Ej. Introducción, Seguridad, Procedimiento, Evaluación práctica…</small>
              </div>
              <input value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} placeholder="Nombre de la nueva fase" />
              <button className="primary-button compact" disabled={!phaseTitle.trim()}><Plus size={16} /> Agregar</button>
            </form>

            <div className="phase-authoring-list">
              {phases.map((phase, index) => {
                const expanded = openPhase === phase.id
                return <article className={'phase-authoring-card ' + (expanded ? 'expanded' : '')} key={phase.id}>
                  <div className="phase-authoring-heading">
                    <button className="phase-toggle-button" onClick={() => setOpenPhase(expanded ? null : phase.id)}>
                      <span className="phase-sequence">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span>Fase {index + 1}</span>
                        <strong>{phase.title}</strong>
                        <small>{phase.description || 'Sin descripción'} · {(phase.blocks || []).length} contenido(s)</small>
                      </div>
                      <ChevronDown size={18} className={expanded ? 'open' : ''} />
                    </button>
                    <div className="row-actions phase-actions">
                      <button className="icon-button" title="Subir fase" disabled={index === 0} onClick={() => movePhase(index, -1)}><ArrowUp size={16} /></button>
                      <button className="icon-button" title="Bajar fase" disabled={index === phases.length - 1} onClick={() => movePhase(index, 1)}><ArrowDown size={16} /></button>
                      <button className="icon-button" title="Editar fase" onClick={() => { setOpenPhase(phase.id); setOpenEditor(openEditor === phase.id ? null : phase.id) }}><Edit3 size={16} /></button>
                      <button className="icon-button danger" title="Eliminar fase" onClick={() => deletePhase(phase.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {expanded && <div className="phase-authoring-body">
                    {openEditor === phase.id && (
                      <PhaseEditor
                        phase={phase}
                        done={async () => { setOpenEditor(null); await load() }}
                        setMessage={setMessage}
                      />
                    )}
                    <BlockList
                      courseId={course.id}
                      phase={phase}
                      refresh={load}
                      setMessage={setMessage}
                    />
                  </div>}
                </article>
              })}

              {!phases.length && (
                <div className="authoring-empty-state">
                  <span><LayoutList size={26} /></span>
                  <strong>Empieza por una fase</strong>
                  <p>Una fase agrupa contenidos relacionados. Por ejemplo: “Bienvenida”, “Conceptos básicos”, “Procedimiento” y “Cierre”.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeStep === 'exam' && (
          <section className="authoring-section">
            <SectionHeader
              eyebrow="Paso 3"
              title="Diseña el examen final"
              description="Evalúa los conocimientos esenciales. Puedes crear preguntas una a una o importar varias desde una plantilla."
              icon={FileQuestion}
            />
            <ExamBuilder courseId={course.id} questions={questions} refresh={load} setMessage={setMessage} />
          </section>
        )}

        {activeStep === 'publish' && (
          <PublishStep
            config={config}
            readiness={readiness}
            phases={phases}
            totalBlocks={totalBlocks}
            requiredBlocks={requiredBlocks}
            questions={questions}
            setActiveStep={setActiveStep}
            publishCourse={publishCourse}
            setCourseStatus={setCourseStatus}
            preview={preview}
            busy={busy}
          />
        )}
      </main>

      <aside className="course-authoring-inspector">
        <div className="authoring-inspector-card">
          <div className="inspector-title">
            <CheckCircle2 size={18} />
            <div><strong>Lista de revisión</strong><small>Lo esencial para una capacitación completa.</small></div>
          </div>
          <div className="readiness-checklist">
            {readiness.checks.map((item) => (
              <button key={item.id} className={item.done ? 'done' : ''} onClick={() => setActiveStep(item.step)}>
                <span>{item.done ? <Check size={13} /> : <CircleAlert size={13} />}</span>
                <div><strong>{item.label}</strong>{item.optional && <small>Recomendado</small>}</div>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>

        <div className="authoring-inspector-card course-summary-card">
          <span className="eyebrow">Resumen</span>
          <dl>
            <div><dt>Fases</dt><dd>{phases.length}</dd></div>
            <div><dt>Contenidos</dt><dd>{totalBlocks}</dd></div>
            <div><dt>Obligatorios</dt><dd>{requiredBlocks}</dd></div>
            <div><dt>Preguntas</dt><dd>{questions.length}</dd></div>
            <div><dt>Aprobación</dt><dd>{config.passing_score}%</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  </div>
}

function CourseOverviewStep({ config, updateConfig, coverUrl, coverFile, setCoverFile, saveConfig, busy }) {
  return <section className="authoring-section">
    <SectionHeader
      eyebrow="Paso 1"
      title="Define la capacitación"
      description="Completa la información principal y la portada. Esto ayuda a que el colaborador entienda rápidamente de qué trata el curso."
      icon={Settings2}
    />

    <div className="course-overview-grid">
      <section className="authoring-card">
        <div className="authoring-card-title">
          <div><strong>Información principal</strong><small>Usa textos claros y orientados a lo que la persona va a aprender.</small></div>
        </div>

        <div className="authoring-form-grid">
          <label className="wide">Título
            <input value={config.title} onChange={(event) => updateConfig({ title: event.target.value })} placeholder="Nombre de la capacitación" />
            <small className="helper-text">Debe ser fácil de identificar en el catálogo y en las asignaciones.</small>
          </label>
          <label className="wide">Descripción
            <textarea rows="6" value={config.description} onChange={(event) => updateConfig({ description: event.target.value })} placeholder="¿Qué aprenderá la persona? ¿Qué objetivo tiene esta capacitación?" />
            <small className="helper-text">{config.description.trim().length < 20 ? 'Recomendación: escribe al menos una frase completa.' : 'Descripción con buen nivel de detalle.'}</small>
          </label>
          <label className="wide">Nota mínima de aprobación
            <div className="score-control-large">
              <input type="range" min="1" max="100" value={config.passing_score} onChange={(event) => updateConfig({ passing_score: Number(event.target.value) })} />
              <div><strong>{config.passing_score}%</strong><span>mínimo para aprobar el examen</span></div>
              <input type="number" min="1" max="100" value={config.passing_score} onChange={(event) => updateConfig({ passing_score: clampScore(event.target.value) })} />
            </div>
          </label>
        </div>
      </section>

      <section className="authoring-card cover-authoring-card">
        <div className="authoring-card-title">
          <div><strong>Portada</strong><small>Recomendada para que la capacitación sea fácil de reconocer.</small></div>
        </div>
        <label className={'course-cover-dropzone ' + (coverUrl ? 'has-image' : '')}>
          {coverUrl ? <img src={coverUrl} alt="Portada de la capacitación" /> : <div><Image size={32} /><strong>Agrega una imagen de portada</strong><span>PNG, JPG o WEBP. Preferiblemente horizontal.</span></div>}
          <input type="file" accept="image/*" hidden onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />
          <span className="cover-change-button"><Upload size={15} /> {coverUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
        </label>
        {coverFile && <div className="pending-cover-note"><CheckCircle2 size={15} /> Imagen seleccionada. Se subirá cuando guardes.</div>}
      </section>
    </div>

    <div className="authoring-step-footer">
      <div><strong>{config.title.trim() ? 'Información lista para guardar' : 'Falta el título'}</strong><span>Puedes continuar editando y guardar cuando quieras.</span></div>
      <button className="primary-button" onClick={() => saveConfig()} disabled={busy || !config.title.trim()}>
        {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} Guardar información
      </button>
    </div>
  </section>
}

function SectionHeader({ eyebrow, title, description, icon: Icon }) {
  return <div className="authoring-section-header">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <span className="authoring-section-icon"><Icon size={25} /></span>
  </div>
}

function PhaseEditor({ phase, done, setMessage }) {
  const [title, setTitle] = useState(phase.title)
  const [description, setDescription] = useState(phase.description || '')
  const [busy, setBusy] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    if (!title.trim()) return setMessage('La fase necesita un título.')
    setBusy(true)
    const { error } = await supabase
      .from('course_phases')
      .update({ title: title.trim(), description: description.trim() })
      .eq('id', phase.id)
    setBusy(false)
    if (error) setMessage(error.message)
    else {
      setMessage('Fase actualizada.')
      await done()
    }
  }

  return <form className="phase-editor-panel" onSubmit={save}>
    <div className="phase-editor-heading"><Edit3 size={17} /><strong>Editar información de la fase</strong></div>
    <div className="form-grid">
      <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="wide">Descripción<textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explica brevemente qué se trabajará en esta fase." /></label>
    </div>
    <div className="row-actions"><button className="primary-button compact" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Guardar fase</button></div>
  </form>
}

function BlockList({ courseId, phase, refresh, setMessage }) {
  const [editing, setEditing] = useState(null)
  const blocks = phase.blocks || []

  const remove = async (id) => {
    const block = blocks.find((item) => item.id === id)
    if (!window.confirm(`¿Eliminar "${block?.title || 'este contenido'}"?`)) return
    const { error } = await supabase.from('content_blocks').delete().eq('id', id)
    if (error) setMessage(error.message)
    else {
      setMessage('Contenido eliminado.')
      await refresh()
    }
  }

  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    const a = blocks[index]
    const b = blocks[target]
    const result = await Promise.all([
      supabase.from('content_blocks').update({ sort_order: target }).eq('id', a.id),
      supabase.from('content_blocks').update({ sort_order: index }).eq('id', b.id),
    ])
    const failure = result.find((item) => item.error)
    if (failure?.error) setMessage(failure.error.message)
    else await refresh()
  }

  return <div className="block-authoring-section">
    <div className="block-authoring-top">
      <div><strong>Contenidos de esta fase</strong><small>{blocks.length ? 'El orden de arriba hacia abajo será el orden que verá el colaborador.' : 'Agrega el primer contenido de esta fase.'}</small></div>
      <button className="primary-button compact" onClick={() => setEditing(editing === 'new' ? null : 'new')}>
        {editing === 'new' ? <X size={16} /> : <Plus size={16} />} {editing === 'new' ? 'Cerrar' : 'Agregar contenido'}
      </button>
    </div>

    {editing === 'new' && (
      <BlockEditor
        courseId={courseId}
        phaseId={phase.id}
        nextOrder={blocks.length}
        done={async () => { setEditing(null); await refresh() }}
        setMessage={setMessage}
      />
    )}

    <div className="block-authoring-list">
      {blocks.map((block, index) => {
        const type = BLOCK_TYPES.find((item) => item.value === block.type) || BLOCK_TYPES[0]
        const Icon = type.icon
        return <article className={'block-authoring-card ' + (editing === block.id ? 'editing' : '')} key={block.id}>
          <div className="block-order">{index + 1}</div>
          <span className={'block-type-icon type-' + block.type}><Icon size={18} /></span>
          <div className="block-authoring-copy">
            <div className="block-title-row">
              <strong>{block.title}</strong>
              <span className="block-kind">{type.label}</span>
              {block.required && <span className="required-pill">Obligatorio</span>}
              <span className={'block-state ' + block.status}>{block.status === 'published' ? 'Publicado' : 'Borrador'}</span>
            </div>
            <p>{block.description || type.detail}</p>
          </div>
          <div className="row-actions block-authoring-actions">
            <button className="icon-button" title="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button className="icon-button" title="Bajar" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button className="icon-button" title="Editar" onClick={() => setEditing(editing === block.id ? null : block.id)}><Edit3 size={15} /></button>
            <button className="icon-button danger" title="Eliminar" onClick={() => remove(block.id)}><Trash2 size={15} /></button>
          </div>

          {editing === block.id && (
            <div className="block-editor-row">
              <BlockEditor
                courseId={courseId}
                phaseId={phase.id}
                nextOrder={block.sort_order}
                existing={block}
                done={async () => { setEditing(null); await refresh() }}
                setMessage={setMessage}
              />
            </div>
          )}
        </article>
      })}
    </div>
  </div>
}

function BlockEditor({ courseId, phaseId, nextOrder, existing, done, setMessage }) {
  const source = existing?.content || {}
  const [form, setForm] = useState({
    ...EMPTY_BLOCK,
    type: existing?.type || 'text',
    title: existing?.title || '',
    description: existing?.description || '',
    required: existing?.required ?? true,
    text: source.html || source.text || '',
    url: source.url || '',
    prompt: source.prompt || '',
    optionA: source.options?.[0] || '',
    optionB: source.options?.[1] || '',
    optionC: source.options?.[2] || '',
    optionD: source.options?.[3] || '',
    correctIndex: Number(source.correctIndex || 0),
    gameType: source.gameType || 'multiple_choice',
    instructions: source.instructions || '',
    status: existing?.status || 'published',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileTypes = ['video', 'presentation', 'image', 'audio', 'file']
  const selectedType = BLOCK_TYPES.find((item) => item.value === form.type) || BLOCK_TYPES[0]

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (!form.title.trim()) throw new Error('Escribe un título para el contenido.')
      let assetPath = existing?.asset_path || null
      if (file) assetPath = await uploadCourseAsset(courseId, file)

      let content = {}
      if (form.type === 'text') content = { html: form.text }
      else if (form.type === 'link') content = { url: form.url.trim() }
      else if (fileTypes.includes(form.type)) content = { url: form.url.trim() }
      else if (form.type === 'validation') {
        const options = [form.optionA, form.optionB, form.optionC, form.optionD].map((value) => value.trim()).filter(Boolean)
        if (!form.prompt.trim() || options.length < 2) throw new Error('Completa la pregunta y al menos dos opciones de respuesta.')
        if (form.correctIndex >= options.length) throw new Error('Selecciona una respuesta correcta válida.')
        content = { prompt: form.prompt.trim(), options, correctIndex: form.correctIndex }
      } else if (form.type === 'game') {
        content = { gameType: form.gameType.trim(), instructions: form.instructions.trim() }
      }

      if (fileTypes.includes(form.type) && !file && !form.url.trim() && !existing?.asset_path) {
        throw new Error('Sube un archivo o pega un enlace de Drive / OneDrive.')
      }

      const payload = {
        phase_id: phaseId,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        required: form.required,
        sort_order: existing?.sort_order ?? nextOrder,
        status: form.status,
        content,
        asset_path: assetPath,
        completion_rule: { mode: form.type === 'video' ? 'watch_to_end' : 'manual' },
      }

      const result = existing
        ? await supabase.from('content_blocks').update(payload).eq('id', existing.id)
        : await supabase.from('content_blocks').insert(payload)

      if (result.error) throw result.error
      setMessage(existing ? 'Contenido actualizado.' : 'Contenido agregado.')
      await done()
    } catch (error) {
      setMessage(getError(error, 'No fue posible guardar el contenido.'))
    } finally {
      setBusy(false)
    }
  }

  return <form className="block-editor-pro" onSubmit={save}>
    <div className="block-editor-heading">
      <div>
        <span className="eyebrow">{existing ? 'Editar contenido' : 'Nuevo contenido'}</span>
        <h4>{selectedType.label}</h4>
        <p>{selectedType.detail}</p>
      </div>
    </div>

    <div className="content-type-picker">
      {BLOCK_TYPES.map((type) => {
        const Icon = type.icon
        return <button type="button" key={type.value} className={form.type === type.value ? 'selected' : ''} onClick={() => setForm((current) => ({ ...current, type: type.value }))}>
          <span><Icon size={19} /></span>
          <strong>{type.label}</strong>
          <small>{type.detail}</small>
          {form.type === type.value && <CheckCircle2 size={16} className="content-type-check" />}
        </button>
      })}
    </div>

    <div className="block-editor-form">
      <label>Título
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={'Ej. ' + exampleForType(form.type)} required />
      </label>
      <label>Descripción breve
        <textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explica qué debe hacer o aprender la persona en este contenido." />
      </label>

      {form.type === 'text' && (
        <label>Contenido de lectura
          <textarea rows="10" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Escribe aquí el contenido principal. Puedes usar texto claro, listas y párrafos cortos." />
          <small className="helper-text">Consejo: divide textos largos en varios contenidos para facilitar la lectura.</small>
        </label>
      )}

      {(form.type === 'link' || fileTypes.includes(form.type)) && (
        <div className="resource-source-grid">
          <label>Enlace externo / Drive / OneDrive
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://…" />
            <small className="helper-text">{form.type === 'link' ? 'Pega el enlace que abrirá el colaborador.' : 'Puedes usar un enlace si no quieres subir el archivo directamente.'}</small>
          </label>
          {fileTypes.includes(form.type) && (
            <label className="resource-upload-box">
              <Upload size={22} />
              <strong>{file ? file.name : existing?.asset_path ? 'Reemplazar archivo actual' : 'Subir archivo'}</strong>
              <span>Haz clic para seleccionar un archivo desde tu equipo.</span>
              <input type="file" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
          )}
        </div>
      )}

      {form.type === 'validation' && (
        <div className="validation-builder">
          <label>Pregunta de validación
            <input value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="¿Qué debe recordar la persona antes de continuar?" />
          </label>
          <div className="validation-options-grid">
            {['A', 'B', 'C', 'D'].map((letter, index) => (
              <label key={letter} className={'validation-option ' + (form.correctIndex === index ? 'correct' : '')}>
                <span>{letter}</span>
                <input value={form['option' + letter]} onChange={(event) => setForm({ ...form, ['option' + letter]: event.target.value })} placeholder={'Opción ' + letter} />
                <button type="button" onClick={() => setForm({ ...form, correctIndex: index })}>{form.correctIndex === index ? <Check size={14} /> : 'Marcar correcta'}</button>
              </label>
            ))}
          </div>
        </div>
      )}

      {form.type === 'game' && (
        <div className="game-builder-grid">
          <label>Tipo de juego
            <input value={form.gameType} onChange={(event) => setForm({ ...form, gameType: event.target.value })} placeholder="multiple_choice" />
          </label>
          <label>Instrucciones
            <textarea rows="5" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Explica qué debe hacer la persona y cuándo se considera completado." />
          </label>
        </div>
      )}

      <div className="block-options-row">
        <label className="toggle-option">
          <input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} />
          <span><strong>Contenido obligatorio</strong><small>Debe completarse antes del examen final.</small></span>
        </label>
        <label className="block-status-select">Estado
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
        </label>
      </div>
    </div>

    <div className="block-editor-footer">
      <div><strong>{existing ? 'Editando contenido existente' : 'Nuevo contenido'}</strong><span>Los cambios se aplicarán solo al guardar.</span></div>
      <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {existing ? 'Guardar cambios' : 'Agregar contenido'}</button>
    </div>
  </form>
}

function ExamBuilder({ courseId, questions, refresh, setMessage }) {
  const [form, setForm] = useState(EMPTY_QUESTION)
  const [editingId, setEditingId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)

  const sortedOptions = (question) => [...(question.options || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  const edit = (question) => {
    const options = sortedOptions(question)
    const correct = Math.max(0, options.findIndex((item) => item.is_correct))
    setEditingId(question.id)
    setForm({
      prompt: question.prompt,
      a: options[0]?.label || '',
      b: options[1]?.label || '',
      c: options[2]?.label || '',
      d: options[3]?.label || '',
      correct: ['A', 'B', 'C', 'D'][correct] || 'A',
    })
    window.requestAnimationFrame(() => document.querySelector('.question-editor-pro')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const optionsFor = (value) => [value.a, value.b, value.c, value.d].map((label, index) => ({
    label: label.trim(),
    sort_order: index,
    is_correct: ['A', 'B', 'C', 'D'][index] === value.correct,
  }))

  const save = async (event) => {
    event.preventDefault()
    const clean = {
      ...form,
      prompt: form.prompt.trim(),
      a: form.a.trim(),
      b: form.b.trim(),
      c: form.c.trim(),
      d: form.d.trim(),
    }
    const options = optionsFor(clean)
    if (!clean.prompt || options.some((item) => !item.label)) {
      return setMessage('Completa la pregunta y las opciones A, B, C y D.')
    }

    setBusy(true)
    try {
      let questionId = editingId
      if (editingId) {
        const update = await supabase.from('questions').update({ prompt: clean.prompt, active: true }).eq('id', editingId)
        if (update.error) throw update.error
        const remove = await supabase.from('question_options').delete().eq('question_id', editingId)
        if (remove.error) throw remove.error
      } else {
        const created = await supabase
          .from('questions')
          .insert({ course_id: courseId, prompt: clean.prompt, sort_order: questions.length, active: true })
          .select()
          .single()
        if (created.error) throw created.error
        questionId = created.data.id
      }

      const inserted = await supabase
        .from('question_options')
        .insert(options.map((item) => ({ ...item, question_id: questionId })))
      if (inserted.error) throw inserted.error

      setEditingId(null)
      setForm(EMPTY_QUESTION)
      setMessage(editingId ? 'Pregunta actualizada.' : 'Pregunta agregada al examen.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible guardar la pregunta.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta del examen final?')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) setMessage(error.message)
    else {
      setMessage('Pregunta eliminada.')
      await refresh()
    }
  }

  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= questions.length) return
    const results = await Promise.all([
      supabase.from('questions').update({ sort_order: target }).eq('id', questions[index].id),
      supabase.from('questions').update({ sort_order: index }).eq('id', questions[target].id),
    ])
    const failure = results.find((item) => item.error)
    if (failure?.error) setMessage(failure.error.message)
    else await refresh()
  }

  const parseImport = () => importText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('pregunta;'))
    .map((line, index) => {
      const columns = line.split(';').map((value) => value.trim())
      if (columns.length < 6) throw new Error('La línea ' + String(index + 1) + ' no tiene 6 columnas separadas por punto y coma.')
      const correct = columns[5].toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(correct)) throw new Error('La línea ' + String(index + 1) + ' tiene una respuesta correcta inválida.')
      return { prompt: columns[0], a: columns[1], b: columns[2], c: columns[3], d: columns[4], correct }
    })

  const importQuestions = async () => {
    setBusy(true)
    try {
      const rows = parseImport()
      if (!rows.length) throw new Error('No hay preguntas para importar.')

      for (let index = 0; index < rows.length; index += 1) {
        const item = rows[index]
        const created = await supabase
          .from('questions')
          .insert({ course_id: courseId, prompt: item.prompt, sort_order: questions.length + index, active: true })
          .select()
          .single()
        if (created.error) throw created.error

        const inserted = await supabase
          .from('question_options')
          .insert(optionsFor(item).map((option) => ({ ...option, question_id: created.data.id })))
        if (inserted.error) throw inserted.error
      }

      setImportText('')
      setImportOpen(false)
      setMessage(String(rows.length) + ' preguntas importadas.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible importar las preguntas.'))
    } finally {
      setBusy(false)
    }
  }

  const download = (name, text) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const template = 'Pregunta;A;B;C;D;Correcta\n¿Qué es un peligro?;Una fuente con potencial de causar daño;Un pago;Un documento;Una capacitación;A\n¿Qué debe hacerse ante una señal de alerta?;Ignorarla;Reportarla;Borrarla;Comentarlo informalmente;B'

  const exportText = useMemo(() => [
    'Pregunta;A;B;C;D;Correcta',
    ...questions.map((question) => {
      const options = sortedOptions(question)
      const correct = Math.max(0, options.findIndex((item) => item.is_correct))
      return [
        question.prompt,
        options[0]?.label || '',
        options[1]?.label || '',
        options[2]?.label || '',
        options[3]?.label || '',
        ['A', 'B', 'C', 'D'][correct] || 'A',
      ].map((value) => String(value).replace(/\r?\n/g, ' ').replace(/;/g, ',')).join(';')
    }),
  ].join('\n'), [questions])

  return <div className="exam-authoring-workspace">
    <div className="exam-authoring-summary">
      <div className="exam-summary-metric"><span><FileQuestion size={19} /></span><div><strong>{questions.length}</strong><small>preguntas</small></div></div>
      <div className="exam-summary-copy">
        <strong>Examen final</strong>
        <span>La nota mínima del curso se configura en “Información”. Marca una respuesta correcta en cada pregunta.</span>
      </div>
      <div className="toolbar-buttons exam-toolbar">
        <button className="secondary-button compact" onClick={() => setImportOpen((value) => !value)}><Upload size={16} /> Importar</button>
        <button className="secondary-button compact" onClick={() => download('plantilla-examen-aula-ei.csv', template)}><Download size={16} /> Plantilla</button>
        <button className="secondary-button compact" onClick={() => download('preguntas-examen-aula-ei.csv', exportText)} disabled={!questions.length}><Download size={16} /> Exportar</button>
      </div>
    </div>

    {importOpen && <div className="exam-import-panel">
      <div><strong>Importar varias preguntas</strong><span>Pega contenido con formato: Pregunta;A;B;C;D;Correcta</span></div>
      <textarea rows="7" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Pregunta;A;B;C;D;Correcta" />
      <div className="row-actions">
        <button className="secondary-button compact" onClick={() => { setImportOpen(false); setImportText('') }}>Cancelar</button>
        <button className="primary-button compact" onClick={importQuestions} disabled={busy || !importText.trim()}>{busy ? <Loader2 className="spin" size={15} /> : <Upload size={15} />} Importar preguntas</button>
      </div>
    </div>}

    <form className="question-editor-pro" onSubmit={save}>
      <div className="question-editor-pro-head">
        <div><span className="eyebrow">{editingId ? 'Editando' : 'Nueva pregunta'}</span><h3>{editingId ? 'Modifica la pregunta y sus respuestas' : 'Agrega una pregunta al examen'}</h3></div>
        {editingId && <button type="button" className="text-action" onClick={() => { setEditingId(null); setForm(EMPTY_QUESTION) }}><X size={15} /> Cancelar edición</button>}
      </div>

      <label className="question-prompt-field">Pregunta
        <textarea rows="4" value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="Escribe una pregunta clara y específica." required />
      </label>

      <div className="exam-options-grid">
        {['A', 'B', 'C', 'D'].map((letter) => {
          const key = letter.toLowerCase()
          return <label key={letter} className={'exam-option-card ' + (form.correct === letter ? 'correct' : '')}>
            <span className="exam-option-letter">{letter}</span>
            <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={'Respuesta ' + letter} required />
            <button type="button" onClick={() => setForm({ ...form, correct: letter })}>{form.correct === letter ? <><Check size={14} /> Correcta</> : 'Marcar correcta'}</button>
          </label>
        })}
      </div>

      <div className="question-editor-pro-footer">
        <div><CheckCircle2 size={16} /><span>Respuesta correcta: <strong>{form.correct}</strong></span></div>
        <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? 'Guardar pregunta' : 'Agregar pregunta'}</button>
      </div>
    </form>

    <div className="exam-question-list">
      <div className="exam-question-list-head"><strong>Preguntas del examen</strong><span>Ordena las preguntas con las flechas.</span></div>
      {questions.map((question, index) => {
        const options = sortedOptions(question)
        const correct = options.find((item) => item.is_correct)
        return <article key={question.id} className="exam-question-card">
          <span className="question-number">{index + 1}</span>
          <div>
            <strong>{question.prompt}</strong>
            <small>Respuesta correcta: {correct?.label || 'Sin definir'}</small>
          </div>
          <div className="row-actions">
            <button className="icon-button" title="Editar" onClick={() => edit(question)}><Edit3 size={15} /></button>
            <button className="icon-button" title="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button className="icon-button" title="Bajar" disabled={index === questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button className="icon-button danger" title="Eliminar" onClick={() => remove(question.id)}><Trash2 size={15} /></button>
          </div>
        </article>
      })}
      {!questions.length && <div className="authoring-empty-state small"><span><FileQuestion size={24} /></span><strong>Aún no hay preguntas</strong><p>Agrega al menos una pregunta para que la capacitación pueda publicarse.</p></div>}
    </div>
  </div>
}

function PublishStep({ config, readiness, phases, totalBlocks, requiredBlocks, questions, setActiveStep, publishCourse, setCourseStatus, preview, busy }) {
  return <section className="authoring-section">
    <SectionHeader
      eyebrow="Paso 4"
      title="Revisa antes de publicar"
      description="Aula EI valida los elementos mínimos para evitar publicar una capacitación incompleta."
      icon={Rocket}
    />

    <div className="publish-hero-card">
      <div className={'publish-readiness-ring ' + (readiness.ready ? 'ready' : '')}>
        <strong>{readiness.percent}%</strong>
        <span>preparación</span>
      </div>
      <div>
        <span className="eyebrow">{readiness.ready ? 'Todo listo' : 'Aún hay pendientes'}</span>
        <h3>{readiness.ready ? 'La capacitación puede publicarse.' : 'Completa los elementos obligatorios.'}</h3>
        <p>{readiness.ready ? 'Haz una vista previa y, cuando estés conforme, publícala para que pueda ser asignada.' : 'Usa la lista inferior para ir directamente al paso que requiere atención.'}</p>
      </div>
      <button className="secondary-button" onClick={preview}><ExternalLink size={17} /> Vista previa</button>
    </div>

    <div className="publish-check-grid">
      {readiness.checks.filter((item) => !item.optional).map((item) => (
        <button key={item.id} className={item.done ? 'done' : 'pending'} onClick={() => setActiveStep(item.step)}>
          <span>{item.done ? <Check size={16} /> : <CircleAlert size={16} />}</span>
          <div><strong>{item.label}</strong><small>{item.done ? 'Completo' : 'Pendiente'}</small></div>
          <ArrowRight size={15} />
        </button>
      ))}
    </div>

    <div className="publish-course-summary">
      <article><strong>{phases.length}</strong><span>Fases</span></article>
      <article><strong>{totalBlocks}</strong><span>Contenidos</span></article>
      <article><strong>{requiredBlocks}</strong><span>Obligatorios</span></article>
      <article><strong>{questions.length}</strong><span>Preguntas</span></article>
      <article><strong>{config.passing_score}%</strong><span>Aprobación</span></article>
    </div>

    <section className="publish-actions-card">
      <div>
        <span className={'course-status-badge ' + config.status}>{statusLabel(config.status)}</span>
        <h3>Estado actual: {statusLabel(config.status)}</h3>
        <p>{config.status === 'published' ? 'La capacitación está visible para las personas que tengan una asignación válida.' : config.status === 'archived' ? 'La capacitación está archivada y no debe usarse para nuevas asignaciones.' : 'La capacitación permanece en borrador y aún no está disponible para colaboradores.'}</p>
      </div>
      <div className="publish-action-buttons">
        {config.status !== 'draft' && <button className="secondary-button" disabled={busy} onClick={() => setCourseStatus('draft')}><Edit3 size={16} /> Pasar a borrador</button>}
        {config.status !== 'archived' && <button className="secondary-button danger-outline" disabled={busy} onClick={() => setCourseStatus('archived')}><Archive size={16} /> Archivar</button>}
        {config.status !== 'published' && <button className="primary-button publish-button" disabled={busy || !readiness.ready} onClick={publishCourse}>{busy ? <Loader2 className="spin" size={17} /> : <Rocket size={17} />} Publicar capacitación</button>}
      </div>
    </section>
  </section>
}

function statusLabel(status) {
  if (status === 'published') return 'Publicada'
  if (status === 'archived') return 'Archivada'
  return 'Borrador'
}

function clampScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 80
  return Math.max(1, Math.min(100, Math.round(number)))
}

function exampleForType(type) {
  const examples = {
    text: 'Conceptos clave',
    video: 'Video de introducción',
    presentation: 'Presentación del proceso',
    image: 'Infografía de seguridad',
    audio: 'Cápsula de audio',
    file: 'Manual descargable',
    link: 'Recurso de consulta',
    game: 'Actividad de práctica',
    validation: 'Verificación rápida',
  }
  return examples[type] || 'Contenido de la fase'
}
