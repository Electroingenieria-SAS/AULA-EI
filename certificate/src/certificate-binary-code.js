/**
 * A lossless binary encoding of an already unique, immutable certificate code.
 * One certificate code maps to one binary string; no separate secrets or
 * mutable random values are required. Authenticity is checked against the
 * official certificate record using the existing QR code and certificate URL.
 */
export function certificateBinaryCode(code) {
  const value = String(code || '')
  if (!value) return ''
  return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(2).padStart(8, '0')).join('')
}

export function certificateBinaryLines(code, lineLength = 64) {
  const bits = certificateBinaryCode(code)
  if (!bits) return []
  const width = Math.max(8, Math.floor(lineLength / 8) * 8)
  return bits.match(new RegExp('.{1,' + width + '}', 'g')) || []
}
