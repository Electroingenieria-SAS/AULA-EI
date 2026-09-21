export function navigateLearner(target) {
  const raw = String(target || '')
  const hashPath = raw.startsWith('/#/') ? raw.slice(2) : raw.startsWith('#/') ? raw.slice(1) : raw
  const normalized = hashPath.startsWith('/') ? hashPath : '/' + hashPath

  const isLearnerModule = /^\/(?:$|catalog(?:\/|$)|course\/[^/?#]+|games(?:\/|$)|studio(?:\/|$))/.test(normalized)
  if (isLearnerModule) {
    if (window.location.hash === '#' + normalized) return
    window.location.hash = normalized
    return
  }

  window.location.assign('/#' + normalized)
}

export function openLearnerCourse(courseId) {
  if (!courseId) return
  navigateLearner('/course/' + encodeURIComponent(courseId))
}
