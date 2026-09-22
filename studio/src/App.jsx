import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, Briefcase, ClipboardList, GraduationCap, RefreshCw,
  ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import AssignmentsCenter from './AssignmentsCenter.jsx'
import CoursesManager from './CoursesManager.jsx'
import UsersManager from './UsersManager.jsx'
import CertificatesManager from './CertificatesManager.jsx'
import ComplianceCenter from './ComplianceCenter.jsx'
import { ADMIN_ROLES, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

export default function App({ initialProfile = null }) {
  const profile = initialProfile
  const [initialized, setInitialized] = useState(false)
  const [tab, setTab] = useState('courses')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState([])
  const [profiles, setProfiles] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const canAdmin = ADMIN_ROLES.has(profile?.role)

  const loadCore = useCallback(async () => {
    if (!profile || !STAFF_ROLES.has(profile.role)) return

    setLoading(true)
    try {
      const courseRequest = supabase.from('courses').select('*').order('updated_at', { ascending: false })

      if (ADMIN_ROLES.has(profile.role)) {
        const [courseResult, profileRows, enrollmentRows] = await Promise.all([
          courseRequest,
          fetchAllPages((from, to) => supabase.from('profiles')
            .select('id,email,full_name,avatar_url,role,is_active,created_at,updated_at')
            .order('full_name')
            .range(from, to)),
          fetchAllPages((from, to) => supabase.from('enrollments')
            .select('id,course_id,user_id,due_at,status,created_at,updated_at,user:profiles!enrollments_user_id_fkey(id,full_name,email,role,is_active),course:courses(id,title,status)')
            .order('created_at', { ascending: false })
            .range(from, to)),
        ])
        if (courseResult.error) throw courseResult.error
        setCourses(courseResult.data ?? [])
        setProfiles(profileRows)
        setEnrollments(enrollmentRows)
      } else {
        const result = await courseRequest
        if (result.error) throw result.error
        setCourses(result.data ?? [])
        setProfiles([])
        setEnrollments([])
      }
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el panel.'))
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    loadCore()
  }, [loadCore])

  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(''), 7000)
    return () => clearTimeout(timeout)
  }, [message])

  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return <section className="studio-inline-state error">
      <ShieldCheck size={28} />
      <strong>Gestión Aula EI no está disponible</strong>
      <span>Tu rol actual no tiene acceso a las herramientas de gestión.</span>
    </section>
  }

  if (!initialized && loading) {
    return <section className="studio-inline-state studio-inline-loading" aria-busy="true">
      <div className="experience-loading-mark" aria-hidden="true"><i /><i /><i /></div>
      <strong>Preparando Gestión Aula EI…</strong>
      <span>Cargando herramientas y datos de gestión.</span>
      <div className="studio-loading-skeleton" aria-hidden="true"><i className="wide" /><i /><i /><i /></div>
    </section>
  }

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
      <section className="admin-hero integrated-admin-hero">
        <div>
          <span className="eyebrow-light">Gestión de formación</span>
          <h1>Gestión Aula EI</h1>
          <p>Administra capacitaciones, asignaciones, usuarios, cumplimiento, competencias y certificados desde la misma experiencia de Aula EI.</p>
        </div>
        <div className="admin-role">
          <strong>{courses.length}</strong>
          <span>Capacitaciones registradas</span>
        </div>
      </section>

      <div className="studio-control-row">
        <nav className="tab-bar integrated-tab-bar">
          {tabs.map(([id, label, Icon]) => <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={17} /> {label}
          </button>)}
        </nav>

        <button
          className="secondary-button compact studio-refresh"
          title="Actualizar información"
          onClick={loadCore}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {message && <div className="message-banner">
        <Sparkles size={17} />
        <span>{message}</span>
        <button onClick={() => setMessage('')}><X size={16} /></button>
      </div>}

      {loading && <div className="studio-sync-feedback" role="status">
        <span />
        <strong>Actualizando información…</strong>
      </div>}

      <div className="studio-tab-stage" key={tab} aria-busy={loading ? 'true' : 'false'}>
        {tab === 'courses' && <CoursesManager courses={courses} refresh={loadCore} setMessage={setMessage} />}
        {tab === 'assignments' && canAdmin && <AssignmentsCenter courses={courses} profiles={profiles} enrollments={enrollments} refresh={loadCore} setMessage={setMessage} />}
        {tab === 'users' && canAdmin && <UsersManager profile={profile} profiles={profiles} enrollments={enrollments} refresh={loadCore} setMessage={setMessage} />}
        {tab === 'compliance' && canAdmin && <ComplianceCenter courses={courses} profiles={profiles} setMessage={setMessage} />}
        {tab === 'certificates' && canAdmin && <CertificatesManager setMessage={setMessage} />}
      </div>
    </div>
  </section>
}
