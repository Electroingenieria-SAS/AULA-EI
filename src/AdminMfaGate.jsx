import React, { useEffect, useState } from 'react'
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { appUrl, assetUrl } from './paths.js'
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

  return <main className="mfa-page">
    <section className="mfa-card">
      <img className="mfa-logo" src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />

      {phase === 'checking' && <>
        <Loader2 className="spin" size={34} />
        <h1>Verificando seguridad administrativa…</h1>
        <p>Estamos comprobando el nivel de autenticación de tu sesión.</p>
      </>}

      {phase === 'enroll' && <>
        <ShieldCheck size={36} />
        <span className="mfa-kicker">Obligatorio para administración</span>
        <h1>Activa la verificación en dos pasos</h1>
        <p>Escanea este código con Google Authenticator, Microsoft Authenticator, 1Password, Authy u otra aplicación TOTP.</p>
        {enrollment?.totp?.qr_code && <img className="mfa-qr" src={enrollment.totp.qr_code} alt="Código QR para configurar MFA" />}
        {enrollment?.totp?.secret && <div className="mfa-secret">
          <span>Clave manual</span>
          <code>{enrollment.totp.secret}</code>
        </div>}
        <MfaCodeForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} button="Activar MFA" />
      </>}

      {phase === 'challenge' && <>
        <Smartphone size={36} />
        <span className="mfa-kicker">Segundo factor requerido</span>
        <h1>Confirma que eres tú</h1>
        <p>Tu cuenta administrativa está protegida con MFA. Ingresa el código actual de tu aplicación autenticadora.</p>
        <MfaCodeForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} button="Verificar y continuar" />
      </>}

      {phase === 'error' && <>
        <KeyRound size={36} />
        <h1>No pudimos preparar MFA</h1>
        <p>{message || 'No fue posible validar la seguridad de la sesión.'}</p>
        <button className="auth-primary" onClick={() => window.location.reload()}>Reintentar</button>
      </>}

      <button className="mfa-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
    </section>
  </main>
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
