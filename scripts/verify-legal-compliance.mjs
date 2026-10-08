import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root=process.cwd()
const mustRead=async(file)=>readFile(path.join(root,file),'utf8')

for(const required of [
  'src/legal/LegalGate.jsx',
  'src/legal/legal-api.js',
  'player/src/PrivacyCenter.jsx',
  'studio/src/LegalComplianceManager.jsx',
  'supabase/migrations/20261007193000_aula_ei_compliance_center.sql',
  'supabase/migrations/20261007194000_seed_aula_ei_legal_documents.sql',
  'supabase/migrations/20261007200000_aula_ei_compliance_admin.sql',
  'supabase/migrations/20261007201000_aula_ei_compliance_indexes.sql',
  'supabase/migrations/20261007202000_aula_ei_compliance_audit.sql',
  'docs/legal/storage-inventory.md',
  'docs/legal/provider-matrix.md',
  'docs/legal/retention-matrix.md',
]){
  try{await mustRead(required)}catch{throw new Error('Compliance Center incompleto: falta '+required)}
}

const app=await mustRead('src/App.jsx')
if(!app.includes('LegalGate')) throw new Error('LegalGate no está integrado en App.')

const legalGate=await mustRead('src/legal/LegalGate.jsx')
for(const token of ['legal-consent-overlay','aria-modal="true"','acceptLegalDocuments','saveLocalLegalReceipt']){
  if(!legalGate.includes(token)) throw new Error('Gate legal obligatorio incompleto: falta '+token)
}

// Document experience: reading opens a separate authenticated tab; consent stays version-scoped.
const reader=await mustRead('src/legal/LegalDocumentReader.jsx')
const requirementCard=await mustRead('src/legal/LegalRequirementCard.jsx')
const legalDocument=await mustRead('src/legal/LegalDocument.jsx')
const legalCss=await mustRead('src/legal/legal.css')
const privacy=await mustRead('player/src/PrivacyCenter.jsx')
for(const token of [
  'readerId',
  'LegalDocumentReader',
  'LegalRequirementCard',
  'checked[item.versionId]',
  'acceptLegalDocuments(pending)',
]) {
  if(!legalGate.includes(token)) throw new Error('Gate documental perdió aceptación por versión o lector autenticado: '+token)
}
if(!app.includes('route.hash')) throw new Error('El cambio de ruta a lector legal debe actualizar App.')
for(const token of ["target=\"_blank\"",'rel="noopener noreferrer"','reviewed','disabled={busy || !reviewed}']) {
  if(!requirementCard.includes(token)) throw new Error('El documento debe abrirse en nueva pestaña con aceptación explícita posterior: '+token)
}
for(const token of ['getLegalBlocks(requirement)','LegalDocument requirement={requirement}','window.print()','reader-section-']) {
  if(!reader.includes(token)) throw new Error('Plantilla documental incompleta: '+token)
}
for(const token of ['getLegalBlocks','renderInline','sectionId','readingMode']) {
  if(!legalDocument.includes(token)) throw new Error('Texto vigente/encabezados del lector incompletos: '+token)
}
for(const token of ['@media print','@media(max-width:900px)','@media(max-width:560px)','.legal-reader-paper','.legal-policy-card']) {
  if(!legalCss.includes(token)) throw new Error('El diseño documental no cubre impresión, escritorio, tablet y móvil: '+token)
}
if(!privacy.includes("appUrl('/legal/read/'")||!privacy.includes('privacy-document-row')) {
  throw new Error('La biblioteca de privacidad debe abrir la versión íntegra vigente.')
}

