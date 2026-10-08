import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export function certificationCheck(report) {
  const controls = Object.entries(report?.controls || {})
  const incomplete = controls.filter(([,control])=>
    control?.status !== 'APROBADO' || !String(control?.evidence || '').trim())
    .map(([key]) => key)
  if (!controls.length) incomplete.push('no-controls-defined')
  const valid = report?.certification_status === 'CERTIFICADO' && incomplete.length === 0
  return { valid, total: controls.length, approved: controls.length - incomplete.length,
    incomplete, status: valid ? 'CERTIFICADO' : 'PENDIENTE' }
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
