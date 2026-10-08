import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export function certificationCheck(report) {
  const controls = Object.entries(report?.controls || {})
  const compensable = 'admin-auth-leaked-password-protection'
  const incomplete = controls.filter(([key,control])=>
    !String(control?.evidence || '').trim() ||
    (control?.status !== 'APROBADO' &&
      !(key === compensable && control?.status === 'ACEPTADO_CON_RIESGO')))
    .map(([key]) => key)
  if (!controls.length) incomplete.push('no-controls-defined')
  const acceptedRisk = report?.controls?.[compensable]?.status === 'ACEPTADO_CON_RIESGO'
  const requiredStatus = acceptedRisk ? 'CERTIFICADO_CONDICIONADO' : 'CERTIFICADO'
  const valid = report?.certification_status === requiredStatus && incomplete.length === 0
  return { valid, total: controls.length, approved: controls.length - incomplete.length,
    incomplete, status: valid ? requiredStatus : 'PENDIENTE' }
}

export async function readCertificationEvidence() {
  return JSON.parse(await readFile(new URL('../docs/quality/phase85-certification-evidence.json',import.meta.url),'utf8'))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = certificationCheck(await readCertificationEvidence())
  console.log('Aula EI · 8.5 · certificación:',result.status)
  console.log('Controles documentados:',result.approved,'/',result.total)
  if(result.incomplete.length) console.error('Evidencia pendiente:',result.incomplete.join(', '))
  if(!result.valid) {
    console.error('No emitir acta de producción certificada hasta disponer de evidencia real y aprobación institucional.')
    process.exitCode = 1
  }
}
