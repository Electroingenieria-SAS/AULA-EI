/**
 * Long-running tabs can hold old React chunks after the backend is deployed.
 * Detect a newer *published* build and ask the user to reload explicitly.
 * We do not silently reload in the middle of a test, exam or admin form.
 */
export function releaseChanged(current, published) {
  return typeof current === 'string' && current.length > 0
    && typeof published === 'string' && published.length > 0
    && current !== published
}

function showUpdatePrompt() {
  if (document.getElementById('aula-ei-release-prompt')) return
  const alert = document.createElement('aside')
  alert.id = 'aula-ei-release-prompt'
  alert.className = 'aula-ei-release-prompt'
  alert.setAttribute('role', 'status')
  alert.setAttribute('aria-live', 'polite')

  const label = document.createElement('span')
  label.textContent = 'Hay una nueva versión de Aula EI disponible. Actualiza para utilizar los formularios y funciones más recientes.'
  const action = document.createElement('button')
  action.type = 'button'
  action.textContent = 'Actualizar ahora'
  action.addEventListener('click', () => window.location.reload())
  alert.append(label, action)
  document.body.appendChild(alert)
}

export function installReleaseMonitor({ release, base }) {
  if (typeof window === 'undefined' || !release) return
  const baseUrl = new URL(base || '/', window.location.origin)
  let inFlight = false
  let lastChecked = 0
  let updateFound = false

  const check = async (force = false) => {
    if (inFlight || updateFound) return
    if (!force && Date.now() - lastChecked < 45_000) return
    inFlight = true
    lastChecked = Date.now()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 7000)
    try {
      const url = new URL('version.json', baseUrl)
      url.searchParams.set('check', String(lastChecked))
      const response = await fetch(url.href, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) return
      const payload = await response.json()
      if (releaseChanged(release, payload?.release)) {
        updateFound = true
        showUpdatePrompt()
      }
    } catch {
      // Offline and temporary network failures must never interrupt learning.
    } finally {
      window.clearTimeout(timer)
      inFlight = false
    }
  }

  void check(true)
  window.addEventListener('focus', () => { void check() })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check()
  })
  window.setInterval(() => {
    if (!document.hidden) void check()
  }, 180_000)
}
