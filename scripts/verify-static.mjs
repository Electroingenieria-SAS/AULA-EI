import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptsDir, '..')
const errors = []
const warnings = []

const required = [
  'index.html',
  '404.html',
  '.nojekyll',
  'favicon.svg',
  'vercel.json',
  'assets/index-BZBNDslB.js',
  'assets/index-B-4jmJ6C.css',
  'brand/logo-aula-ei.png',
  'brand/logo-electroingenieria.jpg',
  'brand/certificate-sello-ei.png',
  'brand/fondo.jpg',
]

for (const file of required) {
  if (!existsSync(resolve(root, file))) errors.push(`Falta el archivo requerido: ${file}`)
}

const index = await readFile(resolve(root, 'index.html'), 'utf8')
const notFound = await readFile(resolve(root, '404.html'), 'utf8')
if (index !== notFound) errors.push('index.html y 404.html no son idénticos. Ejecuta npm run sync:404.')

const htmlRefs = new Set()
for (const match of index.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g)) htmlRefs.add(match[1])
for (const match of index.matchAll(/url\(["']?\.\/([^"')?#]+)["']?\)/g)) htmlRefs.add(match[1])

for (const ref of htmlRefs) {
  if (!existsSync(resolve(root, ref))) errors.push(`index.html referencia un archivo inexistente: ${ref}`)
}

const activeAssets = [...htmlRefs].filter((ref) => ref.startsWith('assets/'))
for (const asset of activeAssets) {
  if (!asset.endsWith('.js') && !asset.endsWith('.css')) continue
  const fullPath = resolve(root, asset)
  const content = await readFile(fullPath, 'utf8')

  if (asset.endsWith('.js')) {
    const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' })
    if (syntax.status !== 0) errors.push(`JavaScript inválido en ${asset}: ${syntax.stderr.trim()}`)
  }

  for (const match of content.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    const ref = match[1]
    if (/^(data:|https?:|#)/.test(ref)) continue
    const target = resolve(dirname(fullPath), ref)
    if (!existsSync(target)) errors.push(`${asset} referencia un archivo inexistente: ${relative(root, target)}`)
  }
}

const deployText = await Promise.all(
  ['index.html', '404.html', ...activeAssets].map((file) => readFile(resolve(root, file), 'utf8')),
)
const forbiddenSecrets = /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]+|["']service_role["']/
if (deployText.some((text) => forbiddenSecrets.test(text))) {
  errors.push('Se detectó una posible llave secreta o service_role en archivos públicos.')
}

const activeJavaScript = (
  await Promise.all(
    activeAssets
      .filter((asset) => asset.endsWith('.js'))
      .map((asset) => readFile(resolve(root, asset), 'utf8')),
  )
).join('\n')

for (const requiredDeletionContract of [
  'delete-managed-user',
  'Solo puedes eliminar usuarios con un nivel inferior al tuyo.',
  'super_admin:50',
  'admin:40',
]) {
  if (!activeJavaScript.includes(requiredDeletionContract)) {
    errors.push(`Falta el contrato de eliminación jerárquica: ${requiredDeletionContract}`)
  }
}

const assetFiles = await readdir(resolve(root, 'assets'))
const unreferencedAssets = assetFiles.filter((file) => !activeAssets.includes(`assets/${file}`))
if (unreferencedAssets.length) warnings.push(`Assets no enlazados directamente: ${unreferencedAssets.join(', ')}`)

const digest = createHash('sha256').update(index).digest('hex').slice(0, 12)

for (const warning of warnings) console.warn(`ADVERTENCIA: ${warning}`)
for (const error of errors) console.error(`ERROR: ${error}`)

if (errors.length) {
  console.error(`Verificación fallida: ${errors.length} error(es).`)
  process.exit(1)
}

console.log(`Verificación correcta. ${required.length} archivos requeridos presentes.`)
console.log(`Assets activos: ${activeAssets.join(', ')}`)
console.log(`Huella corta de index.html: ${digest}`)
