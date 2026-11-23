import { decodeAvatarSelection } from './avatar-rules.js'

export const AVATAR_WELCOME_SESSION_PREFIX = 'aula-ei-avatar-prompt:v2:'
const SAFE_ROUTES = new Set(['home', 'catalog', 'development', 'plan'])

export function avatarWelcomeStorageKey(userId) {
  return AVATAR_WELCOME_SESSION_PREFIX + String(userId || '')
}

export function shouldOfferAvatarWelcome({ userId, avatarUrl, routeType, dismissed = false } = {}) {
  return Boolean(userId && SAFE_ROUTES.has(routeType) &&
    !decodeAvatarSelection(avatarUrl) && dismissed !== true)
}

export function clearAvatarWelcomeSession(storage) {
  if (!storage) return
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index)
    if (key?.startsWith(AVATAR_WELCOME_SESSION_PREFIX)) storage.removeItem(key)
  }
}
