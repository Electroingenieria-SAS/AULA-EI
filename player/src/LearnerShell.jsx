import React, { useMemo } from 'react'
import { BookOpen, Gamepad2, Home, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { navigateLearner } from './navigation.js'
import { supabase } from './supabase.js'

export default function LearnerShell({ children, activeRoute = 'catalog', profile = null }) {
  const displayName = profile?.full_name || 'Colaborador EI'
  const role = roleLabel(profile?.role)
  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean)
    return (parts.slice(0, 2).map((part) => part[0]).join('') || 'EI').toUpperCase()
  }, [displayName])
  const canManage = ['creador_contenido', 'revisor', 'admin', 'super_admin'].includes(String(profile?.role || ''))

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace('/#/login')
  }

  return <div className="learner-app-shell">
    <aside className="learner-global-sidebar">
      <button className="learner-sidebar-brand learner-sidebar-brand-original" onClick={() => navigateLearner('/')}>
        <img src="/brand/logo-aula-ei.png" alt="Aula EI · Academia Interna" />
        <small>ACADEMIA INTERNA</small>
      </button>

      <div className="learner-sidebar-user">
        <div className="learner-sidebar-avatar">{initials}</div>
        <div><strong>{displayName}</strong><span>{role}</span></div>
      </div>

      <nav className="learner-sidebar-nav" aria-label="Navegación principal">
        <SidebarLink icon={Home} label="Inicio" active={activeRoute === 'home'} onClick={() => navigateLearner('/')} />
        <SidebarLink icon={BookOpen} label="Mis capacitaciones" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
        <SidebarLink icon={Gamepad2} label="Juegos EI" active={activeRoute === 'games'} onClick={() => navigateLearner('/games')} />
        {canManage && <SidebarLink icon={ShieldCheck} label="Gestión Aula EI" active={activeRoute === 'studio'} onClick={() => navigateLearner('/studio')} />}
      </nav>

      <div className="learner-sidebar-bottom">
        <button className="learner-sidebar-signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
        <div className="learner-sidebar-security"><Sparkles size={16} /><span>Contenido protegido con Supabase Auth y RLS.</span></div>
      </div>
    </aside>

    <div className="learner-shell-main">{children}</div>

    <nav className="learner-mobile-global-nav">
      <MobileLink icon={Home} label="Inicio" onClick={() => navigateLearner('/')} />
      <MobileLink icon={BookOpen} label="Cursos" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
      <MobileLink icon={Gamepad2} label="Juegos" onClick={() => navigateLearner('/games')} />
      {canManage && <MobileLink icon={ShieldCheck} label="Gestión" onClick={() => navigateLearner('/studio')} />}
    </nav>
  </div>
}

function SidebarLink({ icon: Icon, label, active = false, onClick }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><Icon size={18} /><span>{label}</span></button>
}

function MobileLink({ icon: Icon, label, active = false, onClick }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><Icon size={18} /><span>{label}</span></button>
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
