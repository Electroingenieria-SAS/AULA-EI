// Never infer access rights from the visual character. No arbitrary images/URLs.
const GROUP_COUNTS = Object.freeze({
  LOGISTICO: { M: 5 },
  CONTRATISTA: { M: 5 },
  ANALISTA: { M: 5, F: 5 },
  LIDER: { M: 5, F: 3 },
  JEFE: { M: 3, F: 3 },
})
export const DEFAULT_AVATAR_ID = 'EI-ANALISTA-M-01'
export const DEFAULT_BACKGROUND_ID = 'FON-07'
export const AVATAR_PREFIX = 'aula-ei-avatar:'

export function isAllowedAvatarId(value) {
  const result = /^EI-(LOGISTICO|CONTRATISTA|ANALISTA|LIDER|JEFE)-([MF])-(\d{2})$/.exec(String(value || ''))
  if (!result) return false
  return Number(result[3]) >= 1 && Number(result[3]) <= (GROUP_COUNTS[result[1]]?.[result[2]] || 0)
}
export function isAllowedBackgroundId(value) {
  return /^FON-0[1-8]$/.test(String(value || ''))
}
export function encodeAvatarSelection(id, backgroundId = DEFAULT_BACKGROUND_ID) {
  if (!isAllowedAvatarId(id) || !isAllowedBackgroundId(backgroundId)) return null
  return AVATAR_PREFIX + id + ':' + backgroundId
}
export function decodeAvatarSelection(avatarUrl) {
  if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith(AVATAR_PREFIX)) return null
  const fields = avatarUrl.slice(AVATAR_PREFIX.length).split(':')
  if (fields.length !== 2 || !isAllowedAvatarId(fields[0]) || !isAllowedBackgroundId(fields[1])) return null
  return { id: fields[0], backgroundId: fields[1] }
}
