import { useEffect, useRef, useState } from 'react'
import { getError, supabase } from '../shared.js'
import { getManagedFunctionDetails } from './user-utils.js'

/**
 * Isolate credential reset state from the large user-directory UI. The
 * server remains authoritative for rate limits, RBAC and MFA.
 */
export function useManagedPasswordReset({ profile, canManage, workingId, setWorkingId, setResetResult, setMessage }) {
  const resetPendingRef = useRef(false)
  const cooldownKey = 'aula_ei_reset_password_wait:' + profile.id
  const [resetCooldownUntil, setResetCooldownUntil] = useState(() => {
    try { return Number(window.sessionStorage.getItem(cooldownKey)) || 0 } catch { return 0 }
  })
  const [resetClock, setResetClock] = useState(Date.now())
  useEffect(() => {
    if (resetCooldownUntil <= Date.now()) return undefined
    const timer = window.setInterval(() => {
      const now = Date.now()
      setResetClock(now)
      if (now >= resetCooldownUntil) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resetCooldownUntil])
  const resetWaitMinutes = Math.ceil(Math.max(0, resetCooldownUntil - resetClock) / 60000)
  const resetBlocked = resetCooldownUntil > resetClock
  const resetLabel = resetBlocked
    ? 'Reintentar restablecimiento en aproximadamente ' + resetWaitMinutes + ' minuto(s).'
    : 'Restablecer contraseña'
  async function resetManagedPassword(person) {
    // Protect before the busy state is rendered to avoid duplicate requests.
    if (resetPendingRef.current || workingId) return
    if (Date.now() < resetCooldownUntil) return setMessage(resetLabel)
    if (!canManage(person)) return setMessage('Solo puedes restablecer contraseñas de usuarios con un nivel inferior al tuyo.')
    if (person.is_active === false) return setMessage('Reactiva primero la cuenta antes de restablecer su contraseña.')
    if (!window.confirm('¿Restablecer la contraseña de ' + person.name + '? Se generará una contraseña temporal y deberá cambiarla en el siguiente ingreso.')) return

    resetPendingRef.current = true
    setWorkingId(person.id)
    setResetResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('reset-managed-user-password', {
        body: { user_id: person.id },
      })
      if (error) {
        const detail = await getManagedFunctionDetails(error, data, 'No fue posible restablecer la contraseña.')
        if (detail.status === 429 || detail.code === 'RATE_LIMITED') {
          const retryUntil = Date.now() + (detail.retryAfterSeconds || 900) * 1000
          setResetCooldownUntil(retryUntil)
          setResetClock(Date.now())
          try { window.sessionStorage.setItem(cooldownKey, String(retryUntil)) } catch { /* optional */ }
        }
        throw new Error(detail.message)
      }
      if (data?.ok === false) throw new Error(String(data.error || 'No fue posible restablecer la contraseña.'))
      const temporaryPassword = String(data?.temporary_password || '')
      if (!temporaryPassword) throw new Error('No se recibió confirmación completa. Consulta el registro antes de reintentar.')
      setResetResult({ person, password: temporaryPassword })
      setMessage('Contraseña temporal generada para ' + person.name + '.')
    } catch (error) {
      setMessage(getError(error, 'No fue posible restablecer la contraseña.'))
    } finally {
      resetPendingRef.current = false
      setWorkingId(null)
    }
  }

  return { resetManagedPassword, resetBlocked, resetLabel }
}
