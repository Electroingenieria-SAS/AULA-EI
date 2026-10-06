export function withTimeout(promise, ms, message) {
  let timeoutId
  const timer = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timer]).finally(() => window.clearTimeout(timeoutId))
}
