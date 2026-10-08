const STATUS = {
  overdue: { label: 'Vencida', priority: 0 },
  due: { label: 'Por vencer', priority: 1 },
  active: { label: 'En curso', priority: 2 },
  scheduled: { label: 'Programada', priority: 3 },
  pending: { label: 'Sin fecha', priority: 4 },
  locked: { label: 'Ruta bloqueada', priority: 5 },
  complete: { label: 'Completada', priority: 6 },
}

/**
 * Pure read-only projection of buildDevelopmentSnapshot. Course assignment is
 * NOT authorization: the official course player validates course-route access.
 * A locked requirement always takes precedence over a recommendation link.
 */
export function buildTrainingPlan(development = {}) {
  const paths = Array.isArray(development.paths) ? development.paths : []
  const assignments = Array.isArray(development.assignments) ? development.assignments : []
  const locked = new Set(paths.filter((path) => path.required).flatMap((path) =>
    (path.courses || []).filter((step) => !step.completed && !step.unlocked)
      .map((step) => String(step.course_id))))
  const pathNames = new Map()
  for (const path of paths) {
    for (const step of path.courses || []) {
      const id = String(step.course_id || '')
      if (!id) continue
      const names = pathNames.get(id) || []
      if (!names.includes(path.name)) names.push(path.name)
      pathNames.set(id, names)
    }
  }
  const items = assignments.filter((entry) => entry?.course?.id).map((entry) => {
    const id = String(entry.course.id)
    const complete = Boolean(entry.complete)
    const blocked = !complete && locked.has(id)
    const type = complete ? 'complete' : blocked ? 'locked' :
      entry.overdue ? 'overdue' : entry.dueSoon ? 'due' :
      entry.status === 'in_progress' ? 'active' :
      entry.dueTime !== null && Number.isFinite(entry.dueTime) ? 'scheduled' : 'pending'
    return {
      id,
      title: String(entry.course.title || 'Capacitación asignada'),
      type, label: STATUS[type].label, priority: STATUS[type].priority,
      dueAt: Number.isFinite(entry.dueTime) ? entry.dueTime : null,
      openable: !complete && !blocked, pathNames: pathNames.get(id) || [],
      reason: type === 'locked' ? 'Completa primero los requisitos de tu ruta institucional.' :
        type === 'overdue' ? 'La fecha límite de esta capacitación ya pasó.' :
        type === 'due' ? 'La fecha límite está dentro de los próximos siete días.' :
        type === 'active' ? 'Ya comenzaste esta capacitación. Continúa donde quedaste.' :
        type === 'scheduled' ? 'Organiza tu tiempo antes de la fecha límite.' :
        type === 'pending' ? 'Asignada sin una fecha límite registrada.' :
        'Esta capacitación ya figura como cumplida.',
    }
  }).sort((a, b) => a.priority - b.priority ||
    ((a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)) ||
    a.title.localeCompare(b.title, 'es'))

  const pending = items.filter((item) => item.type !== 'complete')
  const actionable = pending.filter((item) => item.openable)
  return {
    items, next: actionable[0] || null,
    counts: {
      total: items.length,
      complete: items.length - pending.length,
      pending: pending.length,
      attention: pending.filter((item) => item.type === 'overdue' || item.type === 'due').length,
      blocked: pending.filter((item) => item.type === 'locked').length,
      active: pending.filter((item) => item.type === 'active').length,
    },
  }
}

export function filterTrainingPlan(items, filter = 'all') {
  if (!Array.isArray(items)) return []
  const groups = {
    all: () => true,
    attention: (item) => item.type === 'overdue' || item.type === 'due',
    active: (item) => item.type === 'active',
    pending: (item) => ['scheduled','pending'].includes(item.type),
    locked: (item) => item.type === 'locked',
    complete: (item) => item.type === 'complete',
  }
  return items.filter(groups[filter] || groups.all)
}
