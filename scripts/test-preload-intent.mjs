import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = file => readFile(new URL('../'+file,import.meta.url),'utf8')
const [html,auth,learner] = await Promise.all([read('index.html'),read('src/AuthVisualShell.jsx'),read('player/src/LearnerShell.jsx')])
assert.doesNotMatch(html,/rel=["']preload["'][^>]*brand\/fondo\.jpg|rel=["']preload["'][^>]*fondo/i)
assert.match(auth,/assetUrl\('brand\/fondo\.jpg'\)/)
assert.match(learner,/assetUrl\('brand\/fondo\.jpg'\)/)
assert.match(html,/rel="manifest"/)
console.log('Background preload: HTML no longer forces unused hero JPG; both authorized shells still load it.')
