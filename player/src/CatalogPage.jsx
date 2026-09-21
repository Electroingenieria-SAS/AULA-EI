import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, CircleAlert,
  Clock3, FileCheck2, Filter, GraduationCap, Home, Loader2, PlayCircle,
  RefreshCw, Search, SlidersHorizontal, Sparkles, Trophy, X,
} from 'lucide-react'
import LearnerTopbar from './LearnerTopbar.jsx'
import { navigateLearner, openLearnerCourse } from './navigation.js'
import { supabase } from './supabase.js'

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'new', label: 'Sin iniciar' },
  { key: 'progress', label: 'En progreso' },
  { key: 'exam', label: 'Listas para examen' },
  { key: 'certified', label: 'Certificadas' },
]

const SORTS = [
  { key: 'recent', label: 'Más recientes' },
  { key: 'due', label: 'Fecha límite' },
  { key: 'progress', label: 'Mayor progreso' },
  { key: 'title', label: 'A–Z' },
]

export default function CatalogPage() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [hiddenCount, setHiddenCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')

  const load = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setMessage('')

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const sessionUser = sessionData.session?.user

      if (!sessionUser) {
        window.location.replace('/#/login')
        return
      }

      setUser(sessionUser)

      const [enrollmentsResult, phasesResult, progressResult, certificatesResult] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id,status,due_at,created_at,updated_at,course:courses(id,title,description,passing_score,status,cover_path)')
          .eq('user_id', sessionUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('course_phases')
          .select('id,course_id,blocks:content_blocks(id,required,status)'),
        supabase
          .from('block_progress')
          .select('block_id,status,progress_percent,completed_at')
          .eq('user_id', sessionUser.id),
        supabase.rpc('get_my_certificates'),
      ])

      if (enrollmentsResult.error) throw enrollmentsResult.error
      if (phasesResult.error) throw phasesResult.error
      if (progressResult.error) throw progressResult.error

      const enrollments = enrollmentsResult.data || []
      const visible = enrollments.filter((item) => item?.course?.id)
      setHiddenCount(enrollments.length - visible.length)

      const phaseMap = new Map()
      for (const phase of phasesResult.data || []) {
        const current = phaseMap.get(phase.course_id) || []
        current.push(...(phase.blocks || []).filter((block) => block.status !== 'draft'))
        phaseMap.set(phase.course_id, current)
      }

      const completed = new Set((progressResult.data || []).filter((item) => item.status === 'completed').map((item) => item.block_id))
      const certificates = certificatesResult.error ? [] : (certificatesResult.data || [])

      const normalized = visible.map((enrollment) => {
        const course = enrollment.course
        const blocks = phaseMap.get(course.id) || []
        const required = blocks.filter((block) => block.required)
        const requiredDone = required.filter((block) => completed.has(block.id)).length
        const progress = required.length ? Math.round((requiredDone / required.length) * 100) : (blocks.length ? 0 : 0)
        const certificate = certificates.find((item) =>
          item.course_id === course.id ||
          (item.course_title && String(item.course_title).trim().toLowerCase() === String(course.title).trim().toLowerCase())
        ) || null
        const dueAt = enrollment.due_at ? new Date(enrollment.due_at) : null
        const overdue = Boolean(dueAt && dueAt.getTime() < Date.now() && !certificate)

        let journey = 'new'
        if (certificate || enrollment.status === 'completed') journey = 'certified'
        else if (progress >= 100) journey = 'exam'
        else if (progress > 0 || enrollment.status === 'in_progress') journey = 'progress'

        return {
          ...enrollment,
          course,
          blocks,
          requiredCount: required.length,
          completedCount: requiredDone,
          progress,
          certificate,
          overdue,
          journey,
        }
      })

      setCourses(normalized)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar tus capacitaciones.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const counts = useMemo(() => ({
    all: courses.length,
    new: courses.filter((item) => item.journey === 'new').length,
    progress: courses.filter((item) => item.journey === 'progress').length,
    exam: courses.filter((item) => item.journey === 'exam').length,
    certified: courses.filter((item) => item.journey === 'certified').length,
  }), [courses])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const list = courses.filter((item) => {
      if (filter !== 'all' && item.journey !== filter) return false
      if (!normalizedQuery) return true
      const haystack = [item.course.title, item.course.description, statusLabel(item.journey)].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(normalizedQuery)
    })

    return [...list].sort((a, b) => {
      if (sort === 'title') return a.course.title.localeCompare(b.course.title, 'es')
      if (sort === 'progress') return b.progress - a.progress
      if (sort === 'due') {
        const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER
        const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER
        return aDue - bDue
      }
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    })
  }, [courses, filter, query, sort])

  const resumeCourse = useMemo(() =>
    courses
      .filter((item) => item.journey === 'progress' || item.journey === 'exam')
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
        return b.progress - a.progress
      })[0] || null
  , [courses])

  const firstName = useMemo(() => {
    const raw = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
    return String(raw).trim().split(/\s+/)[0] || ''
  }, [user])

  return <main className="learner-course-app learner-catalog-app">
    <LearnerTopbar
      center={<div className="learner-topbar-page"><BookOpen size={16} /><div><span>Ruta personal</span><strong>Mis capacitaciones</strong></div></div>}
      actions={<>
        <button className="secondary-action" onClick={() => navigateLearner('/')}><Home size={16} /> Inicio</button>
        <button className="secondary-action catalog-refresh-top" onClick={() => load({ silent: true })} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Actualizar
        </button>
      </>}
    />

    <section className="catalog-intro">
      <div className="catalog-intro-motion" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => <i key={index} />)}
        <span className="catalog-orbit orbit-one" />
        <span className="catalog-orbit orbit-two" />
      </div>

      <div className="catalog-intro-copy">
        <span className="catalog-eyebrow"><Sparkles size={15} /> Tu aprendizaje, en un solo lugar</span>
        <h1>{firstName ? `${firstName}, sigue avanzando.` : 'Sigue avanzando.'}</h1>
        <p>Encuentra rápidamente lo que tienes pendiente, continúa exactamente donde quedaste y revisa tus capacitaciones completadas sin cambiar de experiencia visual.</p>
      </div>

      <div className="catalog-summary">
        <article><span>Asignadas</span><strong>{counts.all}</strong><small>capacitaciones visibles</small></article>
        <article><span>En progreso</span><strong>{counts.progress}</strong><small>para continuar</small></article>
        <article><span>Listas</span><strong>{counts.exam}</strong><small>para examen final</small></article>
        <article><span>Certificadas</span><strong>{counts.certified}</strong><small>rutas aprobadas</small></article>
      </div>
    </section>

    {message && <div className="catalog-message error"><CircleAlert size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></div>}
    {hiddenCount > 0 && <div className="catalog-message"><CircleAlert size={17} /><span>{hiddenCount} asignación(es) todavía no son visibles porque la capacitación no está publicada o no tiene permisos activos.</span></div>}

    {!loading && resumeCourse && <ResumeLearningCard item={resumeCourse} />}

    <section className="catalog-workspace">
      <header className="catalog-workspace-header">
        <div>
          <span>Biblioteca personal</span>
          <h2>Organiza tu recorrido</h2>
          <p>Busca, filtra y continúa sin perder contexto.</p>
        </div>

        <div className="catalog-result-count">
          <strong>{filteredCourses.length}</strong>
          <span>{filteredCourses.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
      </header>

      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por capacitación o estado…" />
          {query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
        </label>

        <label className="catalog-sort">
          <SlidersHorizontal size={17} />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORTS.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="catalog-filter-row" aria-label="Filtros de capacitaciones">
        <Filter size={16} />
        {FILTERS.map((item) => <button key={item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>
          <span>{item.label}</span><strong>{counts[item.key]}</strong>
        </button>)}
      </div>

      {loading ? <CatalogSkeleton /> : filteredCourses.length ? (
        <div className="catalog-course-grid" key={filter + ':' + sort + ':' + query}>
          {filteredCourses.map((item, index) => <CourseCard item={item} index={index} key={item.id} />)}
        </div>
      ) : (
        <div className="catalog-empty">
          <Search size={30} />
          <h3>No encontramos capacitaciones con esos filtros</h3>
          <p>Prueba otra búsqueda o vuelve a mostrar todas tus capacitaciones.</p>
          <button onClick={() => { setQuery(''); setFilter('all') }}>Ver todas</button>
        </div>
      )}
    </section>
  </main>
}

function ResumeLearningCard({ item }) {
  return <section className="catalog-resume-card">
    <div className="catalog-resume-icon">{item.journey === 'exam' ? <GraduationCap size={26} /> : <PlayCircle size={26} />}</div>
    <div className="catalog-resume-copy">
      <span>{item.journey === 'exam' ? 'Ya puedes cerrar esta ruta' : 'Continúa donde quedaste'}</span>
      <h2>{item.course.title}</h2>
      <div className="catalog-resume-progress"><div><span style={{ width: item.progress + '%' }} /></div><strong>{item.progress}%</strong></div>
    </div>
    <div className="catalog-resume-meta">
      <span><Clock3 size={14} /> {dueLabel(item.due_at)}</span>
      <button onClick={() => openLearnerCourse(item.course.id)}>{item.journey === 'exam' ? 'Ir al examen' : 'Continuar'} <ArrowRight size={17} /></button>
    </div>
  </section>
}

function CourseCard({ item, index }) {
  const StatusIcon = item.journey === 'certified'
    ? Trophy
    : item.journey === 'exam'
      ? GraduationCap
      : item.journey === 'progress'
        ? PlayCircle
        : BookOpen

  const action = item.journey === 'certified' ? 'Repasar' : item.journey === 'exam' ? 'Presentar examen' : item.journey === 'progress' ? 'Continuar' : 'Comenzar'

  const openCertificate = (event) => {
    event.stopPropagation()
    const code = item.certificate?.certificate_code
    if (!code) return
    window.open('/#/certificate/' + encodeURIComponent(code), '_blank', 'noopener,noreferrer')
  }

  return <article
    className={'catalog-course-card journey-' + item.journey + (item.overdue ? ' overdue' : '')}
    style={{ '--delay': Math.min(index, 12) * 45 + 'ms' }}
    onClick={() => openLearnerCourse(item.course.id)}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openLearnerCourse(item.course.id) }}
    role="button"
    tabIndex={0}
  >
    <div className="catalog-card-visual" aria-hidden="true">
      <span className="catalog-card-icon"><StatusIcon size={24} /></span>
      <i /><i /><i />
      <strong>{item.progress}%</strong>
    </div>

    <div className="catalog-card-body">
      <div className="catalog-card-status-row">
        <span className={'catalog-status-badge ' + item.journey}><StatusIcon size={13} /> {statusLabel(item.journey)}</span>
        {item.overdue && <span className="catalog-overdue-badge">Fecha vencida</span>}
      </div>

      <h3>{item.course.title}</h3>
      <p>{item.course.description || 'Capacitación Aula EI.'}</p>

      <div className="catalog-card-progress">
        <div><span style={{ width: item.progress + '%' }} /></div>
        <small>{item.completedCount} de {item.requiredCount || 0} contenidos obligatorios</small>
      </div>

      <div className="catalog-card-facts">
        <span><CalendarClock size={14} /> {dueLabel(item.due_at)}</span>
        <span><FileCheck2 size={14} /> Aprobación {item.course.passing_score || 80}%</span>
      </div>
    </div>

    <footer className="catalog-card-footer">
      {item.certificate?.certificate_code && <button className="catalog-certificate-button" onClick={openCertificate}><BadgeCheck size={16} /> Certificado</button>}
      <button className="catalog-open-button" onClick={(event) => { event.stopPropagation(); openLearnerCourse(item.course.id) }}>{action} <ArrowRight size={16} /></button>
    </footer>
  </article>
}

function CatalogSkeleton() {
  return <div className="catalog-course-grid catalog-skeleton-grid">
    {Array.from({ length: 6 }).map((_, index) => <article className="catalog-course-skeleton" key={index}>
      <div className="skeleton-block skeleton-visual" />
      <div className="skeleton-body">
        <i /><strong /><p /><p /><span />
      </div>
    </article>)}
  </div>
}

function statusLabel(status) {
  return {
    new: 'Sin iniciar',
    progress: 'En progreso',
    exam: 'Lista para examen',
    certified: 'Certificada',
  }[status] || 'Asignada'
}

function dueLabel(value) {
  if (!value) return 'Sin fecha límite'
  try {
    const date = new Date(value)
    const prefix = date.getTime() < Date.now() ? 'Venció ' : 'Hasta '
    return prefix + new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
  } catch {
    return 'Fecha definida'
  }
}
