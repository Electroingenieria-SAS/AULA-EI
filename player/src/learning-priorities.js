/**
 * Derived from the user's existing home snapshot. No extra queries or
 * client-maintained completion records are introduced.
 */
export function learningPriorities(enrollments = [], certificates = [], now = new Date()) {
  const finished = (item) => {
    if (item.status === 'completed') return true
    return certificates.some((certificate) =>
      certificate.course_id === item.course?.id ||
      (certificate.course_title && String(certificate.course_title).trim().toLowerCase() ===
        String(item.course?.title || '').trim().toLowerCase())
    )
  }

  const dueTime = (item) => {
    if (!item.due_at) return null
    const value = new Date(item.due_at).getTime()
    return Number.isFinite(value) ? value : null
  }
  const timeNow = now.getTime()
  const pending = enrollments.filter((item) => item?.course?.id && !finished(item))
  const nearDue = pending.filter((item) => {
    const time = dueTime(item)
    return time !== null && time <= timeNow + (7 * 86400000)
  })
  const selected = [...pending].sort((a,b) => {
    const aDue = dueTime(a) ?? Number.MAX_SAFE_INTEGER
    const bDue = dueTime(b) ?? Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue
    const aProgress = a.status === 'in_progress' ? 0 : 1
    const bProgress = b.status === 'in_progress' ? 0 : 1
    return aProgress - bProgress
  })[0] || null
  return {
    pending: pending.length,
    dueSoon: nearDue.length,
    next: selected,
    nextLabel: selected?.due_at && dueTime(selected) !== null
      ? (dueTime(selected) < timeNow ? 'Requiere atención: plazo vencido' : 'Fecha límite: ' + new Date(selected.due_at).toLocaleDateString('es-CO'))
      : 'Continúa tu formación',
  }
}
