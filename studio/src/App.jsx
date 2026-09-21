import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, ClipboardList, Gamepad2, GraduationCap, Home, Loader2,
  LogOut, RefreshCw, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import AssignmentsCenter from './AssignmentsCenter.jsx'
import CoursesManager from './CoursesManager.jsx'
import UsersManager from './UsersManager.jsx'
import CertificatesManager from './CertificatesManager.jsx'
import { ADMIN_ROLES, ROLE_LABELS, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

export default function App() {
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState(null)
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
  }, [])

  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(''), 7000)
    return () => clearTimeout(timeout)
  }, [message])

  const signOut = async () => {
    await supabase.auth.signOut()
    goTo('/#/login')
  }

  if (booting) return <Startup text="Validando acceso administrativo…" />
  if (!profile) return <Startup error={message || 'No fue posible cargar tu perfil.'} text="Acceso no disponible" />

  const tabs = [
    ['courses', 'Capacitaciones', BookOpen],
    ...(canAdmin ? [
      ['assignments', 'Asignaciones', ClipboardList],
      ['users', 'Usuarios y roles', Users],
      ['certificates', 'Ranking y certificados', GraduationCap],
    ] : []),
  ]

  return <div className="app-shell integrated-studio">
    <aside className="sidebar">
      <button className="brand app-brand-logo integrated-brand" onClick={() => goTo('/#/', true)}>
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
        <button onClick={() => goTo('/#/', true)}><Home size={18} /> Inicio</button>
        <button onClick={() => goTo('/#/catalog', true)}><BookOpen size={18} /> Mis capacitaciones</button>
        <button onClick={() => goTo('/#/games', true)}><Gamepad2 size={18} /> Juegos EI</button>
        <button className="active"><ShieldCheck size={18} /> Gestión Aula EI</button>
      </nav>

      <button className="signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
      <div className="security-note"><ShieldCheck size={20} /><span>Contenido protegido con Supabase Auth y RLS.</span></div>
    </aside>

    <main className="main-area">
      <div className="page admin-page">
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
            {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={17} /> {label}
            </button>)}
          </nav>
          <button className="secondary-button compact studio-refresh" title="Actualizar información" onClick={() => loadCore()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>

        {message && <div className="message-banner"><Sparkles size={17} /><span>{message}</span><button onClick={() => setMessage('')}><X size={16} /></button></div>}

        {tab === 'courses' && <CoursesManager courses={courses} refresh={() => loadCore()} setMessage={setMessage} />}
        {tab === 'assignments' && canAdmin && <AssignmentsCenter courses={courses} profiles={profiles} enrollments={enrollments} refresh={() => loadCore()} setMessage={setMessage} />}
        {tab === 'users' && canAdmin && <UsersManager profile={profile} profiles={profiles} refresh={() => loadCore()} setMessage={setMessage} />}
        {tab === 'certificates' && canAdmin && <CertificatesManager setMessage={setMessage} />}
      </div>
    </main>

    <nav className="mobile-nav integrated-mobile-nav">
      <button onClick={() => goTo('/#/', true)}><Home size={18} /><span>Inicio</span></button>
      <button onClick={() => goTo('/#/catalog', true)}><BookOpen size={18} /><span>Cursos</span></button>
      <button onClick={() => goTo('/#/games', true)}><Gamepad2 size={18} /><span>Juegos</span></button>
      <button className="active"><ShieldCheck size={18} /><span>Gestión</span></button>
    </nav>
  </div>
}

function goTo(url, reload = false) {
  if (reload) {
    window.location.href = url
    window.location.reload()
    return
  }
  window.location.replace(url)
}

function Startup({ text, error }) {
  return <main className="startup-page"><section className="startup-card"><img src="/brand/logo-aula-ei.png" alt="Aula EI" />{!error && <Loader2 className="spin" size={28} />}<h1>{text}</h1>{error && <p className="danger-text">{error}</p>}{error && <button className="primary-button" onClick={() => goTo('/#/', true)}>Volver a Aula EI</button>}</section></main>
}
