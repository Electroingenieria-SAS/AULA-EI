const validDate = (value) => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const clamped = (value) => Math.max(0, Math.min(100, finite(value)))
const courseKey = (value) => String(value || '').trim().toLocaleLowerCase('es')

export function matchCertificate(enrollment, certificates = []) {
  const id = enrollment?.course?.id
  const name = courseKey(enrollment?.course?.title)
  return certificates.find((item) =>
    (id && item.course_id === id) ||
    (!item.course_id && name && courseKey(item.course_title) === name)) || null
}

/** Use the existing RLS-safe home snapshot. No shadow-progress or invented credential expiry. */
export function buildDevelopmentSnapshot(snapshot = {}, now = new Date()) {
  const stamp = now.getTime()
  const enrollments = (Array.isArray(snapshot.enrollments) ? snapshot.enrollments : [])
    .filter((entry) => entry?.course?.id)
  const certificates = (Array.isArray(snapshot.certificates) ? snapshot.certificates : [])
    .filter((entry) => entry?.certificate_code)
    .sort((a, b) => (validDate(b.issued_at) || 0) - (validDate(a.issued_at) || 0))
  const profile = snapshot.training_profile || {}
  const competencies = (Array.isArray(profile.competencies) ? profile.competencies : [])
    .filter((item) => item?.id && item?.name)
    .map((item) => {
      const required = Math.max(0, finite(item.required_level))
      const achieved = Math.max(0, finite(item.achieved_level))
      return {
        ...item, required, achieved,
        gap: Math.max(0, required - achieved),
        percent: required ? clamped((achieved / required) * 100) : 100,
      }
    })
    .sort((a,b) => b.gap - a.gap || String(a.name).localeCompare(String(b.name), 'es'))
  const paths = (Array.isArray(profile.paths) ? profile.paths : [])
    .filter((path) => path?.id && path?.name)
    .map((path) => {
      const courses = (Array.isArray(path.courses) ? path.courses : [])
        .filter((course) => course?.course_id)
        .sort((a,b) => finite(a.sort_order) - finite(b.sort_order))
        .map((course) => ({
          ...course,
          status: course.completed ? 'complete' : course.unlocked ? 'available' : 'locked',
          dueTime: validDate(course.due_at),
        }))
      return {
        ...path,
        progress: clamped(path.progress_percent),
        courses,
        completeCount: courses.filter((course) => course.required && course.completed).length,
        requiredCount: courses.filter((course) => course.required).length,
        next: courses.find((course) => !course.completed && course.unlocked) || null,
      }
    })
  const assignments = enrollments.map((entry) => {
    const certificate = matchCertificate(entry, certificates)
    const complete = entry.status === 'completed' || Boolean(certificate)
    const dueTime = validDate(entry.due_at)
    const overdue = !complete && dueTime !== null && dueTime < stamp
    const dueSoon = !complete && dueTime !== null && dueTime >= stamp && dueTime <= stamp + 7 * 86400000
    return { ...entry, certificate, complete, dueTime, overdue, dueSoon }
  })
  const upcoming = assignments.filter((item) => !item.complete && item.dueTime !== null)
    .sort((a,b) => a.dueTime - b.dueTime)
  const next = upcoming[0] || assignments.find((item) => !item.complete) || null
  return {
    position: profile.position || null,
    supervisor: profile.supervisor || null,
    competencies, paths, assignments, certificates,
    next, upcoming,
    totalAssigned: assignments.length,
    completedCount: assignments.filter((item) => item.complete).length,
    pendingCount: assignments.filter((item) => !item.complete).length,
    overdueCount: assignments.filter((item) => item.overdue).length,
    dueSoonCount: assignments.filter((item) => item.dueSoon).length,
    competenciesAchieved: competencies.filter((item) => item.gap === 0).length,
  }
}
