import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const clientRoots = ['src','player/src','studio/src','certificate/src']

async function walk(dir) {
  const output = []
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name).replaceAll('\\','/')
    if (entry.isDirectory()) output.push(...await walk(relative))
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) output.push(relative)
  }
  return output
}

const files = []
for (const dir of clientRoots) files.push(...await walk(dir))
const source = new Map()
for (const file of files) source.set(file, await readFile(path.join(root,file),'utf8'))

const forbiddenSecretPatterns = [
  /sb_secret_[A-Za-z0-9_-]+/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+/,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{20,}/,
]

for (const [file, content] of source) {
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(content)) throw new Error('Posible secreto privilegiado expuesto en código cliente: ' + file)
  }
  if (content.includes('.auth.signUp(') || content.includes('.auth.signInAnonymously(')) {
    throw new Error('Aula EI no debe habilitar auto-registro/usuarios anónimos desde el cliente: ' + file)
  }
}

const app = source.get('src/App.jsx') || ''
if (!app.includes('AdminMfaGate')) throw new Error('AdminMfaGate debe proteger la aplicación administrativa.')
if (!app.includes('password.length < 12')) throw new Error('La contraseña inicial debe exigir mínimo 12 caracteres.')

const mfa = source.get('src/AdminMfaGate.jsx') || ''
for (const required of [
  'getAuthenticatorAssuranceLevel',
  'mfa.enroll',
  'mfa.challenge',
  'mfa.verify',
  "currentLevel !== 'aal2'",
]) {
  if (!mfa.includes(required)) throw new Error('MFA incompleto: falta ' + required)
}

const vercel = JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'))
if (vercel.git?.deploymentEnabled !== false) {
  throw new Error('Vercel Git deployments deben permanecer deshabilitados; GitHub Actions es la ruta de despliegue.')
}

const migration = await readFile(path.join(root,'supabase/migrations/20260922150000_security_hardening_v3.sql'),'utf8')
for (const required of [
  'aula_is_aal2',
  'consume_aula_security_rate_limit',
  'audit_aula_sensitive_mutation',
  'revoke all on function public.consume_aula_security_rate_limit',
]) {
  if (!migration.includes(required)) throw new Error('Migración Security v3 incompleta: falta ' + required)
}

const liveSessionMigration = await readFile(path.join(root,'supabase/migrations/20260922151000_require_live_admin_session.sql'),'utf8')
for (const required of ['validate_aula_admin_session','auth.sessions','auth.mfa_factors']) {
  if (!liveSessionMigration.includes(required)) throw new Error('Security v3.1 incompleta: falta ' + required)
}

for (const edgePath of [
  'supabase/functions/create-managed-user/index.ts',
  'supabase/functions/delete-managed-user/index.ts',
  'supabase/functions/complete-password-change/index.ts',
  'supabase/functions/reset-managed-user-password/index.ts',
]) {
  const content = await readFile(path.join(root,edgePath),'utf8')
  if (!content.includes('consumeRateLimit')) throw new Error('Rate limit faltante en ' + edgePath)
}
for (const edgePath of [
  'supabase/functions/create-managed-user/index.ts',
  'supabase/functions/delete-managed-user/index.ts',
  'supabase/functions/reset-managed-user-password/index.ts',
]) {
  const content = await readFile(path.join(root,edgePath),'utf8')
  if (!content.includes('validateLiveAdminSession')) throw new Error('Validación de sesión administrativa viva faltante en ' + edgePath)
}

for (const edgePath of [
  'supabase/functions/create-managed-user/index.ts',
  'supabase/functions/complete-password-change/index.ts',
  'supabase/functions/reset-managed-user-password/index.ts',
]) {
  const content = await readFile(path.join(root,edgePath),'utf8')
  if (!content.includes('pwnedPasswordCount')) throw new Error('Comprobación HIBP faltante en ' + edgePath)
  if (!content.includes('length < 12')) throw new Error('Política de 12 caracteres faltante en ' + edgePath)
}

const resetPasswordEdge = await readFile(path.join(root,'supabase/functions/reset-managed-user-password/index.ts'),'utf8')
for (const required of ['updateUserById','aula_ei_must_change_password: true','reset_managed_user_password','ROLE_RANK']) {
  if (!resetPasswordEdge.includes(required)) throw new Error('Restablecimiento administrativo inseguro o incompleto: falta ' + required)
}

console.log('Security v3.2 validada: MFA AAL2, sesión administrativa viva, secretos, contraseñas, restablecimiento seguro, rate limits, auditoría y deploy.')
