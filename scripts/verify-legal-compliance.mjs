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

const legalApi=await mustRead('src/legal/legal-api.js')
for(const token of ['aula-ei-legal-receipt:v1:','localStorage.setItem','acceptLegalDocuments']){
  if(!legalApi.includes(token)) throw new Error('Recibo local legal incompleto: falta '+token)
}

const serviceWorker=await mustRead('public/sw.js')
if(!serviceWorker.includes("aula-ei-pwa-v4")) throw new Error('La caché PWA no fue invalidada para el consentimiento legal.')

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
