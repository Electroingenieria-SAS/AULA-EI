// A quick practice question is never allowed to block the course indefinitely.
export const PRACTICE_READ_TIMEOUT_MS = 12000
export const PRACTICE_WRITE_TIMEOUT_MS = 16000

// crypto.randomUUID() is unavailable in some browsers and non-secure contexts.
// Seeds are not credentials, so a non-cryptographic fallback is sufficient.
export function practiceRequestSeed(cryptoApi = globalThis.crypto) {
  try {
    if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
    if (typeof cryptoApi?.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      cryptoApi.getRandomValues(bytes)
      return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
    }
  } catch {}
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

// A timed-out RPC may still complete server-side; callers must be safe to retry.
export function withPracticeTimeout(operation, timeoutMs, message = 'La conexión tardó demasiado. Intenta de nuevo.') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => clearTimeout(timer))
}

// Bad/empty question payloads must display a recoverable fallback, not an empty quiz.
export function isUsablePracticeQuestion(question) {
  return Boolean(
    question && typeof question === 'object' && question.id
    && typeof question.prompt === 'string' && question.prompt.trim()
    && Array.isArray(question.options) && question.options.length >= 2
    && question.options.every(option => option && option.id && typeof option.label === 'string' && option.label.trim()),
  )
}
