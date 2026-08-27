import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'dist')

const excluded = new Set([
  '.git',
  '.github',
  '.vercel',
  'dist',
  'node_modules',
  'legacy',
  'scripts',
])

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue
  await cp(path.join(root, entry.name), path.join(out, entry.name), { recursive: true })
}

const assetsDir = path.join(out, 'assets')
const bundles = (await readdir(assetsDir)).filter((name) => /^index-.*\.js$/.test(name))
if (bundles.length !== 1) {
  throw new Error(`Se esperaba exactamente un bundle index-*.js y se encontraron ${bundles.length}.`)
}

const bundlePath = path.join(assetsDir, bundles[0])
let bundle = await readFile(bundlePath, 'utf8')

const oldAuthListener = 're.auth.onAuthStateChange(async(w,C)=>{r(C),m(null),C?.user?await g(C.user.id,C.user).catch(A=>{console.warn("Aula EI: error al actualizar perfil.",A),o(Rc(C.user)),m(jl(A,"No fue posible actualizar el perfil. Se usó perfil temporal."))}):o(null),f(!1)})'
const newAuthListener = 're.auth.onAuthStateChange((w,C)=>{r(C),m(null),C?.user?setTimeout(()=>{v&&g(C.user.id,C.user).catch(A=>{console.warn("Aula EI: error al actualizar perfil.",A),o(Rc(C.user)),m(jl(A,"No fue posible actualizar el perfil. Se usó perfil temporal."))})},0):o(null),f(!1)})'

const authListenerMatches = bundle.split(oldAuthListener).length - 1
if (authListenerMatches !== 1) {
  throw new Error(`No se pudo aplicar el parche de autenticación de Aula EI: coincidencias=${authListenerMatches}. El bundle cambió y requiere revisión.`)
}
bundle = bundle.replace(oldAuthListener, newAuthListener)

const unsafeFallback = 'role:ry(n.user_metadata?.managed_role)'
const safeFallback = 'role:ry(n.app_metadata?.aula_ei_role)'
const fallbackMatches = bundle.split(unsafeFallback).length - 1
if (fallbackMatches !== 1) {
  throw new Error(`No se pudo endurecer el rol temporal: coincidencias=${fallbackMatches}.`)
}
bundle = bundle.replace(unsafeFallback, safeFallback)

await writeFile(bundlePath, bundle, 'utf8')

const verify = await readFile(bundlePath, 'utf8')
if (verify.includes('onAuthStateChange(async(w,C)=>')) {
  throw new Error('La verificación detectó todavía un callback asíncrono de AuthContext.')
}
if (!verify.includes('onAuthStateChange((w,C)=>')) {
  throw new Error('La verificación no encontró el listener seguro de AuthContext.')
}
if (verify.includes(unsafeFallback)) {
  throw new Error('La verificación detectó autorización temporal basada en user_metadata.')
}

console.log(`Aula EI: build seguro generado en dist/ (${bundles[0]}).`)
console.log('Aula EI: listener de onAuthStateChange corregido para evitar bloqueo circular.')
console.log('Aula EI: fallback de rol migrado a app_metadata.')
