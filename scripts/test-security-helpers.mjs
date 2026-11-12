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
const { getPasswordChangeError } = await import('../src/auth/password-change-errors.js')
const functionError = (status, payload) => ({
  message: 'Edge Function returned a non-2xx status code',
  context: new Response(payload === null ? '' : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }),
})

assert.equal(
  await getPasswordChangeError(functionError(400, { ok: false, code: 'PWNED_PASSWORD',
    error: 'Esa contraseña aparece en filtraciones conocidas. Usa una contraseña diferente.' })),
  'Esa contraseña aparece en filtraciones conocidas. Usa una contraseña diferente.',
  'Debe mostrar el rechazo concreto del servidor, no el error genérico',
)
assert.match(await getPasswordChangeError(functionError(400, null)), /No se aceptó la contraseña/)
assert.match(await getPasswordChangeError(functionError(401, { error: 'Sesión inválida.' })), /Cierra sesión/)
assert.match(await getPasswordChangeError(functionError(403, { error: 'Rol no sincronizado.' })), /administrador/)
assert.match(await getPasswordChangeError(functionError(429, { code: 'RATE_LIMITED' })), /15 minutos/)
assert.match(await getPasswordChangeError(functionError(503, { code: 'PASSWORD_REPUTATION_UNAVAILABLE' })), /verificar la seguridad/)
assert.doesNotMatch(await getPasswordChangeError(functionError(500, { error: 'INTERNAL_SERVICE_SECRET' })), /INTERNAL_SERVICE_SECRET/,
  'No exponer información del servidor al usuario')
assert.equal(await getPasswordChangeError({ message: 'Network error' }), 'Network error')
assert.doesNotMatch(await getPasswordChangeError({ message: 'Edge Function returned a non-2xx status code' }), /non-2xx/i)

const authUi = readFileSync(new URL('../src/auth/AuthScreens.jsx', import.meta.url), 'utf8')
assert.equal((authUi.match(/await getPasswordChangeError/g) || []).length, 2,
  'El primer cambio y la recuperación deben mostrar el motivo de error')
assert.match(authUi, /validatePasswordPolicy\(password, profile\?\.email\)/,
  'Evitar intentos desperdiciados al incluir el nombre de usuario del correo')
assert.match(authUi, /Cerrar sesión e ingresar nuevamente/,
  'La sesión vencida debe ofrecer una salida clara')

// Regression: show the exact unmet requirement before sending an Edge Function
// request. These are synthetic strings, never real user passwords.
const { getPasswordPolicyChecks, validatePasswordPolicy } = await import('../src/auth/password-policy.js')
assert.match(validatePasswordPolicy('Aa123!'), /12 caracteres/)
assert.match(validatePasswordPolicy('abcdefghi12!'), /mayúscula/)
assert.match(validatePasswordPolicy('ABCDEFGHI12!'), /minúscula/)
assert.match(validatePasswordPolicy('Abcdefghijk!'), /número/)
assert.match(validatePasswordPolicy('Abcdefghij12'), /símbolo/)
assert.match(validatePasswordPolicy('Abcdefghij1 !'), /espacios/)
assert.match(validatePasswordPolicy('Abcdefghij1!correo', 'correo@ei.com.co'), /usuario/)
assert.match(validatePasswordPolicy('Ábcdefghijk1!'), /mayúscula/,
  'An accented uppercase letter does not satisfy the current server A-Z rule.')
assert.equal(validatePasswordPolicy('ClaveSegura2026!'), '')
assert.equal(getPasswordPolicyChecks('ClaveSegura2026!').every(rule => rule.valid), true)
assert.equal(getPasswordPolicyChecks('Abcdefghij12').find(rule => rule.id === 'symbol')?.valid, false)
assert.match(authUi, /<PasswordRequirements password=\{newPassword\} email=\{email\}/)
assert.match(authUi, /<PasswordRequirements password=\{password\} email=\{profile\?\.email\}/)
assert.match(authUi, /setSessionExpired\(false\)/)

// The mandatory-password and OTP recovery forms must expose a read-only,
// non-focusable username hint to password managers (not a hidden-type input).
assert.equal((authUi.match(/className="auth-username-autofill"/g) || []).length, 2,
  'Both password forms must provide the username for browser password managers.')
assert.equal((authUi.match(/name="username" autoComplete="username"/g) || []).length, 2)
assert.match(authUi, /readOnly value=\{email\.trim\(\)\}/,
  'The recovery form username must be the email being recovered.')
assert.match(authUi, /readOnly value=\{profile\?\.email \|\| ''\}/,
  'The first-password-change username must come from the validated profile.')
const authStyle = readFileSync(new URL('../src/auth.css', import.meta.url), 'utf8')
assert.match(authStyle, /\.password-grid input\.auth-username-autofill\{/,
  'Do not change the appearance of the first-password form.')
assert.match(authStyle, /clip-path:inset\(50%\)/,
  'Browser username hints must remain visually hidden.')
const appUi = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(appUi, /preloadLearnerBackground|data-aula-ei-background-preload/,
  'Do not preload the learner background before the browser needs it.')

console.log('Security helpers, managed-user rate limit and error responses passed.')
