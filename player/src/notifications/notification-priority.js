const DAY = 86400000
const parseTime = (value) => {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

/** No writes, subscriptions or extra requests: prioritize the existing RLS-filtered alerts. */
export function notificationUrgency(item, now = Date.now()) {
  if (!item || item.read_at || (!item.course_id && !item.path_id)) return null
  const due = parseTime(item.due_at)
  if (due === null) return null
  if (due < now) return 'overdue'
  if (due <= now + 7 * DAY) return 'due'
  return null
}

export function organizeTrainingNotifications(input, filter = 'all', now = Date.now()) {
  const items = Array.isArray(input) ? input : []
  const urgent = items.filter((item) => notificationUrgency(item, now))
  const unread = items.filter((item) => !item.read_at)
  const sorted = items.map((item, index) => ({ item, index })).sort((a, b) => {
    const score = (item) => {
      const urgency = notificationUrgency(item, now)
      return urgency === 'overdue' ? 0 : urgency === 'due' ? 1 : !item.read_at ? 2 : 3
    }
    const d = score(a.item) - score(b.item)
    if (d) return d
    const t = (parseTime(b.item.created_at) || 0) - (parseTime(a.item.created_at) || 0)
    return t || a.index - b.index
  }).map((entry) => entry.item)
  return {
    counts: { total: items.length, unread: unread.length, priority: urgent.length },
    items: sorted.filter((item) => filter === 'unread' ? !item.read_at :
      filter === 'priority' ? Boolean(notificationUrgency(item, now)) : true),
  }
}

export function notificationDestination(item) {
  if (!item) return null
  if (item.course_id) return '/course/' + encodeURIComponent(String(item.course_id))
  if (item.path_id) return '/plan'
  return null
}
