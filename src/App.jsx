import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import AdminMfaGate from './AdminMfaGate.jsx'
import AuthVisualShell, { AuthPanelBrand } from './AuthVisualShell.jsx'
import ExperienceLayer from './ExperienceLayer.jsx'
import MobileViewportSync from './MobileViewportSync.jsx'
import { appUrl, assetUrl } from './paths.js'
import { clearDataCache } from './data-cache.js'
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
    return <AdminMfaGate profile={profile}>
      <Suspense fallback={<Startup title="Cargando módulo…" />}>
        {securedContent}
      </Suspense>
    </AdminMfaGate>
  }, [sessionReady, session?.user, profileBusy, profile, mustChangePassword, recoveryMode, route.isCertificate, authError])

  return <>
    <MobileViewportSync />
    <ExperienceLayer />
    {content}
  </>
}

function LoginPage({ error = '', preserveRoute = false, recoveryMode = false, onRecoveryModeChange = () => {} }) {
  const [mode, setMode] = useState(recoveryMode ? 'recovery-email' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [recoveryVerified, setRecoveryVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(error)
  const [messageTone, setMessageTone] = useState('error')

  useEffect(() => {
    if (!error) return
    setMessage(error)
    setMessageTone('error')
  }, [error])

  useEffect(() => {
    if (recoveryMode && mode === 'login') setMode('recovery-email')
  }, [recoveryMode, mode])

  const showMessage = (value, tone = 'error') => {
    setMessage(String(value || ''))
    setMessageTone(tone)
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    showMessage('')
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
      showMessage(/invalid login credentials/i.test(raw) ? 'Correo o contraseña incorrectos.' : raw)
    } finally {
      setBusy(false)
    }
  }

  const openRecovery = () => {
    onRecoveryModeChange(true)
    setMode('recovery-email')
    setPassword('')
    setCode('')
    setNewPassword('')
    setConfirmation('')
    setRecoveryVerified(false)
    showMessage('')
  }

  const leaveRecovery = async () => {
    if (recoveryVerified) await supabase.auth.signOut().catch(() => {})
    onRecoveryModeChange(false)
    setMode('login')
    setCode('')
    setNewPassword('')
    setConfirmation('')
    setRecoveryVerified(false)
    showMessage('')
  }

  const sendRecoveryCode = async (event) => {
    event?.preventDefault?.()
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showMessage('Ingresa un correo electrónico válido.')
      return
    }

    setBusy(true)
    showMessage('')
    try {
      const { error: recoveryError } = await withTimeout(
        supabase.auth.resetPasswordForEmail(normalizedEmail),
        10000,
        'No fue posible contactar el servicio de recuperación.',
      )
      if (recoveryError) {
        const raw = String(recoveryError.message || '')
        if (/rate|too many|429/i.test(raw)) throw new Error('Has solicitado varios códigos. Espera un momento antes de intentarlo nuevamente.')
        if (!/not found|user|email/i.test(raw)) throw recoveryError
      }
      setMode('recovery-code')
      showMessage('Si el correo está registrado en Aula EI, recibirás un código de 6 dígitos. Revisa también la carpeta de spam.', 'success')
    } catch (recoveryError) {
      showMessage(recoveryError instanceof Error ? recoveryError.message : 'No fue posible enviar el código de recuperación.')
    } finally {
      setBusy(false)
    }
  }

  const completeRecovery = async (event) => {
    event.preventDefault()
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6)
    if (!recoveryVerified && normalizedCode.length !== 6) {
      showMessage('Ingresa el código de 6 dígitos enviado a tu correo.')
      return
    }
    if (newPassword !== confirmation) {
      showMessage('Las contraseñas no coinciden.')
      return
    }
    const passwordError = validatePasswordPolicy(newPassword)
    if (passwordError) {
      showMessage(passwordError)
      return
    }

    setBusy(true)
    showMessage('')
    try {
      let accessToken = ''
      if (!recoveryVerified) {
        const { data, error: verifyError } = await withTimeout(
          supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: normalizedCode,
            type: 'recovery',
          }),
          10000,
          'No fue posible validar el código de recuperación.',
        )
        if (verifyError || !data?.session?.access_token) {
          throw new Error(/expired|invalid|otp/i.test(String(verifyError?.message || ''))
            ? 'El código es incorrecto o ya venció. Solicita uno nuevo e inténtalo otra vez.'
            : String(verifyError?.message || 'No fue posible validar el código.'))
        }
        accessToken = data.session.access_token
        setRecoveryVerified(true)
      } else {
        const { data } = await supabase.auth.getSession()
        accessToken = data?.session?.access_token || ''
      }

      if (!accessToken) throw new Error('La sesión de recuperación ya no está disponible. Solicita un código nuevo.')

      const { data: changed, error: changeError } = await supabase.functions.invoke('complete-password-change', {
        body: { password: newPassword, reason: 'recovery' },
        headers: { Authorization: 'Bearer ' + accessToken },
      })
      if (changeError) throw new Error(String(changed?.error || changeError.message || 'No fue posible cambiar la contraseña.'))
      if (changed?.ok === false) throw new Error(String(changed.error || 'No fue posible cambiar la contraseña.'))

      await supabase.auth.signOut().catch(() => {})
      onRecoveryModeChange(false)
      setRecoveryVerified(false)
      setMode('login')
      setPassword('')
      setCode('')
      setNewPassword('')
      setConfirmation('')
      showMessage('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.', 'success')
    } catch (recoveryError) {
      showMessage(recoveryError instanceof Error ? recoveryError.message : 'No fue posible completar la recuperación.')
    } finally {
      setBusy(false)
    }
  }

  const loginContent = <>
    <div className="auth-panel-copy">
      <span className="eyebrow">Aula EI · Acceso</span>
      <h2>Bienvenido de nuevo</h2>
      <p>Ingresa con la cuenta habilitada por el administrador de la plataforma.</p>
    </div>

    <form className="auth-form-clean" onSubmit={submit}>
      <label>
        <span>Correo electrónico</span>
        <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@ei.com.co" required />
      </label>
      <label>
        <span>Contraseña</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" required />
      </label>
      <button type="button" className="auth-link-button" onClick={openRecovery}>¿Olvidaste tu contraseña?</button>
      <button className="auth-primary" disabled={busy}>
        <span>{busy ? 'Validando acceso…' : 'Ingresar a Aula EI'}</span>
        <span className="auth-button-arrow" aria-hidden="true">→</span>
      </button>
      {message && <div className={'auth-message ' + messageTone} role="status">{message}</div>}
    </form>
  </>

  const recoveryEmailContent = <>
    <div className="auth-panel-copy">
      <span className="eyebrow">Recuperación de acceso</span>
      <h2>Recupera tu contraseña</h2>
      <p>Escribe el correo registrado en Aula EI. Supabase enviará un código de verificación para confirmar que la cuenta es tuya.</p>
    </div>
    <form className="auth-form-clean" onSubmit={sendRecoveryCode}>
      <label>
        <span>Correo electrónico</span>
        <input autoFocus type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@ei.com.co" required />
      </label>
      <button className="auth-primary" disabled={busy}>
        <span>{busy ? 'Enviando código…' : 'Enviar código'}</span>
        <span className="auth-button-arrow" aria-hidden="true">→</span>
      </button>
      <button type="button" className="auth-link-button centered" onClick={leaveRecovery}>Volver al inicio de sesión</button>
      {message && <div className={'auth-message ' + messageTone} role="status">{message}</div>}
    </form>
  </>

  const recoveryCodeContent = <>
    <div className="auth-panel-copy">
      <span className="eyebrow">Verificación por correo</span>
      <h2>Crea una nueva contraseña</h2>
      <p>{recoveryVerified ? 'Tu código ya fue validado. Define ahora una contraseña nueva.' : <>Enviamos un código de 6 dígitos a <strong>{email}</strong>. Escríbelo junto con tu nueva contraseña.</>}</p>
    </div>
    <form className="auth-form-clean" onSubmit={completeRecovery}>
      {!recoveryVerified && <label>
        <span>Código de 6 dígitos</span>
        <input
          className="auth-code-input"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          required
        />
      </label>}
      <label>
        <span>Nueva contraseña</span>
        <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
      </label>
      <label>
        <span>Confirmar contraseña</span>
        <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
      </label>
      <small className="auth-password-help">Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo, sin espacios.</small>
      <button className="auth-primary" disabled={busy}>
        <span>{busy ? 'Verificando y actualizando…' : 'Cambiar contraseña'}</span>
        <span className="auth-button-arrow" aria-hidden="true">→</span>
      </button>
      {!recoveryVerified && <div className="auth-recovery-actions">
        <button type="button" className="auth-link-button" disabled={busy} onClick={sendRecoveryCode}>Reenviar código</button>
        <button type="button" className="auth-link-button" disabled={busy} onClick={() => setMode('recovery-email')}>Cambiar correo</button>
      </div>}
      <button type="button" className="auth-link-button centered" disabled={busy} onClick={leaveRecovery}>Cancelar recuperación</button>
      {message && <div className={'auth-message ' + messageTone} role="status">{message}</div>}
    </form>
  </>

  return <AuthVisualShell>
    <AuthPanelBrand secureLabel={mode === 'login' ? 'Acceso seguro' : 'Recuperación segura'} />
    {mode === 'login' ? loginContent : mode === 'recovery-email' ? recoveryEmailContent : recoveryCodeContent}
    <div className="auth-security-note">
      <ShieldCheck size={18} />
      <span>{mode === 'login' ? 'Sin registro público. Las cuentas y permisos se administran desde Gestión Aula EI.' : 'El código es de un solo uso. Nunca lo compartas con terceros ni con soporte.'}</span>
    </div>
  </AuthVisualShell>
}

function validatePasswordPolicy(password) {
  if (
    password.length < 12 ||
    password.length > 128 ||
    /\s/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return 'Usa entre 12 y 128 caracteres, con mayúscula, minúscula, número y símbolo, sin espacios.'
  }
  return ''
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

    const passwordError = validatePasswordPolicy(password)
    if (passwordError) {
      setMessage(passwordError)
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
  return <AuthVisualShell
    overline="Preparando tu experiencia"
    title="Aula EI está lista para continuar contigo."
    description="Validamos la sesión y preparamos únicamente los módulos que necesitas para evitar saltos visuales y cargas innecesarias."
    panelClassName="auth-loading-panel"
  >
    <AuthPanelBrand secureLabel="Sesión protegida" />
    <div className="auth-loading-state" role="status" aria-live="polite">
      <div className="auth-loading-orbit" aria-hidden="true"><span /><span /><span /></div>
      <span className="eyebrow">Un momento</span>
      <h2>{title}</h2>
      <p>Estamos sincronizando tu acceso de forma segura.</p>
      <div className="auth-loading-bars" aria-hidden="true"><i /><i /><i /></div>
    </div>
  </AuthVisualShell>
}
