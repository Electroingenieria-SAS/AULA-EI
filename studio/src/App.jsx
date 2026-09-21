import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, ClipboardList, Gamepad2, GraduationCap, Home, Loader2,
  LogOut, RefreshCw, Route, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import AssignmentsCenter from './AssignmentsCenter.jsx'
import CoursesManager from './CoursesManager.jsx'
import UsersManager from './UsersManager.jsx'
import CertificatesManager from './CertificatesManager.jsx'
import Formation360 from './Formation360.jsx'
import { ADMIN_ROLES, ROLE_LABELS, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

export default function App({ embedded = false, initialProfile = null }) {
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState(initialProfile)
  const [tab, setTab] = useState('courses')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState([])
  const [profiles, setProfiles] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const canAdmin = ADMIN_ROLES.has(profile?.role)

  const loadCore = useCallback(async (currentProfile = profile) => {
    if (!currentProfile) return
    setLoading(true)
    try {
      const courseRequest = supabase.from('courses').select('*').order('updated_at', { ascending: false })
      if (ADMIN_ROLES.has(currentProfile.role)) {
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
      }
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el panel.'))
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (embedded && initialProfile) {
          if (!STAFF_ROLES.has(initialProfile.role)) {
            throw new Error('Tu rol no tiene acceso a Gestión Aula EI.')
          }
          if (!active) return
          setProfile(initialProfile)
          await loadCore(initialProfile)
          return
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const session = data.session
        if (!session?.user) {
          goTo('/#/login')
          return
        }
        if (session.user.app_metadata?.aula_ei_must_change_password === true || session.user.user_metadata?.must_change_password === true) {
          goTo('/#/')
          return
        }

        const { data: result, error: profileError } = await supabase.functions.invoke('get-my-profile', { body: {} })
        if (profileError) throw new Error(result?.error || profileError.message)
        if (!result?.ok || !result.profile) throw new Error(result?.error || 'Esta cuenta no está habilitada para Aula EI.')
        if (!STAFF_ROLES.has(result.profile.role)) {
          goTo('/#/')
          return
        }
        if (!active) return
        setProfile(result.profile)
        await loadCore(result.profile)
      } catch (error) {
        if (active) setMessage(getError(error, 'No fue posible validar tu acceso a Gestión Aula EI.'))
      } finally {
        if (active) setBooting(false)
      }
    })()

    return () => { active = false }
  }, [embedded, initialProfile?.id])

  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(''), 7000)
    return () => clearTimeout(timeout)
  }, [message])

  const signOut = async () => {
    await supabase.auth.signOut()
    goTo('/#/login')
  }

  if (booting) {
    return embedded
      ? <StudioInlineLoading />
      : <Startup text="Validando acceso administrativo…" />
  }

  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return embedded
      ? <StudioInlineError text={message || 'Acceso no disponible para este rol.'} />
      : <Startup error={message || 'No fue posible cargar tu perfil.'} text="Acceso no disponible" />
  }

  const tabs = [
    ['courses', 'Capacitaciones', BookOpen],
    ...(canAdmin ? [
      ['assignments', 'Asignaciones', ClipboardList],
      ['formation360', 'Formación 360', Route],
      ['users', 'Usuarios y roles', Users],
      ['certificates', 'Ranking y certificados', GraduationCap],
    ] : []),
  ]

  const content = <div className="page admin-page studio-single-page">
    <section className="admin-hero integrated-admin-hero">
      <div>
        <span className="eyebrow-light">Gestión de formación</span>
        <h1>Gestión Aula EI</h1>
        <p>Administra capacitaciones, asignaciones, usuarios y certificados desde la misma experiencia de Aula EI.</p>
      </div>
      <div className="admin-role">
        <strong>{courses.length}</strong>
        <span>Capacitaciones registradas</span>
      </div>
    </section>

    <div className="studio-control-row">
      <nav className="tab-bar integrated-tab-bar">
        {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>
          <Icon size={17} /> {label}
        </button>)}
      </nav>
      <button className="secondary-button compact studio-refresh" title="Actualizar información" onClick={() => loadCore()} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>

    {message && <div className="message-banner"><Sparkles size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={16} /></button></div>}

    {loading && <div className="studio-sync-feedback" role="status"><span /><strong>Actualizando información…</strong></div>}

    <div className="studio-tab-stage" key={tab} aria-busy={loading ? 'true' : 'false'}>
      {tab === 'courses' && <CoursesManager courses={courses} refresh={() => loadCore()} setMessage={setMessage} />}
      {tab === 'assignments' && canAdmin && <AssignmentsCenter courses={courses} profiles={profiles} enrollments={enrollments} refresh={() => loadCore()} setMessage={setMessage} />}
      {tab === 'formation360' && canAdmin && <Formation360 profiles={profiles} courses={courses} enrollments={enrollments} refresh={() => loadCore()} setMessage={setMessage} />}
      {tab === 'users' && canAdmin && <UsersManager profile={profile} profiles={profiles} enrollments={enrollments} refresh={() => loadCore()} setMessage={setMessage} />}
      {tab === 'certificates' && canAdmin && <CertificatesManager setMessage={setMessage} />}
    </div>
  </div>

  if (embedded) return <section className="embedded-studio integrated-studio studio-single-content">{content}</section>

  return <div className="app-shell integrated-studio">
    <aside className="sidebar">
      <button className="brand app-brand-logo integrated-brand" onClick={() => goTo('/#/')}>
        <img src="/brand/logo-aula-ei.png" alt="Aula EI" />
        <span>Academia interna</span>
      </button>

      <div className="user-card">
        <div className="avatar">{(profile.full_name || profile.email || 'EI').slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{profile.full_name || 'Colaborador EI'}</strong>
          <span>{ROLE_LABELS[profile.role] || profile.role}</span>
        </div>
      </div>

      <nav>
        <button onClick={() => goTo('/#/')}><Home size={18} /> Inicio</button>
        <button onClick={() => goTo('/#/catalog')}><BookOpen size={18} /> Mis capacitaciones</button>
        <button onClick={() => goTo('/#/games')}><Gamepad2 size={18} /> Juegos EI</button>
        <button className="active"><ShieldCheck size={18} /> Gestión Aula EI</button>
      </nav>

      <button className="signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
      <div className="security-note"><ShieldCheck size={20} /><span>Contenido protegido con Supabase Auth y RLS.</span></div>
    </aside>

    <main className="main-area">{content}</main>

    <nav className="mobile-nav integrated-mobile-nav">
      <button onClick={() => goTo('/#/')}><Home size={18} /><span>Inicio</span></button>
      <button onClick={() => goTo('/#/catalog')}><BookOpen size={18} /><span>Cursos</span></button>
      <button onClick={() => goTo('/#/games')}><Gamepad2 size={18} /><span>Juegos</span></button>
      <button className="active"><ShieldCheck size={18} /><span>Gestión</span></button>
    </nav>
  </div>
}

function StudioInlineLoading() {
  return <section className="studio-inline-state studio-inline-loading" aria-busy="true">
    <div className="experience-loading-mark" aria-hidden="true"><i /><i /><i /></div>
    <strong>Preparando Gestión Aula EI…</strong>
    <span>Cargando herramientas y datos de gestión.</span>
    <div className="studio-loading-skeleton" aria-hidden="true"><i className="wide" /><i /><i /><i /></div>
  </section>
}

function StudioInlineError({ text }) {
  return <section className="studio-inline-state error">
    <ShieldCheck size={28} />
    <strong>Gestión Aula EI no está disponible</strong>
    <span>{text}</span>
  </section>
}

function goTo(url) {
  window.location.assign(url)
}

function Startup({ text, error }) {
  return <main className="startup-page"><section className="startup-card"><img src="/brand/logo-aula-ei.png" alt="Aula EI" />{!error && <Loader2 className="spin" size={28} />}<h1>{text}</h1>{error && <p className="danger-text">{error}</p>}{error && <button className="primary-button" onClick={() => goTo('/#/')}>Volver a Aula EI</button>}</section></main>
}
