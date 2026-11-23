import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  DEFAULT_AVATAR_ID, DEFAULT_BACKGROUND_ID, isAllowedAvatarId,
  isAllowedBackgroundId, encodeAvatarSelection, decodeAvatarSelection,
} from '../src/avatar/avatar-rules.js'

const read = (file) => readFile(path.join(process.cwd(), file), 'utf8')
const catalog = JSON.parse(await read('public/avatars/catalogo.json'))
const ids = catalog.avatares.map((item) => item.id)
assert.equal(ids.length, 34)
assert.equal(new Set(ids).size, 34)
assert.equal(catalog.fondos.length, 8)
assert.equal(new Set(catalog.fondos.map((item) => item.id)).size, 8)
assert.ok(ids.every(isAllowedAvatarId))
assert.ok(catalog.fondos.every((bg) => isAllowedBackgroundId(bg.id)))
assert.deepEqual(ids.filter((id) => /EI-LOGISTICO-F-|EI-CONTRATISTA-F-/.test(id)), [])
assert.equal(ids.filter((id) => id.startsWith('EI-JEFE-F-')).length, 3)
assert.equal(ids.filter((id) => id.startsWith('EI-JEFE-M-')).length, 3)
assert.equal(ids.filter((id) => id.startsWith('EI-LIDER-F-')).length, 3)
assert.equal(ids.filter((id) => id.startsWith('EI-ANALISTA-F-')).length, 5)
for (const id of ids) {
  const file = path.join(process.cwd(), 'public/avatars/characters', id.toLowerCase() + '.avif')
  assert.ok((await stat(file)).size > 1500, id + ' debe tener imagen completa real')
  const header = await readFile(file)
  assert.equal(header.toString('ascii', 4, 12).includes('ftypavif'), true, id)
}
for (const bg of catalog.fondos) {
  const file = path.join(process.cwd(), 'public/avatars/backgrounds', bg.id.toLowerCase() + '.avif')
  assert.ok((await stat(file)).size > 1500)
}
assert.ok(isAllowedAvatarId(DEFAULT_AVATAR_ID))
assert.ok(isAllowedBackgroundId(DEFAULT_BACKGROUND_ID))
assert.ok(!isAllowedAvatarId('EI-JEFE-F-04'))
assert.ok(!isAllowedAvatarId('EI-LOGISTICO-F-01'))
assert.ok(!isAllowedAvatarId('EI-CONTRATISTA-F-01'))
assert.ok(!isAllowedAvatarId('EI-JEFE-M-05'))
assert.ok(!isAllowedAvatarId('https://example.com/avatar.png'))
assert.ok(!isAllowedAvatarId('EI-JEFE-M-01;DROP TABLE'))
assert.ok(!isAllowedBackgroundId('FON-09'))
assert.ok(!isAllowedBackgroundId('javascript:alert(1)'))
for (const id of ids) for (const bg of catalog.fondos) {
  const value = encodeAvatarSelection(id, bg.id)
  assert.deepEqual(decodeAvatarSelection(value), { id, backgroundId: bg.id })
}
assert.equal(decodeAvatarSelection('https://other-site/user-avatar.png'), null)
assert.equal(decodeAvatarSelection('aula-ei-avatar:EI-JEFE-M-04:FON-01'), null)
assert.equal(decodeAvatarSelection('aula-ei-avatar:EI-JEFE-M-01:FON-99'), null)

const migration = await read('supabase/migrations/20261123160000_self_service_avatar_catalog.sql')
const createAvatar = await read('player/src/avatar/AvatarStudio.jsx')
const welcome = await read('player/src/avatar/AvatarWelcome.jsx')
const app = await read('src/App.jsx')
const learner = await read('player/src/LearnerApp.jsx')
const shell = await read('player/src/LearnerShell.jsx')
const pwa = await read('public/sw.js')
for (const id of ids) assert.ok(migration.includes("'" + id + "'"), 'Falta ID en validación SQL: ' + id)
for (const bg of catalog.fondos) assert.ok(migration.includes("'" + bg.id + "'"), 'Falta fondo en SQL: ' + bg.id)
assert.match(migration, /auth\.uid\(\) is null or not public\.is_aula_active\(\)/)
assert.match(migration, /where id=auth\.uid\(\) and is_active=true/)
assert.match(migration, /set avatar_url=v_avatar_url/)
assert.match(migration, /revoke all on function public\.set_my_aula_avatar\(text,text\) from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.set_my_aula_avatar\(text,text\) to authenticated/)
assert.doesNotMatch(migration, /grant update on public\.profiles/i)
assert.match(createAvatar, /saveMyAvatar\(finalId, backgroundId\)/)
assert.match(createAvatar, /variants\.map\(/)
assert.match(createAvatar, /prefers-reduced-motion|useEffect/)
assert.match(welcome, /¡Crea tu avatar!/)
assert.match(welcome, /Ahora no/)
assert.match(app, /onAvatarChange/)
assert.match(learner, /sessionStorage/)
assert.match(learner, /route\.type !== 'course'/)
assert.match(learner, /'avatar'/)
assert.match(shell, /AvatarBadge/)
assert.match(pwa, /staleWhileRevalidate/)
console.log('Editor de avatares: 34 imágenes reales, 8 fondos, validación, selección, guardado, sesión y PWA verificados.')
