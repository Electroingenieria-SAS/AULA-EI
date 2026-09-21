export function navigateLearner(target) {
  const raw = String(target || '')
  const hashPath = raw.startsWith('/#/') ? raw.slice(2) : raw.startsWith('#/') ? raw.slice(1) : raw
  const normalized = hashPath.startsWith('/') ? hashPath : '/' + hashPath
  if (window.location.hash === '#' + normalized) return
  window.location.hash = normalized
}

export function openLearnerCourse(courseId) {
  if (!courseId) return
  navigateLearner('/course/' + encodeURIComponent(courseId))
}
