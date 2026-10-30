export const ROLE_OPTIONS = ['colaborador', 'creador_contenido', 'revisor', 'admin', 'super_admin']

export function initials(value) {
  const words = String(value || 'U').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function formatDate(value) {
  if (!value) return 'Sin registro'
  try {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export function csvCell(value) {
  const text = String(value ?? '')
  return '"' + text.replace(/"/g, '""') + '"'
}

/**
 * Supabase returns a FunctionsHttpError for HTTP 429/4xx/5xx. The useful
 * Spanish error is in its Response body, not in the generic SDK message.
 */
export async function getManagedFunctionError(error, data, fallback = 'No fue posible completar la operación.') {
  if (data && typeof data.error === 'string' && data.error.trim()) return data.error
  const response = error?.context
  if (response && typeof response.json === 'function') {
    try {
      const payload = await (typeof response.clone === 'function' ? response.clone() : response).json()
      if (payload && typeof payload.error === 'string' && payload.error.trim()) return payload.error
    } catch {
      // A transport error can have an empty/non-JSON body; use the status.
    }
    if (response.status === 429) return 'Demasiados intentos. Espera unos minutos antes de volver a crear usuarios.'
    if (response.status === 401 || response.status === 403) return 'No se pudo validar tu sesión de administrador. Cierra sesión e ingresa nuevamente.'
  }
  const message = String(error?.message || '').trim()
  if (message && !/Edge Function returned a non-2xx status code/i.test(message)) return message
  return fallback
}
