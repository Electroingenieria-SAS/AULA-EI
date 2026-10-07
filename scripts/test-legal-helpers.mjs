import assert from 'node:assert/strict'
import { normalizeLegalRequirement, pendingLegalRequirements } from '../src/legal/legal-api.js'
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

console.log('Legal helper runtime tests passed.')
