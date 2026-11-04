// Pure course data and presentation helpers, separate from the interactive player.
export function normalizeCourse(course) {
  return {
    ...course,
    phases: [...(course.phases || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((phase) => ({
        ...phase,
        blocks: [...(phase.blocks || [])]
          .filter((block) => block.status !== 'draft')
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      })),
  }
}

export function flattenBlocks(course) {
  return (course?.phases || []).flatMap((phase) => phase.blocks || [])
}

export function seededIndex(seed, length) {
  if (!length) return 0
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0
  return Math.abs(hash) % length
}

export function practiceStorageKey(userId,courseId) {
  return 'aula-ei:practice:v2:' + userId + ':' + courseId
}

export function dateLabel(value) {
  if (!value) return 'Sin vencimiento'
  try { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return String(value) }
}
