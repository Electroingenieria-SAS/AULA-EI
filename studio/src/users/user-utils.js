import { ROLE_LABELS } from '../shared.js'
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
 * Decode a Supabase FunctionsHttpError response without exposing raw platform
 * errors, private backend exceptions, passwords or access tokens.
 */
export async function getManagedFunctionDetails(error, data, fallback = 'No fue posible completar la operación.') {
  const response = error?.context
  const status = Number(response?.status || error?.status || 0)
  let payload = data && typeof data === 'object' ? data : null

  if (!payload && response && typeof response.json === 'function') {
    try {
      const value = await (typeof response.clone === 'function' ? response.clone() : response).json()
      if (value && typeof value === 'object') payload = value
    } catch {
      // HTTP gateways do not always return a JSON body.
    }
  }

  const code = typeof payload?.code === 'string' ? payload.code : ''
  const scope = payload?.scope === 'target' ? 'target' : payload?.scope === 'administrator' ? 'administrator' : ''
  const rawSeconds = Number(payload?.retry_after_seconds ?? response?.headers?.get?.('Retry-After'))
  const retryAfterSeconds = Number.isFinite(rawSeconds) && rawSeconds > 0
    ? Math.min(86400, Math.ceil(rawSeconds)) : 0
  const serverMessage = typeof payload?.error === 'string' ? payload.error.trim().slice(0, 300) : ''
  let message = fallback

  if (status === 429 || code === 'RATE_LIMITED') {
    message = serverMessage || 'Se alcanzó el límite de operaciones de seguridad. Espera el tiempo indicado antes de volver a intentarlo.'
  } else if (status === 401 || status === 403) {
    message = serverMessage || 'No se pudo validar tu sesión administrativa. Cierra sesión e ingresa nuevamente.'
  } else if (status >= 500) {
    message = 'El servicio no pudo completar la operación. Intenta más tarde o informa al administrador de Aula EI.'
  } else if (serverMessage) {
    message = serverMessage
  } else {
    const raw = String(error?.message || '').trim()
    if (raw && !/Edge Function returned a non-2xx status code/i.test(raw)) message = raw
  }

  return { message, status, code, retryAfterSeconds, scope }
}

/** Preserve the existing string helper for user creation and deletion. */
export async function getManagedFunctionError(error, data, fallback) {
  const details = await getManagedFunctionDetails(error, data, fallback)
  return details.message
}


/** Download only records already available to authorized administrators. */
export function downloadUsersCsv(source) {
    const csv = [
      ['Nombre', 'Correo', 'Rol', 'Cargo', 'Estado', 'Capacitaciones activas', 'Completadas', 'Fecha creación'],
      ...source.map((person) => [
        person.name,
        person.email || '',
        ROLE_LABELS[person.role] || person.role,
        person.position_label,
        person.is_active === false ? 'Inactivo' : 'Activo',
        person.stats.active,
        person.stats.completed,
        formatDate(person.created_at),
      ]),
    ].map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'usuarios-aula-ei.csv'
    anchor.click()
    URL.revokeObjectURL(url)

}
