import assert from 'node:assert/strict'
import { clearLegalRequirementsPrefetch, loadPrefetchedLegalRequirements, normalizeLegalRequirement, pendingLegalRequirements, prefetchLegalRequirements } from '../src/legal/legal-api.js'
import { supabase } from '../src/supabase.js'
import { parseLegalMarkdown, stripLegalMarkdown } from '../src/legal/legal-markdown.js'

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

const policySample = `# Política de ejemplo

**Versión:** 1.0

## Objetivo

Texto institucional con **énfasis importante**.

1. **Primera medida:** aplicar el control.
2. **Segunda medida:** conservar evidencia.

- Protección de datos
- Trazabilidad`

const policyBlocks = parseLegalMarkdown(policySample)
assert.equal(policyBlocks[0].type, 'heading', 'El título Markdown debe convertirse en heading estructurado')
assert.equal(policyBlocks.some((block) => block.type === 'ordered-list'), true, 'La numeración debe convertirse en lista ordenada')
assert.equal(policyBlocks.some((block) => block.type === 'unordered-list'), true, 'Los guiones deben convertirse en lista visual')
assert.equal(stripLegalMarkdown('**Texto fuerte**'), 'Texto fuerte', 'La presentación no debe exponer asteriscos Markdown')
assert.equal(stripLegalMarkdown('## Título'), 'Título', 'La presentación no debe exponer numerales Markdown')

// Regression: a legal prefetch is consumed once, never reused for another user,
// and never replaces a fresh check following acceptance or sign-out.
const originalRpc = supabase.rpc
let legalRpcCalls = 0
supabase.rpc = async (name) => {
  assert.equal(name, 'get_my_legal_requirements')
  legalRpcCalls += 1
  return {
    data: [{ ...raw[0], document_version_id: 'version-' + legalRpcCalls }],
    error: null,
  }
}

try {
  const prefetched = prefetchLegalRequirements('employee-a')
  assert.strictEqual(prefetchLegalRequirements('employee-a'), prefetched,
    'Una misma sesión no debe duplicar la precarga de políticas')

  const firstRead = await loadPrefetchedLegalRequirements('employee-a')
  assert.equal(firstRead[0].versionId, 'version-1')
  assert.equal(legalRpcCalls, 1, 'LegalGate debe aprovechar la consulta anticipada')

  const freshRead = await loadPrefetchedLegalRequirements('employee-a')
  assert.equal(freshRead[0].versionId, 'version-2',
    'Después de consumir la precarga debe ejecutarse una validación nueva')

  const stagedForA = prefetchLegalRequirements('employee-a')
  const userBRead = await loadPrefetchedLegalRequirements('employee-b')
  assert.equal(userBRead[0].versionId, 'version-4',
    'La precarga de un usuario nunca puede responder por otro')
  await stagedForA

  clearLegalRequirementsPrefetch()
  const afterSignOut = await loadPrefetchedLegalRequirements('employee-a')
  assert.equal(afterSignOut[0].versionId, 'version-5',
    'El cierre de sesión debe descartar cualquier precarga anterior')

  clearLegalRequirementsPrefetch()
  let retryAttempts = 0
  supabase.rpc = async (name) => {
    assert.equal(name, 'get_my_legal_requirements')
    retryAttempts += 1
    return retryAttempts === 1
      ? { data: null, error: new Error('Fallo transitorio de red') }
      : { data: raw, error: null }
  }
  const failedPrefetch = prefetchLegalRequirements('employee-retry')
  await assert.rejects(failedPrefetch, /Fallo transitorio/)
  const recovered = await loadPrefetchedLegalRequirements('employee-retry')
  assert.equal(recovered[0].needsAcceptance, true)
  assert.equal(retryAttempts, 2,
    'Un error de precarga debe recuperar la validación legal mediante una nueva consulta')
} finally {
  clearLegalRequirementsPrefetch()
  supabase.rpc = originalRpc
}

console.log('Legal helper runtime tests passed.')
