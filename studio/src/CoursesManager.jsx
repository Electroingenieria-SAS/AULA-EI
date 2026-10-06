import React, { useEffect, useMemo, useState } from 'react'
import {
  Archive, ArrowRight, BookOpen, CheckCircle2, Edit3, LayoutList, Loader2, Plus, Rocket, Search, Settings2, Sparkles, X,
} from 'lucide-react'
import { getError, slugify, supabase } from './shared.js'
import CourseBuilder from './course-editor/CourseBuilder.jsx'
import { clampScore, statusLabel } from './course-editor/course-utils.js'

const EMPTY_COURSE = { title: '', description: '', passing_score: 80 }
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
