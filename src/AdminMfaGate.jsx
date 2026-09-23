import React, { useEffect, useState } from 'react'
import { KeyRound, Loader2, ShieldCheck, Smartphone } from 'lucide-react'
import { supabase } from './supabase.js'

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

export default function AdminMfaGate({ profile, children }) {
  const isAdmin = ADMIN_ROLES.has(profile?.role)
  const [phase, setPhase] = useState(isAdmin ? 'checking' : 'ready')
  const [factor, setFactor] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      setPhase('ready')
      return
    }

    let alive = true

    const inspect = async () => {
      try {
        setMessage('')
        setPhase('checking')

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
  }, [profile?.id, profile?.role, isAdmin])

  const verify = async (event) => {
    event?.preventDefault?.()
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
      if (aal.data?.currentLevel !== 'aal2') {
        throw new Error('La sesión no alcanzó el nivel de seguridad AAL2.')
      }

      setCode('')
      setPhase('ready')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'El código no pudo verificarse.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    window.location.hash = '#/login'
    window.location.reload()
  }

  if (!isAdmin || phase === 'ready') return children

  return <main className="startup-clean legacy-mfa-page">
    <section className="legacy-mfa-card">
      <img className="legacy-mfa-logo" src="/brand/logo-aula-ei.png" alt="Aula EI" />

      {phase === 'checking' && <>
        <Loader2 className="spin" size={34} />
        <h1>Validando seguridad administrativa</h1>
        <p>Estamos comprobando el nivel de autenticación antes de abrir Gestión Aula EI.</p>
      </>}

      {phase === 'enroll' && <>
        <ShieldCheck size={34} />
        <h1>Activa la verificación en dos pasos</h1>
        <p>Escanea el QR con Google Authenticator, Microsoft Authenticator u otra aplicación TOTP y confirma el código de 6 dígitos.</p>

        {enrollment?.totp?.qr_code && <img
          className="legacy-mfa-qr"
          src={enrollment.totp.qr_code}
          alt="Código QR para configurar MFA"
        />}

        {enrollment?.totp?.secret && <div className="legacy-mfa-secret">
          <span>Clave manual</span>
          <code>{enrollment.totp.secret}</code>
        </div>}

        <MfaForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} />
      </>}

      {phase === 'challenge' && <>
        <Smartphone size={34} />
        <h1>Confirma tu acceso administrativo</h1>
        <p>Abre tu aplicación autenticadora e ingresa el código actual. Las funciones administrativas requieren una sesión AAL2 vigente.</p>
        <MfaForm code={code} setCode={setCode} busy={busy} message={message} onSubmit={verify} />
      </>}

      {phase === 'error' && <>
        <KeyRound size={34} />
        <h1>No fue posible validar MFA</h1>
        <p>{message || 'La sesión administrativa no pudo elevarse a AAL2.'}</p>
        <button className="auth-primary" onClick={signOut}>Cerrar sesión e ingresar nuevamente</button>
      </>}
    </section>
  </main>
}

function MfaForm({ code, setCode, busy, message, onSubmit }) {
  return <form className="password-grid legacy-mfa-form" onSubmit={onSubmit}>
    <label>
      Código de 6 dígitos
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        required
      />
    </label>
    <button className="auth-primary" disabled={busy}>{busy ? 'Verificando…' : 'Verificar y continuar'}</button>
    {message && <div className="auth-message error" role="alert">{message}</div>}
  </form>
}
