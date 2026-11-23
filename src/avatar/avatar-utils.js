import { assetUrl } from '../paths.js'
import { isAllowedAvatarId, isAllowedBackgroundId, decodeAvatarSelection } from './avatar-rules.js'
export { DEFAULT_AVATAR_ID, DEFAULT_BACKGROUND_ID, encodeAvatarSelection, decodeAvatarSelection, isAllowedAvatarId, isAllowedBackgroundId } from './avatar-rules.js'

export function avatarImageUrl(id) {
  return isAllowedAvatarId(id) ? assetUrl('avatars/characters/' + id.toLowerCase() + '.avif') : null
}
export function avatarBackgroundUrl(backgroundId) {
  return isAllowedBackgroundId(backgroundId) ? assetUrl('avatars/backgrounds/' + backgroundId.toLowerCase() + '.avif') : null
}
export function profileAvatarImage(avatarUrl) {
  const saved = decodeAvatarSelection(avatarUrl)
  return saved ? avatarImageUrl(saved.id) : null
}
export function profileAvatarBackground(avatarUrl) {
  const saved = decodeAvatarSelection(avatarUrl)
  return saved ? avatarBackgroundUrl(saved.backgroundId) : null
}

let catalogPromise
export function loadAvatarCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(assetUrl('avatars/catalogo.json'), { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('El catálogo de personajes no está disponible.')
        const data = await response.json()
        if (!Array.isArray(data.avatares) || data.avatares.length !== 34 || !Array.isArray(data.fondos) || data.fondos.length !== 8 ||
            data.avatares.some((avatar) => !isAllowedAvatarId(avatar.id)) ||
            data.fondos.some((bg) => !isAllowedBackgroundId(bg.id))) {
          throw new Error('El catálogo de personajes no coincide con la versión institucional aprobada.')
        }
        return data
      })
      .catch((error) => { catalogPromise = null; throw error })
  }
  return catalogPromise
}
