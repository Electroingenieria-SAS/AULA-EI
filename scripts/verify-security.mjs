import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const clientRoots = ['src','player/src','studio/src','certificate/src']
const workflowRoot = path.join(root,'.github','workflows')

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
const authScreens = source.get('src/auth/AuthScreens.jsx') || ''
if (!app.includes('AdminMfaGate')) throw new Error('AdminMfaGate debe proteger la aplicación administrativa.')
if (!authScreens.includes('password.length < 12')) throw new Error('La contraseña inicial debe exigir mínimo 12 caracteres.')

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

const recoveryTemplate = await readFile(path.join(root,'supabase/templates/recovery-otp.html'),'utf8')
for (const required of ['{{ .Token }}','código','Aula EI']) {
  if (!recoveryTemplate.includes(required)) throw new Error('Plantilla OTP de recuperación incompleta: falta ' + required)
}
for (const required of ['resetPasswordForEmail','verifyOtp',"type: 'recovery'","reason: 'recovery'"]) {
  if (!authScreens.includes(required)) throw new Error('Flujo de recuperación por OTP incompleto: falta ' + required)
}

const completePasswordEdge = await readFile(path.join(root,'supabase/functions/complete-password-change/index.ts'),'utf8')
for (const required of ['complete_password_recovery','change_reason','reason === "recovery"']) {
  if (!completePasswordEdge.includes(required)) throw new Error('Auditoría de recuperación incompleta: falta ' + required)
}


const gitignore = await readFile(path.join(root,'.gitignore'),'utf8')
for (const required of ['node_modules/','dist/','.env','.env.*','*.key']) {
  if (!gitignore.includes(required)) throw new Error('.gitignore incompleto para producción: falta ' + required)
}

const mainEntry = await readFile(path.join(root,'src/main.jsx'),'utf8')
if (!mainEntry.includes('AppErrorBoundary')) throw new Error('La aplicación debe tener un ErrorBoundary global de producción.')
if (!mainEntry.includes('installRuntimeDiagnostics')) throw new Error('La aplicación debe instalar diagnósticos locales de runtime.')

const runtimeDiagnostics = await readFile(path.join(root,'src/runtime-diagnostics.js'),'utf8')
for (const required of ['MAX_EVENTS = 20','VITE_RELEASE_SHA','unhandledrejection','window-error','email-redacted','jwt-redacted','secret-redacted']) {
  if (!runtimeDiagnostics.includes(required)) throw new Error('Diagnóstico de runtime incompleto: falta ' + required)
}
if (/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/.test(runtimeDiagnostics)) {
  throw new Error('Los diagnósticos locales no deben enviar datos a servicios externos.')
}

const courseContent = await readFile(path.join(root,'player/src/course-player/CourseContentViews.jsx'),'utf8')
if (!courseContent.includes("const originalUrl = externalUrl ? safeExternalUrl(externalUrl) : assetUrl")) {
  throw new Error('Las URLs originales de contenido externo deben pasar por safeExternalUrl().')
}

const workflowFiles = (await readdir(workflowRoot)).filter((name) => /\.ya?ml$/i.test(name))
for (const workflowFile of workflowFiles) {
  const workflow = await readFile(path.join(workflowRoot,workflowFile),'utf8')
  for (const match of workflow.matchAll(/uses:\s*[^@\s]+@([^\s]+)/g)) {
    if (!/^[0-9a-f]{40}$/i.test(match[1])) {
      throw new Error('GitHub Action sin pin SHA en ' + workflowFile + ': ' + match[0])
    }
  }
}

const deployWorkflow = await readFile(path.join(workflowRoot,'deploy-pages.yml'),'utf8')
for (const required of [
  'Verify production push came from merged PR',
  'pull-requests: read',
  'pages: write',
  'id-token: write',
  'VITE_RELEASE_SHA: ${{ github.sha }}',
]) {
  if (!deployWorkflow.includes(required)) throw new Error('Workflow de producción sin hardening: falta ' + required)
}
if (/^permissions:\s*\n\s+contents:\s*read\s*\n\s+pages:\s*write/m.test(deployWorkflow)) {
  throw new Error('Los permisos de Pages no deben ser globales; deben limitarse al job deploy.')
}

for (const requiredPath of [
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  '.github/dependabot.yml',
  '.github/CODEOWNERS',
  'SECURITY.md',
]) {
  try { await readFile(path.join(root,requiredPath),'utf8') }
  catch { throw new Error('Hardening de repositorio incompleto: falta ' + requiredPath) }
}

for (const edgePath of [
  'supabase/functions/create-managed-user/index.ts',
  'supabase/functions/delete-managed-user/index.ts',
  'supabase/functions/complete-password-change/index.ts',
  'supabase/functions/reset-managed-user-password/index.ts',
  'supabase/functions/get-my-profile/index.ts',
]) {
  const content = await readFile(path.join(root,edgePath),'utf8')
  if (!content.includes('"Cache-Control": "no-store"')) {
    throw new Error('Edge Function sin Cache-Control no-store: ' + edgePath)
  }
}

const resetPasswordEdge = await readFile(path.join(root,'supabase/functions/reset-managed-user-password/index.ts'),'utf8')
for (const required of ['updateUserById','aula_ei_must_change_password: true','reset_managed_user_password','ROLE_RANK']) {
  if (!resetPasswordEdge.includes(required)) throw new Error('Restablecimiento administrativo inseguro o incompleto: falta ' + required)
}

console.log('Security v4.1 validada: MFA AAL2, URLs seguras, ErrorBoundary, diagnóstico local privado, secretos, contraseñas, rate limits, Edge no-store, Actions pinneadas, CodeQL/Dependency Security y deploy protegido por PR.')
