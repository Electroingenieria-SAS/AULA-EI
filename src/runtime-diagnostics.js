const STORAGE_KEY = 'aula-ei-runtime-diagnostics-v1'
const MAX_EVENTS = 20

function redactDiagnosticText(value, maxLength) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt-redacted]')
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, '[secret-redacted]')
    .slice(0, maxLength)
}

function safeRead() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : []
  } catch {
    return []
  }
}

function safeWrite(events) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
  } catch {}
}

export function recordRuntimeDiagnostic(type, detail = {}) {
  const event = {
    at: new Date().toISOString(),
    type: String(type || 'runtime').slice(0, 60),
    release: String(import.meta.env.VITE_RELEASE_SHA || 'local').slice(0, 40),
    route: redactDiagnosticText(window.location.hash || window.location.pathname || '/', 180),
    viewport: {
      width: Math.round(window.innerWidth || 0),
      height: Math.round(window.innerHeight || 0),
      dpr: Number(window.devicePixelRatio || 1),
    },
    detail: {
      name: redactDiagnosticText(detail?.name, 120),
      message: redactDiagnosticText(detail?.message, 500),
      source: redactDiagnosticText(detail?.source, 180),
    },
  }
  const events = safeRead()
  events.push(event)
  safeWrite(events)
  return event
}

export function installRuntimeDiagnostics() {
  window.addEventListener('error', (event) => {
    recordRuntimeDiagnostic('window-error', {
      name: event.error?.name || 'Error',
      message: event.error?.message || event.message,
      source: event.filename,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    recordRuntimeDiagnostic('unhandled-rejection', {
      name: reason?.name || 'PromiseRejection',
      message: reason?.message || String(reason || 'Unhandled promise rejection'),
    })
  })
}

export function getRuntimeDiagnostics() {
  return {
    release: String(import.meta.env.VITE_RELEASE_SHA || 'local').slice(0, 40),
    generatedAt: new Date().toISOString(),
    events: safeRead(),
  }
}
