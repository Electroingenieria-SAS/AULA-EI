import { supabase } from '../supabase.js'
import { encodeAvatarSelection, isAllowedAvatarId, isAllowedBackgroundId } from './avatar-utils.js'

export async function saveMyAvatar(avatarId, backgroundId) {
  if (!isAllowedAvatarId(avatarId) || !isAllowedBackgroundId(backgroundId)) {
    throw new Error('La combinación seleccionada no pertenece al catálogo de Aula EI.')
  }
  const { data, error } = await supabase.rpc('set_my_aula_avatar', {
    p_avatar_id: avatarId,
    p_background_id: backgroundId,
  })
  if (error) {
    if (!navigator.onLine) throw new Error('Sin conexión. Conéctate a internet para guardar tu personaje.')
    throw new Error('No se pudo guardar tu personaje. Comprueba tu sesión e inténtalo nuevamente.')
  }
  const expected = encodeAvatarSelection(avatarId, backgroundId)
  if (data !== expected) throw new Error('El servidor no confirmó la identidad visual seleccionada.')
  return data
}
