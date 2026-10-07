import assert from 'node:assert/strict'

globalThis.window = { location: { origin: 'https://electroingenieria-sas.github.io' } }

const { safeExternalUrl } = await import('../src/security.js')

assert.equal(safeExternalUrl('javascript:alert(1)'), '')
assert.equal(safeExternalUrl('data:text/html,<script>alert(1)</script>'), '')
assert.equal(safeExternalUrl('file:///etc/passwd'), '')
assert.equal(safeExternalUrl('https://example.com/resource'), 'https://example.com/resource')
assert.equal(safeExternalUrl('/AULA-EI/#/login'), 'https://electroingenieria-sas.github.io/AULA-EI/#/login')
assert.equal(safeExternalUrl('#section'), '#section')

console.log('Security helper runtime tests passed.')
