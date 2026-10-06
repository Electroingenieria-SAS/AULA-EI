import React, { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Briefcase, ClipboardList, GraduationCap, RefreshCw,
  ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import { STAFF_ROLES } from './shared.js'
import {
  AssignmentsCenter,
  CertificatesManager,
  ComplianceCenter,
  CoursesManager,
  UsersManager,
  preloadStudioTools,
} from './studio-modules.js'
import StudioLoading from './StudioLoading.jsx'
import useStudioData from './useStudioData.js'

export default function App({ initialProfile = null }) {
  const profile = initialProfile
  const [tab, setTab] = useState('courses')
  const {
    canAdmin,
    message,
    setMessage,
    courses,
    profiles,
    enrollments,
    loaded,
    loading,
    busy,
    refreshCurrent,
  } = useStudioData(profile, tab)

  useEffect(() => {
    const warm = () => preloadStudioTools(canAdmin)

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 1400 })
      return () => window.cancelIdleCallback?.(id)
    }

    const id = window.setTimeout(warm, 500)
    return () => window.clearTimeout(id)
  }, [canAdmin])

  const tabReady = useMemo(() => {
    if (tab === 'courses') return loaded.courses
    if (tab === 'assignments' || tab === 'users') return loaded.courses && loaded.profiles && loaded.enrollments
    if (tab === 'compliance') return loaded.courses && loaded.profiles
    return true
  }, [tab, loaded])

  const changeTab = useCallback((nextTab) => {
    if (nextTab === tab) return
    // Mantiene el click como interacción urgente y difiere el render pesado.
    startTransition(() => setTab(nextTab))
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

      <div className="studio-tab-stage" aria-busy={!tabReady || busy ? 'true' : 'false'}>
        <div className="studio-tab-content" key={tab}>
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
    </div>
  </section>
}
