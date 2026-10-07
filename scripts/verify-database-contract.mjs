import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const migrationDir = path.join(root, 'supabase', 'migrations')
const files = (await readdir(migrationDir))
  .filter((name) => name.endsWith('.sql'))
  .sort()

const hardeningIndex = files.findIndex((name) => name.includes('20260922143000_harden_aula_rpc_surface'))
if (hardeningIndex < 0) throw new Error('No se encontró el punto de hardening de RPC de Aula EI.')

const postHardening = files.slice(hardeningIndex)
for (const file of postHardening) {
  const sql = await readFile(path.join(migrationDir, file), 'utf8')
  const normalized = sql.replace(/--.*$/gm, '').toLowerCase()

  if (/\bas\s+\$\s*(?:begin|select)/.test(normalized)) {
    throw new Error('Migración con dollar-quote SQL inválido (AS $): ' + file)
  }
  if (/disable\s+row\s+level\s+security/.test(normalized)) {
    throw new Error('Migración posterior al hardening desactiva RLS: ' + file)
  }
  if (/\bgrant\s+all(?:\s+privileges)?\s+on\s+[^;]+?\s+to\s+anon\b/.test(normalized)) {
    throw new Error('Migración posterior al hardening concede ALL a anon: ' + file)
  }
  if (/\bgrant\s+execute\s+on\s+function\s+[^;]+?\s+to\s+anon\b/.test(normalized)) {
    throw new Error('Migración posterior al hardening concede EXECUTE a anon: ' + file)
  }

  for (const match of normalized.matchAll(/security\s+definer/g)) {
    const window = normalized.slice(match.index, match.index + 700)
    if (!/set\s+search_path\s*(?:=|to)\s*(?:''|'?public'?|'?pg_catalog'?)/.test(window)) {
      throw new Error('SECURITY DEFINER posterior al hardening sin search_path cercano: ' + file)
    }
  }
}

for (const required of [
  '20260922150000_security_hardening_v3.sql',
  '20260922151000_require_live_admin_session.sql',
  '20261007193000_aula_ei_compliance_center.sql',
]) {
  if (!files.includes(required)) throw new Error('Falta migración final requerida: ' + required)
}

const complianceMigration = await readFile(path.join(migrationDir, '20261007193000_aula_ei_compliance_center.sql'), 'utf8')
for (const required of [
  'create table if not exists public.legal_documents',
  'create table if not exists public.legal_document_versions',
  'create table if not exists public.legal_acceptances',
  'create table if not exists public.privacy_requests',
  'enable row level security',
  'get_my_legal_requirements',
  'accept_legal_document',
  'get_my_legal_acceptances',
  'create_my_privacy_request',
  'admin_set_legal_user_type',
]) {
  if (!complianceMigration.toLowerCase().includes(required.toLowerCase())) {
    throw new Error('Compliance Center incompleto: falta ' + required)
  }
}

console.log('Database contract gate passed: hardening y contratos del Compliance Center presentes.')
