import { appUrl, assetUrl } from '../../src/paths.js'

export { appUrl, assetUrl }

export function navigateLearner(target = '/', options = {}) {
  const raw = String(target || '/')
  const hashPath = raw.startsWith('/#/') ? raw.slice(2) : raw.startsWith('#/') ? raw.slice(1) : raw
  const normalized = hashPath.startsWith('/') ? hashPath : '/' + hashPath
  const nextHash = '#' + normalized

  if (window.location.hash === nextHash) return

  const commitNavigation = () => {
    const oldURL = window.location.href
    const nextURL = appUrl(normalized)

    if (options.replace) {
      window.history.replaceState(window.history.state, '', nextURL)
    } else {
      window.history.pushState(window.history.state, '', nextURL)
    }

    const newURL = window.location.href
    const event = typeof HashChangeEvent === 'function'
      ? new HashChangeEvent('hashchange', { oldURL, newURL })
      : new Event('hashchange')
    window.dispatchEvent(event)
  }

  // Las capturas completas de View Transitions encarecen rutas grandes.
  // La navegación por hash ya conserva la shell; actualizamos solo el contenido.
  commitNavigation()
}

export function openLearnerCourse(courseId) {
  if (!courseId) return
  navigateLearner('/course/' + encodeURIComponent(courseId))
}
