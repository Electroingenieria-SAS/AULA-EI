import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import AdminMfaGate from './AdminMfaGate.jsx'
import ExperienceLayer from './ExperienceLayer.jsx'
import { appUrl, assetUrl } from './paths.js'
import { supabase } from './supabase.js'

const CertificateApp = lazy(() => import('../certificate/src/CertificateApp.jsx'))
const LearnerApp = lazy(() => import('../player/src/LearnerApp.jsx'))

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

function withTimeout(promise, ms, message) {
  let timeoutId
  const timer = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timer]).finally(() => window.clearTimeout(timeoutId))
}

export default function App() {
  const [route, setRoute] = useState(() => routeInfo())
  const [session, setSession] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [authError, setAuthError] = useState('')

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
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
    if (!sessionReady || !session?.user || !profile || mustChangePassword) return
    if (route.isLogin) window.location.replace(appUrl('/'))
  }, [sessionReady, session?.user?.id, profile?.id, mustChangePassword, route.isLogin])

  const content = useMemo(() => {
    if (!sessionReady) return <Startup title="Preparando Aula EI…" />
    if (!session?.user) return <LoginPage error={authError} preserveRoute={route.isCertificate} />
    if (profileBusy) return <Startup title="Validando tu acceso…" />
    if (!profile) return <AccessError message={authError || 'No fue posible cargar tu perfil de Aula EI.'} />
    if (mustChangePassword) return <PasswordGate profile={profile} />
    const securedContent = route.isCertificate
      ? <CertificateApp sessionUser={session.user} />
      : <LearnerApp profile={profile} sessionUser={session.user} />
    return <AdminMfaGate profile={profile}>
      <Suspense fallback={<Startup title="Cargando módulo…" />}>
        {securedContent}
      </Suspense>
    </AdminMfaGate>
  }, [sessionReady, session?.user, profileBusy, profile, mustChangePassword, route.isCertificate, authError])

  return <>
    <ExperienceLayer />
    {content}
  </>
}

function LoginPage({ error = '', preserveRoute = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(error)

  useEffect(() => setMessage(error), [error])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const { error: loginError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        10000,
        'Supabase no respondió a tiempo. Revisa tu conexión e inténtalo nuevamente.',
      )
      if (loginError) throw loginError
      if (!preserveRoute) window.location.replace(appUrl('/'))
    } catch (loginError) {
      const raw = loginError instanceof Error ? loginError.message : 'No fue posible iniciar sesión.'
      setMessage(/invalid login credentials/i.test(raw) ? 'Correo o contraseña incorrectos.' : raw)
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-hero-clean">
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <span className="auth-kicker">Academia interna · Electroingeniería</span>
      <h1>Formación, evidencia y cumplimiento en una sola experiencia.</h1>
      <p>Aula EI centraliza capacitaciones, evaluaciones, certificados, rutas de aprendizaje y seguimiento institucional con acceso protegido.</p>
      <div className="auth-feature-row">
        <span>Rutas y competencias</span>
        <span>Certificación trazable</span>
        <span>Seguridad con RLS</span>
      </div>
    </section>

    <section className="auth-panel-clean">
      <img className="company-logo" src={assetUrl('brand/logo-electroingenieria.jpg')} alt="Electroingeniería" />
      <span className="eyebrow">Acceso a la plataforma</span>
      <h2>Iniciar sesión</h2>
      <p>Ingresa con la cuenta habilitada por el administrador de Aula EI.</p>
      <form className="auth-form-clean" onSubmit={submit}>
        <label>
          Correo electrónico
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="auth-primary" disabled={busy}>{busy ? 'Validando…' : 'Ingresar'}</button>
        {message && <div className="auth-message error" role="alert">{message}</div>}
      </form>
      <div className="auth-security-note">
        <ShieldCheck size={18} />
        <span>Las cuentas se crean y administran desde Gestión Aula EI. No existe registro público.</span>
      </div>
    </section>
  </main>
}

function PasswordGate({ profile }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }

    if (
      password.length < 12 ||
      password.length > 128 ||
      /\s/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setMessage('Usa entre 12 y 128 caracteres, con mayúscula, minúscula, número y símbolo, sin espacios.')
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('complete-password-change', { body: { password } })
      if (error) throw new Error(data?.error || error.message)
      if (data?.ok === false) throw new Error(data?.error || 'No fue posible actualizar la contraseña.')
      await supabase.auth.signOut()
      window.location.replace(appUrl('/login'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  const greeting = profile?.full_name
    ? profile.full_name + ', esta cuenta fue creada con una contraseña temporal.'
    : 'Esta cuenta fue creada con una contraseña temporal.'

  return <main className="startup-clean">
    <section>
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <LockKeyhole size={34} />
      <h1>Crea tu contraseña personal</h1>
      <p>{greeting} Debes cambiarla antes de continuar.</p>
      <form className="password-grid" onSubmit={submit}>
        <label>
          Nueva contraseña
          <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label>
          Confirmar contraseña
          <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </label>
        <button className="auth-primary" disabled={busy}>{busy ? 'Actualizando…' : 'Guardar contraseña'}</button>
        {message && <div className="auth-message error">{message}</div>}
      </form>
    </section>
  </main>
}

function AccessError({ message }) {
  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {})
    window.location.replace(appUrl('/login'))
  }

  return <main className="startup-clean">
    <section>
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <ShieldCheck size={34} />
      <h1>No fue posible validar tu acceso</h1>
      <p>{message}</p>
      <div className="startup-actions">
        <button className="auth-primary" onClick={() => window.location.reload()}>Reintentar</button>
        <button className="auth-secondary" onClick={signOut}>Cerrar sesión</button>
      </div>
    </section>
  </main>
}

function Startup({ title }) {
  return <main className="startup-clean">
    <section>
      <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
      <Loader2 className="spin" size={30} />
      <h1>{title}</h1>
    </section>
  </main>
}