// Administrative simulation must reuse the real consent UI without mutating receipts.
const learnerApp = await mustRead('player/src/LearnerApp.jsx')
const privacyStyles = await mustRead('player/src/styles/privacy.css')
for(const token of [
  'previewRequested',
  "'admin', 'super_admin'",
  'pending.length === 0',
  'shownDocuments = isPreview ? requirements : pending',
  'pending.length === 0 && !isPreview',
  'if (previewRequested && !isAdministrator)',
  'Simular ingreso (sin guardar)',
  'onClick={submitAcceptance}',
  'isPreview ?',
]){
  if(!legalGate.includes(token)) throw new Error('La vista previa podría alterar o eludir aceptaciones: '+token)
}
if(!learnerApp.includes('<PrivacyCenter profile={profile} />')) {
  throw new Error('La biblioteca debe recibir el rol autenticado desde el perfil validado.')
}
for(const token of ['canPreview',"'admin','super_admin'","appUrl('/legal/preview')"]){
  if(!privacy.includes(token)) throw new Error('Acceso administrativo a la demostración incompleto: '+token)
}
for(const token of ['preview = false','preview ?','disabled={busy || !reviewed}']){
  if(!requirementCard.includes(token)) throw new Error('El formulario de simulación no distingue aceptación real: '+token)
}
// The global shell link rule inherits dark text. The preview CTA needs a stronger
// local selector in every link state so the accessible white-on-blue contrast holds.
if(!/\.privacy-center a\.privacy-preview-action[,{\s]/.test(privacyStyles) ||
   !/\.privacy-center a\.privacy-preview-action:visited/.test(privacyStyles) ||
   !/\.privacy-center a\.privacy-preview-action:hover\{[^}]*color:#fff/.test(privacyStyles) ||
   !/\.privacy-center a\.privacy-preview-action[\s\S]*?color:#fff/.test(privacyStyles)) {
  throw new Error('El botón de vista previa debe mantener texto e ícono blancos sobre el fondo azul.')
}
if(!legalCss.includes('.legal-preview-notice') || !privacyStyles.includes('.privacy-admin-preview')){
  throw new Error('La simulación legal debe identificarse visualmente en escritorio y móvil.')
}

const legalApi=await mustRead('src/legal/legal-api.js')
for(const token of ['aula-ei-legal-receipt:v1:','localStorage.setItem','acceptLegalDocuments']){
  if(!legalApi.includes(token)) throw new Error('Recibo local legal incompleto: falta '+token)
}

const serviceWorker=await mustRead('public/sw.js')
if(!serviceWorker.includes("aula-ei-pwa-v8")) throw new Error('La caché PWA no fue invalidada para el consentimiento legal.')

const learner=await mustRead('player/src/LearnerApp.jsx')
if(!learner.includes("type: 'privacy'")||!learner.includes('PrivacyCenter')) throw new Error('Centro de Privacidad no está enrutado.')

const admin=await mustRead('studio/src/LegalComplianceManager.jsx')
for(const token of ['admin_list_legal_documents','admin_create_legal_document_version','admin_publish_legal_document_version','admin_list_privacy_requests']){
  if(!admin.includes(token)) throw new Error('Administración legal incompleta: falta '+token)
}

const adminSql=await mustRead('supabase/migrations/20261007200000_aula_ei_compliance_admin.sql')
for(const token of ['admin_list_legal_documents','admin_create_legal_document_version','admin_publish_legal_document_version','admin_list_privacy_requests','admin_resolve_privacy_request','admin_create_privacy_incident']){
  if(!adminSql.includes(token)) throw new Error('RPC administrativa legal faltante: '+token)
}

const seed=await mustRead('supabase/migrations/20261007194000_seed_aula_ei_legal_documents.sql')
if(/insert\s+into\s+public\.legal_acceptances/i.test(seed)) throw new Error('No se permiten aceptaciones legales retroactivas en el seed.')

const auditSql=await mustRead('supabase/migrations/20261007202000_aula_ei_compliance_audit.sql')
for(const token of ['audit_aula_compliance_mutation','legal.accepted','privacy.request.created','privacy.incident.created']){
  if(!auditSql.includes(token)) throw new Error('Auditoría del Compliance Center incompleta: falta '+token)
}

const indexesSql=await mustRead('supabase/migrations/20261007201000_aula_ei_compliance_indexes.sql')
for(const token of ['legal_documents_created_by_idx','privacy_requests_resolved_by_idx','retention_rules_approved_by_idx']){
  if(!indexesSql.includes(token)) throw new Error('Índices del Compliance Center incompletos: falta '+token)
}

const vercel=JSON.parse(await mustRead('vercel.json'))
const headers=JSON.stringify(vercel.headers||[])
for(const token of ['Strict-Transport-Security','Content-Security-Policy','Referrer-Policy','Permissions-Policy']){
  if(!headers.includes(token)) throw new Error('Cabecera legal/seguridad faltante: '+token)
}

const roots=['src','player/src','studio/src','certificate/src']
const trackerPatterns=[/googletagmanager/i,/google-analytics/i,/gtag\s*\(/i,/hotjar/i,/clarity\.ms/i,/connect\.facebook\.net/i,/fbq\s*\(/i]
async function walk(dir){
  const out=[]
  for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
    const rel=path.join(dir,entry.name).replaceAll('\\','/')
    if(entry.isDirectory()) out.push(...await walk(rel))
    else if(/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(rel)
  }
  return out
}
for(const dir of roots){
  for(const file of await walk(dir)){
    const content=await mustRead(file)
    for(const pattern of trackerPatterns){
      if(pattern.test(content)) throw new Error('Tracker externo no permitido en '+file+': '+pattern)
    }
  }
}

console.log('Legal compliance gate passed: gate, privacidad, administración, matrices, cabeceras y ausencia de trackers verificados.')
