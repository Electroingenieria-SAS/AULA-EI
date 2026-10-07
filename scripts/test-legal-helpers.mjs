import assert from 'node:assert/strict'
import { normalizeLegalRequirement, pendingLegalRequirements } from '../src/legal/legal-api.js'

const raw = [{
  document_id: 'doc-1',
  document_version_id: 'version-1',
  document_code: 'AULA-TYC',
  title: 'Condiciones de Uso',
  version: '1.0',
  needs_acceptance: true,
  accepted: false,
  user_type: 'employee',
}]

const normalized = raw.map(normalizeLegalRequirement)

assert.equal(normalized[0].needsAcceptance, true, 'La fila cruda debe normalizar needs_acceptance=true')
assert.equal(pendingLegalRequirements(raw).length, 1, 'Una fila cruda pendiente debe conservarse')
assert.equal(
  pendingLegalRequirements(normalized).length,
  1,
  'Una fila ya normalizada con needsAcceptance=true no puede perder su estado pendiente',
)

console.log('Legal helper runtime tests passed.')
