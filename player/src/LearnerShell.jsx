import React, { useMemo } from 'react'
import { ArrowLeft, BookOpen, Code2, FileText, Gamepad2, Home, LogOut, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { assetUrl, navigateLearner } from './navigation.js'
import NotificationCenter from './NotificationCenter.jsx'
import { mobileHaptic } from '../../src/MobileViewportSync.jsx'
import { supabase } from './supabase.js'

export default function LearnerShell({ children, activeRoute = 'catalog', profile = null }) {
  const displayName = profile?.full_name || 'Colaborador EI'
  const role = roleLabel(profile?.role)
  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean)
    return (parts.slice(0, 2).map((part) => part[0]).join('') || 'EI').toUpperCase()
  }, [displayName])
  const canManage = ['creador_contenido', 'revisor', 'admin', 'super_admin'].includes(String(profile?.role || ''))
  const isCourse = activeRoute === 'course'
  const mobileTitle = activeRoute === 'home' ? 'Inicio' : activeRoute === 'catalog' ? 'Mis capacitaciones' : activeRoute === 'development' ? 'Mi desarrollo' : activeRoute === 'course' ? 'Capacitación' : activeRoute === 'games' ? 'Juegos EI' : activeRoute === 'privacy' ? 'Privacidad y legal' : activeRoute === 'credits' ? 'Créditos' : activeRoute === 'studio' ? 'Gestión Aula EI' : 'Aula EI'

  const signOut = async () => {
    await supabase.auth.signOut()
    navigateLearner('/login', { replace: true })
  }

  return <div
    className={isCourse ? 'learner-app-shell learner-course-shell' : 'learner-app-shell'}
    style={{ '--aula-photo-image': `url("${assetUrl('brand/fondo.jpg')}")` }}
  >
    <aside className="learner-global-sidebar">
      <button className="learner-sidebar-brand learner-sidebar-brand-original" onClick={() => navigateLearner('/')}>
        <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI · Academia Interna" />
        <small>ACADEMIA INTERNA</small>
      </button>

      <div className="learner-sidebar-user">
        <div className="learner-sidebar-avatar">{initials}</div>
        <div><strong>{displayName}</strong><span>{role}</span></div>
      </div>


      <nav className="learner-sidebar-nav" aria-label="Navegación principal">
        <SidebarLink icon={Home} label="Inicio" active={activeRoute === 'home'} onClick={() => navigateLearner('/')} />
        <SidebarLink icon={BookOpen} label="Mis capacitaciones" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
        <SidebarLink icon={TrendingUp} label="Mi desarrollo" active={activeRoute === 'development'} onClick={() => navigateLearner('/development')} />
        <SidebarLink icon={Gamepad2} label="Juegos EI" active={activeRoute === 'games'} onClick={() => navigateLearner('/games')} />
        <SidebarLink icon={FileText} label="Privacidad y Legal" active={activeRoute === 'privacy'} onClick={() => navigateLearner('/privacy')} />
        {canManage && <SidebarLink icon={ShieldCheck} label="Gestión Aula EI" active={activeRoute === 'studio'} onClick={() => navigateLearner('/studio')} />}
      </nav>

      <div className="learner-sidebar-bottom">
        <button type="button" className="learner-sidebar-signout" onClick={() => navigateLearner('/credits')}>
          <Code2 size={18} /> Créditos de desarrollo
        </button>
        <button className="learner-sidebar-signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
        <div className="learner-sidebar-security"><Sparkles size={16} /><span>Contenido protegido con Supabase Auth y RLS.</span></div>
      </div>
    </aside>

    <header className="learner-mobile-appbar" aria-label={isCourse ? 'Cabecera de capacitación' : 'Cabecera de Aula EI'}>
      {isCourse ? <>
        <button className="learner-course-back" type="button" onClick={() => navigateLearner('/catalog')} aria-label="Volver a mis capacitaciones">
          <ArrowLeft size={19} aria-hidden="true" />
          <span>Mis capacitaciones</span>
        </button>
        <div className="learner-course-heading"><small>Aula EI</small><strong>Capacitación</strong></div>
      </> : <button className="learner-mobile-brand" type="button" onClick={() => navigateLearner('/')} aria-label="Ir al inicio de Aula EI">
        <img src={assetUrl('brand/logo-aula-ei.png')} alt="" />
        <span><small>Aula EI</small><strong>{mobileTitle}</strong></span>
      </button>}
      <NotificationCenter profile={profile} />
    </header>

    <div className="learner-shell-main">{children}</div>

    <nav
      className="learner-mobile-global-nav"
      aria-label="Navegación móvil"
      style={{ '--mobile-nav-items': canManage ? 5 : 4 }}
    >
      <MobileLink icon={Home} label="Inicio" active={activeRoute === 'home' || activeRoute === 'development'} onClick={() => navigateLearner('/')} />
      <MobileLink icon={BookOpen} label="Cursos" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
      <MobileLink icon={Gamepad2} label="Juegos" active={activeRoute === 'games'} onClick={() => navigateLearner('/games')} />
      <MobileLink icon={FileText} label="Legal" active={activeRoute === 'privacy'} onClick={() => navigateLearner('/privacy')} />
      {canManage && <MobileLink icon={ShieldCheck} label="Gestión" active={activeRoute === 'studio'} onClick={() => navigateLearner('/studio')} />}
    </nav>
  </div>
}

function SidebarLink({ icon: Icon, label, active = false, onClick }) {
  return <button className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon size={18} /><span>{label}</span></button>
}

function MobileLink({ icon: Icon, label, active = false, onClick }) {
  return <button className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon size={18} /><span>{label}</span></button>
}

function roleLabel(role) {
  return {
    colaborador: 'Colaborador',
    creador_contenido: 'Creador de contenido',
    revisor: 'Revisor',
    admin: 'Admin',
    super_admin: 'Super Admin',
  }[String(role || '')] || 'Colaborador'
}
