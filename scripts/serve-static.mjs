import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptsDir, '..')
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4173)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function safePath(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html'
  const candidate = resolve(root, relative)
  return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null
}

async function resolveFile(pathname) {
  const candidate = safePath(pathname)
  if (!candidate) return { status: 403, file: null }

  try {
    const info = await stat(candidate)
    if (info.isFile()) return { status: 200, file: candidate }
    if (info.isDirectory()) return { status: 200, file: resolve(candidate, 'index.html') }
  } catch {
    // Las rutas internas de la SPA usan 404.html como respaldo.
  }

  return { status: 200, file: resolve(root, '404.html') }
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const result = await resolveFile(url.pathname)

  if (!result.file) {
    response.writeHead(result.status)
    response.end('Ruta no permitida.')
    return
  }

  const type = contentTypes[extname(result.file).toLowerCase()] || 'application/octet-stream'
  const cache = type.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600'
  response.writeHead(result.status, { 'Content-Type': type, 'Cache-Control': cache })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  createReadStream(result.file).pipe(response)
})

server.listen(port, host, () => {
  console.log(`Aula EI disponible en http://${host}:${port}`)
  console.log('Presiona Ctrl+C para detener el servidor.')
})

