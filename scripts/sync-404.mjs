import { copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptsDir, '..')

await copyFile(resolve(root, 'index.html'), resolve(root, '404.html'))
console.log('404.html quedó sincronizado con index.html.')

