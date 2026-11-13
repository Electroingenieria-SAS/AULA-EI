import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { certificateBinaryCode, certificateBinaryLines } from '../certificate/src/certificate-binary-code.js'

// Build must refuse to publish certificates if the exact approved seal
// provided by the organization has not been installed in the repository.
const stampPath = new URL('../brand/approved-training-stamp.png', import.meta.url)
assert.ok(existsSync(stampPath), 'Falta el PNG institucional aprobado. No publicar certificados sin el sello autorizado.')
const stampBytes = readFileSync(stampPath)
const stampSha256 = createHash('sha256').update(stampBytes).digest('hex')
assert.equal(stampSha256, '34c45e0496c8af763b274632c48f016090778d8a0b54d32012c5a4f1ca8301e9',
  'El PNG del sello debe coincidir byte por byte con el sello institucional aprobado.')

const a = 'AULAEI-2026-0001'
const b = 'AULAEI-2026-0002'
const one = certificateBinaryCode(a)
const two = certificateBinaryCode(b)
assert.notEqual(one, two, 'Distinct official certificate codes must have distinct binary identifiers')
assert.match(one, /^[01]+$/, 'Binary identifier must contain only zeros and ones')
assert.equal(one.length, new TextEncoder().encode(a).length * 8)
assert.equal(certificateBinaryLines(a).join(''), one, 'Line breaks must preserve the full identifier')
assert.equal(certificateBinaryCode(''), '')
assert.equal(certificateBinaryCode('ABC'), '010000010100001001000011')
assert.equal(certificateBinaryCode('AÚ'), '010000011100001110011010', 'UTF-8 encoding must preserve non-ASCII code bytes')

const view = readFileSync(new URL('../certificate/src/CertificateApp.jsx', import.meta.url), 'utf8')
const template = readFileSync(new URL('../certificate/src/CertificateTemplate.jsx', import.meta.url), 'utf8')
assert.match(view, /assetUrl\('brand\/approved-training-stamp\.png'\)/)
assert.match(view, /const complete = Boolean\(participantSignature && approvalStampData\)/,
  'Only participant signature and institutional seal are required')
assert.doesNotMatch(view, /type="admin"/,
  'The responsible stamp must not have manual upload or replacement controls')
assert.match(view, /type="participant"/,
  'The participant must retain signature upload and removal controls')
assert.match(template, /certificate\.approvalStampData/, 'The automatic official seal must appear in the SVG and exported PDF/PNG')
assert.match(template, /certificate\.binaryCodeLines\.map/, 'Binary code is printed on each certificate')
assert.match(template, /certificate\.qrData/, 'Keep the real existing QR verification URL')
console.log('Certificate automatic seal and one-to-one binary ID checks passed')
