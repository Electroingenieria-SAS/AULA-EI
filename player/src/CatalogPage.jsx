import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, CircleAlert,
  Clock3, FileCheck2, Filter, GraduationCap, PlayCircle,
  Search, SlidersHorizontal, Sparkles, Trophy, X, Zap,
} from 'lucide-react'
import { navigateLearner, openLearnerCourse, appUrl } from './navigation.js'
import { signedAsset, supabase } from './supabase.js'

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

export default function CatalogPage({ profile = null, sessionUser = null }) {
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
      if (!sessionUser?.id) return

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
        const progress = required.length ? Math.round((requiredDone / required.length) * 100) : 100
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

  useEffect(() => { if (sessionUser?.id) load() }, [sessionUser?.id])

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

  const displayName = useMemo(() => {
    const raw = profile?.full_name || sessionUser?.user_metadata?.full_name || ''
    return String(raw).trim()
  }, [profile?.full_name, sessionUser?.user_metadata?.full_name])

  const firstName = useMemo(() => displayName.split(/\s+/).filter(Boolean)[0] || 'Colaborador', [displayName])

  return <main className="learner-course-app learner-catalog-app catalog-original-page">
    <section className="catalog-original-hero">
      <div className="catalog-original-hero-motion" aria-hidden="true">
        <span className="original-hero-orb orb-large" />
        <span className="original-hero-orb orb-small" />
        <span className="original-hero-spark spark-one" />
        <span className="original-hero-spark spark-two" />
        <span className="original-hero-dot dot-one" />
        <span className="original-hero-dot dot-two" />
        <span className="original-hero-dot dot-three" />
      </div>

      <div className="catalog-original-copy">
        <span className="catalog-original-pill"><Sparkles size={15} /> Plataforma conectada</span>
        <h1>Aprende, participa y certifícate.</h1>
        <p>{firstName}, completa tus contenidos, recursos y actividades dentro de una misma ruta antes de presentar el examen final.</p>

        <div className="catalog-original-actions">
          {resumeCourse
            ? <button className="catalog-original-yellow" onClick={() => openLearnerCourse(resumeCourse.course.id)}><PlayCircle size={18} /> Continuar capacitación</button>
            : <button className="catalog-original-yellow" onClick={() => document.querySelector('.catalog-workspace')?.scrollIntoView({ behavior: 'smooth' })}><BookOpen size={18} /> Ver mis capacitaciones</button>}
          <button className="catalog-original-glass" onClick={() => navigateLearner('/games')}><Zap size={18} /> Juegos EI</button>
        </div>
      </div>

      <div className="catalog-original-hero-metric">
        <strong>{counts.certified}</strong>
        <span>Certificados obtenidos</span>
      </div>
    </section>

    <section className="catalog-original-metrics" aria-label="Resumen de capacitaciones">
      <article><BookOpen size={24} /><div><span>Asignadas visibles</span><strong>{counts.all}</strong></div></article>
      <article><PlayCircle size={24} /><div><span>En progreso</span><strong>{counts.progress}</strong></div></article>
      <article><GraduationCap size={24} /><div><span>Listas para examen</span><strong>{counts.exam}</strong></div></article>
      <article><Trophy size={24} /><div><span>Certificadas</span><strong>{counts.certified}</strong></div></article>
    </section>

    {message && <div className="catalog-message error"><CircleAlert size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></div>}
    {hiddenCount > 0 && <div className="catalog-message"><CircleAlert size={17} /><span>{hiddenCount} asignación(es) todavía no son visibles porque la capacitación no está publicada o no tiene permisos activos.</span></div>}

    {!loading && resumeCourse && <ResumeLearningCard item={resumeCourse} />}

    <section className="catalog-workspace">
      <header className="catalog-workspace-header catalog-original-heading">
        <div>
          <span>CONTINUAR APRENDIZAJE</span>
          <h2>Mis capacitaciones</h2>
          <p>Busca, filtra y continúa tu ruta con el mismo lenguaje visual de Aula EI.</p>
        </div>

        <div className="catalog-result-count">
          <strong>{filteredCourses.length}</strong>
          <span>{filteredCourses.length === 1 ? 'capacitación' : 'capacitaciones'}</span>
        </div>
      </header>

      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar capacitación…" />
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
    <div className="catalog-resume-cover">
      <CourseCover course={item.course} compact />
      <span className="catalog-resume-play">{item.journey === 'exam' ? <GraduationCap size={20} /> : <PlayCircle size={20} />}</span>
    </div>
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
    window.open(appUrl('/certificate/' + encodeURIComponent(code)), '_blank', 'noopener,noreferrer')
  }

  return <article
    className={'catalog-course-card journey-' + item.journey + (item.overdue ? ' overdue' : '')}
    style={{ '--delay': Math.min(index, 12) * 45 + 'ms' }}
    onClick={() => openLearnerCourse(item.course.id)}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openLearnerCourse(item.course.id) }}
    role="button"
    tabIndex={0}
  >
    <div className="catalog-card-visual">
      <CourseCover course={item.course} />
      <div className="catalog-card-image-overlay" />
      <span className="catalog-card-icon"><StatusIcon size={22} /></span>
      <span className="catalog-card-progress-pill">{item.progress}%</span>
      <span className="catalog-card-hover-action"><PlayCircle size={19} /> {action}</span>
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

function CourseCover({ course, compact = false }) {
  const [url, setUrl] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    setUrl(null)
    setLoaded(false)

    if (!course?.cover_path) return () => { alive = false }

    signedAsset(course.cover_path)
      .then((signedUrl) => { if (alive) setUrl(signedUrl) })
      .catch(() => { if (alive) setUrl(null) })

    return () => { alive = false }
  }, [course?.cover_path])

  return <div className={'course-cover-frame ' + (compact ? 'compact' : '') + (loaded ? ' loaded' : '')}>
    {!loaded && <div className="course-cover-placeholder"><BookOpen size={compact ? 22 : 34} /></div>}
    {url && <img src={url} alt={course?.title || 'Portada de capacitación'} loading="lazy" onLoad={() => setLoaded(true)} />}
    <div className="course-cover-shine" />
  </div>
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
