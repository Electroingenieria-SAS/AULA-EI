import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

// The original ZIP is intentionally NOT served to clients. This committed,
// optimized archive contains only the 34 intact character illustrations,
// their eight supplied backgrounds, and a small verified catalog.
const root = process.cwd()
const archive = path.join(root, 'avatars/media/aula-ei-avatar-assets-34.tgz')
const publicDir = path.join(root, 'public')
const digest = 'bdfad989a2dee28965a5f5005171b0ac1c580b8dabb4e23053be4b9bbbdba64f'
const body = await readFile(archive)
if (createHash('sha256').update(body).digest('hex') !== digest) {
  throw new Error('El paquete institucional de avatares no supera la verificación de integridad.')
}
const listing = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
if (listing.length !== 43 || listing.some((name) => !/^avatars\/(?:characters\/ei-[a-z0-9-]+\.avif|backgrounds\/fon-[0-9]{2}\.avif|catalogo\.json)$/.test(name))) {
  throw new Error('El paquete de personajes contiene rutas inesperadas o archivos faltantes.')
}
await mkdir(publicDir, { recursive: true })
execFileSync('tar', ['-xzf', archive, '-C', publicDir], { stdio: 'ignore' })
const catalog = JSON.parse(await readFile(path.join(publicDir, 'avatars/catalogo.json'), 'utf8'))
if (catalog.avatares?.length !== 34 || catalog.fondos?.length !== 8 ||
    new Set(catalog.avatares.map((item) => item.id)).size !== 34) {
  throw new Error('El catálogo debe contener 34 personajes originales y 8 fondos.')
}
function verifyAvifDimension(contents, expected, name) {
  const marker = contents.indexOf(Buffer.from('ispe'))
  if (marker < 4 || marker + 16 > contents.length) throw new Error('Cabecera AVIF inválida: ' + name)
  const width = contents.readUInt32BE(marker + 8)
  const height = contents.readUInt32BE(marker + 12)
  if (width !== expected || height !== expected) {
    throw new Error('Resolución insuficiente en ' + name + ': ' + width + '×' + height)
  }
}
for (const person of catalog.avatares) {
  if (!/^EI-(LOGISTICO|CONTRATISTA|ANALISTA|LIDER|JEFE)-[MF]-\d{2}$/.test(person.id)) {
    throw new Error('ID no autorizado en catálogo: ' + person.id)
  }
  const filename = path.join(publicDir, 'avatars/characters', person.id.toLowerCase() + '.avif')
  verifyAvifDimension(await readFile(filename), 768, person.id)
}
for (const background of catalog.fondos) {
  const filename = path.join(publicDir, 'avatars/backgrounds', background.id.toLowerCase() + '.avif')
  verifyAvifDimension(await readFile(filename), 960, background.id)
}
console.log('Aula EI: 34 avatares 768px y 8 fondos 960px, calidad alta y SHA-256 verificado.')
