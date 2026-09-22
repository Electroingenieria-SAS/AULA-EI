import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  BookOpen, Briefcase, ClipboardList, GraduationCap, RefreshCw,
  ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import { ADMIN_ROLES, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

const AssignmentsCenter = lazy(() => import('./AssignmentsCenter.jsx'))
const CoursesManager = lazy(() => import('./CoursesManager.jsx'))
const UsersManager = lazy(() => import('./UsersManager.jsx'))
const CertificatesManager = lazy(() => import('./CertificatesManager.jsx'))
const ComplianceCenter = lazy(() => import('./ComplianceCenter.jsx'))

export default function App({ initialProfile = null }) {
  const profile = initialProfile
  const [tab, setTab] = useState('courses')
  const [message, setMessage] = useState('')
  const [courses, setCourses] = useState([])
  const [profiles, setProfiles] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loaded, setLoaded] = useState({ courses: false, profiles: false, enrollments: false })
  const [loading, setLoading] = useState({ courses: false, profiles: false, enrollments: false })
  const canAdmin = ADMIN_ROLES.has(profile?.role)

  const loadCourses = useCallback(async () => {
    if (!profile || !STAFF_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, courses: true }))
    try {
      const result = await supabase
        .from('courses')
        .select('*')
        .order('updated_at', { ascending: false })
      if (result.error) throw result.error
      setCourses(result.data ?? [])
      setLoaded((state) => ({ ...state, courses: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar las capacitaciones.'))
    } finally {
      setLoading((state) => ({ ...state, courses: false }))
    }
  }, [profile?.id, profile?.role])

  const loadProfiles = useCallback(async () => {
    if (!profile || !ADMIN_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, profiles: true }))
    try {
      const rows = await fetchAllPages((from, to) => supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,role,is_active,created_at,updated_at,job_position_id,supervisor_id')
        .order('full_name')
        .range(from, to))
      setProfiles(rows)
      setLoaded((state) => ({ ...state, profiles: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar los usuarios.'))
    } finally {
      setLoading((state) => ({ ...state, profiles: false }))
    }
  }, [profile?.id, profile?.role])

  const loadEnrollments = useCallback(async () => {
    if (!profile || !ADMIN_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, enrollments: true }))
    try {
      const rows = await fetchAllPages((from, to) => supabase
        .from('enrollments')
        .select('id,course_id,user_id,due_at,status,created_at,updated_at,user:profiles!enrollments_user_id_fkey(id,full_name,email,role,is_active),course:courses(id,title,status)')
        .order('created_at', { ascending: false })
        .range(from, to))
      setEnrollments(rows)
      setLoaded((state) => ({ ...state, enrollments: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar las asignaciones.'))
    } finally {
      setLoading((state) => ({ ...state, enrollments: false }))
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (!canAdmin) return
    if (['assignments', 'users', 'compliance'].includes(tab) && !loaded.profiles && !loading.profiles) {
      loadProfiles()
    }
    if (['assignments', 'users'].includes(tab) && !loaded.enrollments && !loading.enrollments) {
      loadEnrollments()
    }
  }, [tab, canAdmin, loaded.profiles, loaded.enrollments, loading.profiles, loading.enrollments, loadProfiles, loadEnrollments])

  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(''), 7000)
    return () => clearTimeout(timeout)
  }, [message])

  const refreshCurrent = useCallback(async () => {
    const tasks = [loadCourses()]
    if (canAdmin && ['assignments', 'users', 'compliance'].includes(tab)) tasks.push(loadProfiles())
    if (canAdmin && ['assignments', 'users'].includes(tab)) tasks.push(loadEnrollments())
    await Promise.all(tasks)
  }, [tab, canAdmin, loadCourses, loadProfiles, loadEnrollments])

  const tabReady = useMemo(() => {
    if (tab === 'courses') return loaded.courses
    if (tab === 'assignments' || tab === 'users') return loaded.courses && loaded.profiles && loaded.enrollments
    if (tab === 'compliance') return loaded.courses && loaded.profiles
    return true
  }, [tab, loaded])

  const busy = loading.courses || loading.profiles || loading.enrollments

  const changeTab = useCallback((nextTab) => {
    if (nextTab === tab) return
    const commit = () => flushSync(() => setTab(nextTab))
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (!reduceMotion && typeof document.startViewTransition === 'function') {
      document.startViewTransition(commit)
      return
    }

    setTab(nextTab)
  }, [tab])

  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return <section className="studio-inline-state error">
      <ShieldCheck size={28} />
      <strong>Gestión Aula EI no está disponible</strong>
      <span>Tu rol actual no tiene acceso a las herramientas de gestión.</span>
    </section>
  }

  if (!loaded.courses && loading.courses) return <StudioLoading text="Cargando capacitaciones…" />

  const tabs = [
    ['courses', 'Capacitaciones', BookOpen],
    ...(canAdmin ? [
      ['assignments', 'Asignaciones', ClipboardList],
      ['users', 'Usuarios y roles', Users],
      ['compliance', 'Formación y cumplimiento', Briefcase],
      ['certificates', 'Ranking y certificados', GraduationCap],
    ] : []),
  ]

  return <section className="embedded-studio integrated-studio studio-single-content">
    <div className="page admin-page studio-single-page">
      <section className="studio-hero">
        <div className="studio-hero-copy">
          <span className="studio-hero-eyebrow">Gestión de formación</span>
          <h1>Gestión Aula EI</h1>
          <p>Administra contenidos, usuarios, cumplimiento y certificados desde una sola experiencia, con carga inteligente y trazabilidad completa.</p>
        </div>

        <div className="studio-hero-metric" aria-label={courses.length + ' capacitaciones registradas'}>
          <span className="studio-hero-metric-icon"><BookOpen size={22} /></span>
          <strong>{courses.length}</strong>
          <small>Capacitaciones registradas</small>
        </div>
      </section>

      <section className="studio-navigation-shell">
        <nav className="studio-navigation-list" aria-label="Herramientas de Gestión Aula EI">
          {tabs.map(([id, label, Icon]) => <button
            key={id}
            className={'studio-navigation-button' + (tab === id ? ' is-active' : '')}
            aria-pressed={tab === id}
            onClick={() => changeTab(id)}
          >
            <span className="studio-navigation-icon"><Icon size={17} /></span>
            <span>{label}</span>
          </button>)}
        </nav>

        <button
          className="studio-refresh-button"
          title="Actualizar la información de esta sección"
          onClick={refreshCurrent}
          disabled={busy}
        >
          <RefreshCw size={16} className={busy ? 'spin' : ''} />
          <span>{busy ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </section>

      {message && <div className="message-banner">
        <Sparkles size={17} />
        <span>{message}</span>
        <button onClick={() => setMessage('')}><X size={16} /></button>
      </div>}

      {busy && <div className="studio-sync-feedback" role="status">
        <span />
        <strong>Sincronizando solo los datos necesarios…</strong>
      </div>}

      <div className="studio-tab-stage" key={tab} aria-busy={!tabReady || busy ? 'true' : 'false'}>
        {!tabReady ? <StudioLoading inline text="Preparando esta sección…" /> : (
          <Suspense fallback={<StudioLoading inline text="Cargando herramienta…" />}>
            {tab === 'courses' && <CoursesManager courses={courses} refresh={refreshCurrent} setMessage={setMessage} />}
            {tab === 'assignments' && canAdmin && <AssignmentsCenter courses={courses} profiles={profiles} enrollments={enrollments} refresh={refreshCurrent} setMessage={setMessage} />}
            {tab === 'users' && canAdmin && <UsersManager profile={profile} profiles={profiles} enrollments={enrollments} refresh={refreshCurrent} setMessage={setMessage} />}
            {tab === 'compliance' && canAdmin && <ComplianceCenter courses={courses} profiles={profiles} setMessage={setMessage} />}
            {tab === 'certificates' && canAdmin && <CertificatesManager setMessage={setMessage} />}
          </Suspense>
        )}
      </div>
    </div>
  </section>
}

function StudioLoading({ text, inline = false }) {
  return <section className={'studio-inline-state studio-inline-loading' + (inline ? ' is-inline' : '')} aria-busy="true">
    <div className="experience-loading-mark" aria-hidden="true"><i /><i /><i /></div>
    <strong>{text}</strong>
    <span>Estamos cargando únicamente los recursos de esta pantalla.</span>
    <div className="studio-loading-skeleton" aria-hidden="true"><i className="wide" /><i /><i /><i /></div>
  </section>
}
