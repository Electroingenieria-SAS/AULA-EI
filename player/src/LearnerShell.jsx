import React, { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Code2, FileText, Gamepad2, Home, LogOut, ShieldCheck, Sparkles, TrendingUp, BrainCircuit, ClipboardList, Palette } from 'lucide-react'
import { assetUrl, navigateLearner } from './navigation.js'
import NotificationCenter from './NotificationCenter.jsx'
import AvatarBadge from './avatar/AvatarBadge.jsx'
import { avatarImageUrl, DEFAULT_AVATAR_ID, profileAvatarImage } from '../../src/avatar/avatar-utils.js'
import { mobileHaptic } from '../../src/MobileViewportSync.jsx'
import { supabase } from './supabase.js'
import '../../src/branding/developer-signature.css'

export default function LearnerShell({ children, activeRoute = 'catalog', profile = null }) {
  const displayName = profile?.full_name || 'Colaborador EI'
  const role = roleLabel(profile?.role)
  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean)
    return (parts.slice(0, 2).map((part) => part[0]).join('') || 'EI').toUpperCase()
  }, [displayName])
  const canManage = ['creador_contenido', 'revisor', 'admin', 'super_admin'].includes(String(profile?.role || ''))
  const isCourse = activeRoute === 'course'
  const mobileTitle = activeRoute === 'home' ? 'Inicio' : activeRoute === 'catalog' ? 'Mis capacitaciones' : activeRoute === 'development' ? 'Mi desarrollo' : activeRoute === 'plan' ? 'Mi plan de formación' : activeRoute === 'course' ? 'Capacitación' : activeRoute === 'games' ? 'Juegos EI' : activeRoute === 'coach' ? 'Mi entrenador' : activeRoute === 'privacy' ? 'Privacidad y legal' : activeRoute === 'credits' ? 'Créditos' : activeRoute === 'avatar' ? 'Mi personaje' : activeRoute === 'studio' ? 'Gestión Aula EI' : 'Aula EI'

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

      <button
        type="button"
        className="learner-sidebar-user learner-profile-card"
        onClick={() => navigateLearner('/mi-personaje')}
        aria-label={`Personalizar mi personaje. Perfil de ${displayName}, ${role}`}
      >
        <span className="learner-profile-card__details">
          <small className="learner-profile-card__eyebrow">MI ESPACIO</small>
          <strong className="learner-profile-card__name">{displayName}</strong>
          <span className="learner-profile-card__role">{role}</span>
          <span className="learner-profile-card__action">
            <Palette size={12} aria-hidden="true" />
            {profileAvatarImage(profile?.avatar_url) ? 'Editar personaje' : 'Crear personaje'}
          </span>
        </span>
        <SidebarProfileCharacter avatarUrl={profile?.avatar_url} fallback={initials}/>
      </button>


      <nav className="learner-sidebar-nav" aria-label="Navegación principal">
        <SidebarLink icon={Home} label="Inicio" active={activeRoute === 'home'} onClick={() => navigateLearner('/')} /><SidebarLink icon={Palette} label="Mi personaje" active={activeRoute === 'avatar'} onClick={() => navigateLearner('/mi-personaje')} />
        <SidebarLink icon={BookOpen} label="Mis capacitaciones" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
        <SidebarLink icon={TrendingUp} label="Mi desarrollo" active={activeRoute === 'development'} onClick={() => navigateLearner('/development')} />
        <SidebarLink icon={ClipboardList} label="Mi plan" active={activeRoute === 'plan'} onClick={() => navigateLearner('/plan')} />
        <SidebarLink icon={BrainCircuit} label="Mi entrenador" active={activeRoute === 'coach'} onClick={() => navigateLearner('/coach')} />
        <SidebarLink icon={Gamepad2} label="Juegos EI" active={activeRoute === 'games'} onClick={() => navigateLearner('/games')} />
        <SidebarLink icon={FileText} label="Privacidad y Legal" active={activeRoute === 'privacy'} onClick={() => navigateLearner('/privacy')} />
        {canManage && <SidebarLink icon={ShieldCheck} label="Gestión Aula EI" active={activeRoute === 'studio'} onClick={() => navigateLearner('/studio')} />}
      </nav>

      <div className="learner-sidebar-bottom">
        <button type="button" className="dev-sidebar-signature" onClick={() => navigateLearner('/credits')}
          aria-label="Ver créditos de desarrollo de Juan E. Pérez">
          <img src={assetUrl('brand/developer/juan-perez-secondary-blue.webp')} alt="" width="38" height="62" />
          <span><strong>Juan E. Pérez</strong><small>Créditos de desarrollo</small></span>
          <Code2 size={16} aria-hidden="true"/>
        </button>
        <button className="learner-sidebar-signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
        <div className="learner-sidebar-security"><Sparkles size={16} /><span>Contenido protegido con Supabase Auth y RLS.</span></div>
      </div>
    </aside>

    <header className="learner-mobile-appbar" aria-label={isCourse ? 'Cabecera de capacitación' : 'Cabecera de Aula EI'}>
      {!isCourse && <div className="learner-desktop-header-label" aria-hidden="true">
        ACADEMIA INTERNA <strong>Aula EI · Formación</strong>
      </div>}
      {isCourse ? <>
        <button className="learner-course-back" type="button" onClick={() => navigateLearner('/catalog')} aria-label="Volver a mis capacitaciones">
          <ArrowLeft size={19} aria-hidden="true" />
          <span>Mis capacitaciones</span>
        </button>
        <div className="learner-course-heading">
          <button className="dev-signature-course" type="button" onClick={() => navigateLearner('/credits')}
            aria-label="Ver créditos de desarrollo de Juan E. Pérez">
            <img src={assetUrl('brand/developer/juan-perez-secondary-blue.webp')} alt="" width="26" height="36"/>
            <span>Créditos</span>
          </button>
          <strong>Capacitación</strong>
        </div>
      </> : <button className="learner-mobile-brand" type="button" onClick={() => navigateLearner('/')} aria-label="Ir al inicio de Aula EI">
        <img src={assetUrl('brand/logo-aula-ei.png')} alt="" />
        <span><small>Aula EI</small><strong>{mobileTitle}</strong></span>
      </button>}
      {!isCourse && <button className="dev-signature-mobile" type="button"
        onClick={() => navigateLearner('/credits')} aria-label="Ver créditos de desarrollo de Juan E. Pérez"
        title="Créditos de desarrollo">
        <img src={assetUrl('brand/developer/juan-perez-secondary-blue.webp')} alt="" width="31" height="39"/>
      </button>}
      <NotificationCenter profile={profile} />
      {!isCourse && <button type="button" className="ei-avatar-header-action" onClick={() => navigateLearner('/mi-personaje')} title="Mi personaje" aria-label="Abrir editor de mi personaje">
        <AvatarBadge avatarUrl={profile?.avatar_url} fallback={initials}/>
      </button>}
    </header>

    <div className="learner-shell-main">{children}</div>

    <nav
      className="learner-mobile-global-nav"
      aria-label="Navegación móvil"
      style={{ '--mobile-nav-items': canManage ? 5 : 4 }}
    >
      <MobileLink icon={Home} label="Inicio" active={activeRoute === 'home' || activeRoute === 'development' || activeRoute === 'plan' || activeRoute === 'coach'} onClick={() => navigateLearner('/')} />
      <MobileLink icon={BookOpen} label="Cursos" active={activeRoute === 'catalog' || activeRoute === 'course'} onClick={() => navigateLearner('/catalog')} />
      <MobileLink icon={Gamepad2} label="Juegos" active={activeRoute === 'games'} onClick={() => navigateLearner('/games')} />
      <MobileLink icon={FileText} label="Legal" active={activeRoute === 'privacy'} onClick={() => navigateLearner('/privacy')} />
      {canManage && <MobileLink icon={ShieldCheck} label="Gestión" active={activeRoute === 'studio'} onClick={() => navigateLearner('/studio')} />}
    </nav>
  </div>
}

// A quiet idle animation uses the user's original full-body asset, not a reassembled illustration.
function SidebarProfileCharacter({ avatarUrl, fallback }) {
  const [failedSources, setFailedSources] = useState([])
  const selectedSource = profileAvatarImage(avatarUrl)
  const genericSource = avatarImageUrl(DEFAULT_AVATAR_ID)
  const source = [selectedSource, genericSource].find((candidate) => candidate && !failedSources.includes(candidate))

  return <span className="learner-profile-card__art" aria-hidden="true">
    {source
      ? <img
          className="learner-profile-card__character"
          src={source}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setFailedSources((current) => current.includes(source) ? current : [...current, source])}
        />
      : <span className="learner-profile-card__fallback">{fallback}</span>}
  </span>
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
