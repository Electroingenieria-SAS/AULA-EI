import assert from 'node:assert/strict'

globalThis.window = { location: { origin: 'https://electroingenieria-sas.github.io' } }

const { safeExternalUrl } = await import('../src/security.js')

assert.equal(safeExternalUrl('javascript:alert(1)'), '')
assert.equal(safeExternalUrl('data:text/html,<script>alert(1)</script>'), '')
assert.equal(safeExternalUrl('file:///etc/passwd'), '')
assert.equal(safeExternalUrl('https://example.com/resource'), 'https://example.com/resource')
assert.equal(safeExternalUrl('/AULA-EI/#/login'), 'https://electroingenieria-sas.github.io/AULA-EI/#/login')
assert.equal(safeExternalUrl('#section'), '#section')

const { getManagedFunctionError } = await import('../studio/src/users/user-utils.js')
const tooMany = new Response(JSON.stringify({ok:false,code:'RATE_LIMITED',error:'Vuelve a intentarlo en 3 minutos.'}), {
  status:429, headers:{'Content-Type':'application/json'},
})
assert.equal(await getManagedFunctionError({message:'Edge Function returned a non-2xx status code',context:tooMany}), 'Vuelve a intentarlo en 3 minutos.')
assert.equal(await getManagedFunctionError({message:'Edge Function returned a non-2xx status code',context:new Response('',{status:429})}), 'Demasiados intentos. Espera unos minutos antes de volver a crear usuarios.')
assert.equal(await getManagedFunctionError({message:'Network connection failed'}), 'Network connection failed')
assert.equal(await getManagedFunctionError({message:'Edge Function returned a non-2xx status code'}), 'No fue posible completar la operación.')

const { readFileSync } = await import('node:fs')
const edge = readFileSync(new URL('../supabase/functions/create-managed-user/index.ts',import.meta.url),'utf8')
assert.match(edge,/const createLimit = 30;/,'The managed-user cap must support normal onboarding volume.')
assert.match(edge,/const createWindowSeconds = 600;/)
assert.match(edge,/claims\.aal !== "aal2"/,'MFA must remain mandatory.')
assert.match(edge,/validate_aula_admin_session/,'Verify the live MFA session.')
assert.match(edge,/RATE_LIMITED/,'Return a structured rate-limit error.')
assert.match(edge,/retry_after_seconds/,'Provide remaining time to the frontend.')
assert.match(edge,/Access-Control-Allow-Origin": "\*"/,'Both Pages and Vercel must call the same Supabase endpoint.')
assert.ok(edge.indexOf('const invalidPassword = passwordError') < edge.indexOf('consumeRateLimit(admin, "create_managed_user"'), 'Malformed input must not consume quota.')
console.log('Security helpers, managed-user rate limit and error responses passed.')
