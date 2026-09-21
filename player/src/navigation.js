export function navigateLearner(target) {
  const raw = String(target || '')
  const hashPath = raw.startsWith('/#/') ? raw.slice(2) : raw.startsWith('#/') ? raw.slice(1) : raw
  const normalized = hashPath.startsWith('/') ? hashPath : '/' + hashPath

  // Catalog and course share the learner bundle and can change instantly.
  if (/^\/(?:catalog(?:\/|$)|course\/[^/?#]+)/.test(normalized)) {
    if (window.location.hash === '#' + normalized) return
    window.location.hash = normalized
    return
  }

  // Home, games and studio belong to other application bundles. Reloading
  // through the bootstrap is intentional so those modules mount correctly.
  window.location.assign('/#' + normalized)
}

export function openLearnerCourse(courseId) {
  if (!courseId) return
  navigateLearner('/course/' + encodeURIComponent(courseId))
}
