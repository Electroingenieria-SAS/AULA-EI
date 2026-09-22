import { appUrl, assetUrl } from '../../src/paths.js'

export { appUrl, assetUrl }

export function navigateLearner(target = '/', options = {}) {
  const raw = String(target || '/')
  const hashPath = raw.startsWith('/#/') ? raw.slice(2) : raw.startsWith('#/') ? raw.slice(1) : raw
  const normalized = hashPath.startsWith('/') ? hashPath : '/' + hashPath

  if (options.replace) {
    window.location.replace(appUrl(normalized))
    return
  }

  if (window.location.hash === '#' + normalized) return
  window.location.hash = normalized
}

export function openLearnerCourse(courseId) {
  if (!courseId) return
  navigateLearner('/course/' + encodeURIComponent(courseId))
}
