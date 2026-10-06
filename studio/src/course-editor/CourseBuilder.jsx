import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, ChevronDown, CircleAlert, Edit3, ExternalLink, FileQuestion, LayoutList, Loader2, Plus, Rocket, Save, Settings2, Sparkles, Trash2,
} from 'lucide-react'
import { getError, signedAsset, supabase } from '../shared.js'
import { appUrl } from '../../../src/paths.js'
import ExamBuilder from './ExamBuilder.jsx'
import {
  BlockEditor,
  BlockList,
  CourseOverviewStep,
  PhaseEditor,
  PublishStep,
} from './CourseBuilderPanels.jsx'
import { statusLabel } from './course-utils.js'

export default function CourseBuilder({ course, onBack, refresh, setMessage }) {
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
