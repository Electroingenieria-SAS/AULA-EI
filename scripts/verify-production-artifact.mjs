import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

if (!await exists(dist)) throw new Error('dist/ no existe; ejecuta vite build antes del gate de artefacto.')
for (const required of ['index.html','manifest.webmanifest','sw.js']) {
  if (!await exists(path.join(dist, required))) throw new Error('Artefacto de producción incompleto: falta ' + required)
}

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(full))
    else out.push(full)
  }
  return out
}

const files = await walk(dist)
const textFiles = files.filter((file) => /\.(?:html|js|css|json|webmanifest|svg)$/i.test(file))
const forbidden = [
  /sb_secret_[A-Za-z0-9_-]+/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/,
  /SERVICE_ROLE_KEY\s*[:=]/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
]

for (const file of textFiles) {
  const content = await readFile(file, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error('Secreto privilegiado encontrado en artefacto: ' + path.relative(root, file))
  }
}

const html = await readFile(path.join(dist,'index.html'),'utf8')
if (!html.includes('Content-Security-Policy')) throw new Error('index.html de producción perdió la CSP.')
if (!html.includes("object-src 'none'")) throw new Error('CSP de producción debe bloquear object-src.')
if (!html.includes("base-uri 'self'")) throw new Error('CSP de producción debe limitar base-uri.')

console.log('Production artifact gate passed: dist completo, CSP presente y sin secretos privilegiados.')
