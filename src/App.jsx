import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import AdminMfaGate from './AdminMfaGate.jsx'
import ExperienceLayer from './ExperienceLayer.jsx'
import MobileViewportSync from './MobileViewportSync.jsx'
import LegalGate from './legal/LegalGate.jsx'
import { appUrl } from './paths.js'
import { clearDataCache } from './data-cache.js'
import { withTimeout } from './async-utils.js'
import { AccessError, LoginPage, PasswordGate, Startup } from './auth/AuthScreens.jsx'
import { supabase } from './supabase.js'

const loadCertificateApp = () => import('../certificate/src/CertificateApp.jsx')
const loadLearnerApp = () => import('../player/src/LearnerApp.jsx')
const CertificateApp = lazy(loadCertificateApp)
const LearnerApp = lazy(loadLearnerApp)

function routeInfo() {
  const hash = window.location.hash || '#/'
  return {
    hash,
    isLogin: /^#\/login(?:\/|$)/.test(hash),
    isCertificate: /^#\/certificate\/[^/?#]+/.test(hash),
  }
}

function normalizeRpcRow(value) {
  return Array.isArray(value) ? value[0] || null : value || null
}

export default function App() {
  const [route, setRoute] = useState(() => routeInfo())
  const [session, setSession] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    let alive = true
    const syncRoute = () => setRoute(routeInfo())
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setAuthError(error.message)
        setSession(data?.session || null)
        setSessionReady(true)
      })
      .catch((error) => {
        if (!alive) return
        setAuthError(error instanceof Error ? error.message : 'No fue posible validar la sesión.')
        setSessionReady(true)
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT' || !nextSession) clearDataCache()
      if (!nextSession) setProfile(null)
      setAuthError('')
      setSessionReady(true)
    })

    return () => {
      alive = false
      authListener.subscription.unsubscribe()
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const user = session?.user

    if (!user) {
      setProfile(null)
      setProfileBusy(false)
      return () => { alive = false }
    }

    setProfileBusy(true)
    setAuthError('')

    ;(async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_my_profile'),
          10000,
          'Supabase tardó demasiado validando tu perfil.',
        )
        if (error) throw error
        const currentProfile = normalizeRpcRow(data)
        if (!currentProfile) {
          await supabase.auth.signOut().catch(() => {})
          throw new Error('Esta cuenta no está habilitada o no está sincronizada con Aula EI.')
        }
        if (alive) {
          setProfile(currentProfile)
          setAuthError('')
        }
      } catch (error) {
        if (alive) {
          setProfile(null)
          setAuthError(error instanceof Error ? error.message : 'No fue posible validar tu acceso a Aula EI.')
        }
      } finally {
        if (alive) setProfileBusy(false)
      }
    })()

    return () => { alive = false }
  }, [session?.user?.id])

  const mustChangePassword = Boolean(
    session?.user?.app_metadata?.aula_ei_must_change_password === true ||
    session?.user?.user_metadata?.must_change_password === true,
  )

  useEffect(() => {
    if (!sessionReady || !session?.user || !profile || mustChangePassword || recoveryMode) return
    if (route.isLogin) window.location.replace(appUrl('/'))
  }, [sessionReady, session?.user?.id, profile?.id, mustChangePassword, recoveryMode, route.isLogin])

  useEffect(() => {
    if (!session?.user) return
    if (route.isCertificate) {
      void loadCertificateApp()
    } else {
      void loadLearnerApp()
    }
  }, [session?.user?.id, route.isCertificate])


  const content = useMemo(() => {
    if (!sessionReady) return <Startup title="Preparando Aula EI…" />
    if (recoveryMode) return <LoginPage error={authError} preserveRoute={false} recoveryMode onRecoveryModeChange={setRecoveryMode} />
    if (!session?.user) return <LoginPage error={authError} preserveRoute={route.isCertificate} onRecoveryModeChange={setRecoveryMode} />
    if (profileBusy) return <Startup title="Validando tu acceso…" />
    if (!profile) return <AccessError message={authError || 'No fue posible cargar tu perfil de Aula EI.'} />
    if (mustChangePassword) return <PasswordGate profile={profile} />
    const securedContent = route.isCertificate
      ? <CertificateApp sessionUser={session.user} />
      : <LearnerApp profile={profile} sessionUser={session.user} />
    return <LegalGate profile={profile} sessionUser={session.user}>
      <AdminMfaGate profile={profile}>
        <Suspense fallback={<Startup title="Cargando módulo…" />}>
          {securedContent}
        </Suspense>
      </AdminMfaGate>
    </LegalGate>
  }, [sessionReady, session?.user, profileBusy, profile, mustChangePassword, recoveryMode, route.isCertificate, authError])

  return <>
    <MobileViewportSync />
    <ExperienceLayer />
    {content}
  </>
}
