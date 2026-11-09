/**
 * Interpret failed Supabase Edge Function calls without exposing raw platform
 * messages or internal server exceptions to a person changing credentials.
 * The password itself and user session must never be logged here.
 */
export async function getPasswordChangeError(error, data = null) {
  const response = error?.context
  const status = Number(response?.status || error?.status || 0)
  let payload = data && typeof data === 'object' ? data : null

  if (!payload && response && typeof response.json === 'function') {
    try {
      payload = await (typeof response.clone === 'function' ? response.clone() : response).json()
    } catch {
      // The response may be blank or non-JSON (e.g. gateway rejection).
    }
  }

  if (status === 429 || payload?.code === 'RATE_LIMITED') {
    return 'Se alcanzó el límite de intentos de cambio de contraseña. Espera al menos 15 minutos antes de volver a intentarlo.'
  }
  if (status === 401) {
    return 'Tu sesión ya no es válida o ha vencido. Cierra sesión e ingresa nuevamente para cambiar la contraseña.'
  }
  if (status === 403) {
    return 'La cuenta no está habilitada o necesita revisión de permisos. Comunícate con el administrador de Aula EI.'
  }
  if (status === 503 && payload?.code === 'PASSWORD_REPUTATION_UNAVAILABLE') {
    return 'No se pudo verificar la seguridad de la contraseña. Intenta más tarde.'
  }
  if (status >= 500) {
    return 'No fue posible actualizar la contraseña por un problema temporal del servidor. Contacta al administrador si continúa.'
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim().slice(0, 300)
  }
  if (status === 400) {
    return 'No se aceptó la contraseña. Verifica los requisitos, evita usar tu correo y elige una contraseña nueva que no figure en filtraciones.'
  }

  const raw = String(error?.message || '').trim()
  if (raw && !/Edge Function returned a non-2xx status code/i.test(raw)) {
    return raw
  }
  return 'No fue posible cambiar la contraseña. Revisa los requisitos e inténtalo nuevamente.'
}
