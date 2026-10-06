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
