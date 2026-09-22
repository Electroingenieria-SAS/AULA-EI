import React, { useEffect, useState } from 'react'
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { appUrl } from './paths.js'
import AuthVisualShell, { AuthPanelBrand } from './AuthVisualShell.jsx'
import { supabase } from './supabase.js'

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

export default function AdminMfaGate({ profile, children }) {
  const [phase, setPhase] = useState(ADMIN_ROLES.has(profile?.role) ? 'checking' : 'ready')
  const [factor, setFactor] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ADMIN_ROLES.has(profile?.role)) {
      setPhase('ready')
      return
    }
    let alive = true

    const inspect = async () => {
      try {
        setMessage('')
        const [aalResult, factorsResult] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ])
        if (aalResult.error) throw aalResult.error
        if (factorsResult.error) throw factorsResult.error
        if (!alive) return

        if (aalResult.data?.currentLevel === 'aal2') {
          setPhase('ready')
          return
        }

        const totp = factorsResult.data?.totp || []
        const verified = totp.find((item) => item.status === 'verified')
        if (verified) {
          setFactor(verified)
          setPhase('challenge')
          return
        }

        for (const stale of totp.filter((item) => item.status !== 'verified')) {
          await supabase.auth.mfa.unenroll({ factorId: stale.id }).catch(() => {})
        }

        const enroll = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Aula EI · Administración',
        })
        if (enroll.error) throw enroll.error
        if (!alive) return
        setEnrollment(enroll.data)
        setFactor(enroll.data)
        setPhase('enroll')
      } catch (error) {
        if (!alive) return
        setMessage(error instanceof Error ? error.message : 'No fue posible preparar la verificación en dos pasos.')
        setPhase('error')
      }
    }

    inspect()
    return () => { alive = false }
  }, [profile?.id, profile?.role])

  const verify = async () => {
    const cleanCode = code.replace(/\D/g, '').slice(0, 6)
    if (cleanCode.length !== 6 || !factor?.id) {
      setMessage('Ingresa el código de 6 dígitos de tu aplicación autenticadora.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (challenge.error) throw challenge.error

      const verified = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: cleanCode,
      })
      if (verified.error) throw verified.error

      const refreshed = await supabase.auth.refreshSession()
      if (refreshed.error) throw refreshed.error

      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal.error) throw aal.error
      if (aal.data?.currentLevel !== 'aal2') throw new Error('La sesión no alcanzó el nivel de seguridad AAL2.')

      setCode('')
      setPhase('ready')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'El código no pudo verificarse.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {})
    window.location.replace(appUrl('/login'))
  }

  if (phase === 'ready') return children

  const isChecking = phase === 'checking'
  const shellTitle = phase === 'challenge'
    ? 'Seguridad reforzada, sin salir de la experiencia.'
    : phase === 'enroll'
      ? 'Protegemos tu acceso administrativo desde el primer ingreso.'
      : 'Validamos tu sesión antes de abrir Gestión Aula EI.'

  const shellDescription = phase === 'challenge'
    ? 'Tu segundo factor protege las funciones administrativas y mantiene la trazabilidad de la sesión.'
    : 'La verificación MFA forma parte del mismo flujo visual de Aula EI, sin pantallas improvisadas ni cambios bruscos.'

  return <AuthVisualShell
    overline="Seguridad administrativa"
    title={shellTitle}
    description={shellDescription}
    panelClassName="auth-mfa-panel"
  >
    <AuthPanelBrand secureLabel="MFA · AAL2" />

    <div className="mfa-panel-copy">
      {isChecking && <>
        <div className="mfa-state-icon loading" aria-hidden="true"><Loader2 className="spin" size={25} /></div>
        <span className="eyebrow">Comprobación de seguridad</span>
        <h2>Verificando tu sesión</h2>
        <p>Estamos validando el nivel de autenticación antes de habilitar las herramientas administrativas.</p>
        <div className="auth-loading-bars compact" aria-hidden="true"><i /><i /><i /></div>
      </>}

      {phase === 'enroll' && <>
        <div className="mfa-state-icon"><ShieldCheck size={25} /></div>
        <span className="eyebrow">Configuración obligatoria</span>
        <h2>Activa la verificación en dos pasos</h2>
        <p>Escanea el código con tu aplicación autenticadora y confirma el código de 6 dígitos.</p>

        <div className="mfa-enrollment-layout">
          {enrollment?.totp?.qr_code && <div className="mfa-qr-frame">
            <img className="mfa-qr" src={enrollment.totp.qr_code} alt="Código QR para configurar MFA" />
          </div>}
          {enrollment?.totp?.secret && <div className="mfa-secret">
            <span>Clave manual</span>
            <code>{enrollment.totp.secret}</code>
          </div>}
        </div>

        <MfaCodeForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} button="Activar MFA" />
      </>}

      {phase === 'challenge' && <>
        <div className="mfa-state-icon"><Smartphone size={25} /></div>
        <span className="eyebrow">Segundo factor requerido</span>
        <h2>Confirma que eres tú</h2>
        <p>Abre tu aplicación autenticadora e ingresa el código actual para continuar.</p>
        <MfaCodeForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} button="Verificar y continuar" />
      </>}

      {phase === 'error' && <>
        <div className="mfa-state-icon error"><KeyRound size={25} /></div>
        <span className="eyebrow">No pudimos completar la verificación</span>
        <h2>Reintentemos la seguridad de tu sesión</h2>
        <p>{message || 'No fue posible validar la seguridad de la sesión.'}</p>
        <button className="auth-primary" onClick={() => window.location.reload()}>
          <span>Reintentar verificación</span><span className="auth-button-arrow" aria-hidden="true">→</span>
        </button>
      </>}
    </div>

    {!isChecking && <button className="mfa-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>}
  </AuthVisualShell>
}

function MfaCodeForm({ code, setCode, busy, message, onSubmit, button }) {
  return <form className="mfa-form" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
    <label>
      Código de 6 dígitos
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        autoFocus
        required
      />
    </label>
    <button className="auth-primary" disabled={busy || code.length !== 6}>
      {busy ? 'Verificando…' : button}
    </button>
    {message && <div className="auth-message error" role="alert">{message}</div>}
  </form>
}
