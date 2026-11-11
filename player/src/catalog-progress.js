/**
 * Course-level progress and block-level evidence are separate concepts.
 * A certificate (or completed enrollment) is authoritative evidence of course
 * completion, even if a course editor later replaces blocks with new IDs.
 *
 * Preserve the actual block count for audit purposes: never invent block_progress.
 */
export function resolveCatalogProgress({
  requiredBlocks = [],
  completedBlockIds = new Set(),
  enrollmentStatus = '',
  hasCertificate = false,
} = {}) {
  const required = Array.isArray(requiredBlocks) ? requiredBlocks : []
  const completed = completedBlockIds instanceof Set
    ? completedBlockIds
    : new Set(Array.isArray(completedBlockIds) ? completedBlockIds : [])

  const requiredCount = required.length
  const completedCount = required.filter((block) => block?.id && completed.has(block.id)).length
  const blockPercent = requiredCount
    ? Math.round((completedCount / requiredCount) * 100)
    : 100

  const isCertified = Boolean(hasCertificate)
  const isCompleted = isCertified || enrollmentStatus === 'completed'
  return {
    progress: isCompleted ? 100 : blockPercent,
    blockProgress: blockPercent,
    requiredCount,
    completedCount,
    isCompleted,
    progressLabel: isCertified
      ? 'Certificación aprobada'
      : isCompleted
        ? 'Capacitación completada'
        : `${completedCount} de ${requiredCount} contenidos obligatorios`,
  }
}
