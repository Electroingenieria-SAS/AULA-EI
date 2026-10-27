import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const load = (f) => readFile(new URL('../'+f, import.meta.url),'utf8')
const [studio,listing,certificate,sql] = await Promise.all([
load('studio/src/App.jsx'),
load('studio/src/CertificatesManager.jsx'),
load('certificate/src/CertificateApp.jsx'),
load('supabase/migrations/20261027214000_creator_certificates_read_only.sql'),
])
assert.ok(studio.includes("profile.role === 'creador_contenido'"))
assert.ok(studio.includes("canViewCertificates ? [['certificates'"))
assert.ok(studio.includes('readOnly={!canAdmin}'))
assert.ok(studio.includes("tab === 'users' && canAdmin"), 'Creator must not administer users.')
assert.ok(listing.includes("readOnly ? 'creator_certificate_ranking' : 'admin_certificate_ranking'"))
assert.ok(listing.includes("readOnly ? Promise.resolve({ data: [], error: null }) : supabase.rpc('admin_completed_without_certificate')"))
assert.ok(listing.includes("if (readOnly) return setMessage('Solo un administrador puede generar certificados.')"))
assert.ok(listing.includes("!readOnly && <button className={view === 'pending'"))
assert.ok(certificate.includes("creatorReader ? 'creator_get_certificate_by_code'"))
assert.ok(certificate.includes("creatorReader ? 'creator_get_certificate_signatures'"))
assert.ok(certificate.includes("!readOnlyCertificate && <SignatureControl"))
assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.creator_certificate_ranking()'))
assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.creator_get_certificate_by_code'))
assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.creator_get_certificate_signatures'))
assert.ok(sql.includes('SECURITY DEFINER'))
assert.ok(sql.includes('auth.uid() IS NULL'))
assert.ok(sql.includes("= 'creador_contenido'"))
assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.creator_certificate_ranking() FROM PUBLIC,anon'))
assert.ok(!sql.includes('admin_generate_certificate'))
assert.ok(!sql.includes('DISABLE ROW LEVEL SECURITY'))
console.log('Creator certificate read-only ranking, signed certificate viewer and admin restrictions: OK')
