const cache = new Map()
const inflight = new Map()

export async function cachedQuery(key, loader, { ttl = 45000, force = false } = {}) {
  const now = Date.now()
  const existing = cache.get(key)

  if (!force && existing && existing.expiresAt > now) return existing.value
  if (!force && inflight.has(key)) return inflight.get(key)

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttl })
      return value
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

export function invalidateCache(prefix = '') {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key)
  }
}

export function clearDataCache() {
  cache.clear()
  inflight.clear()
}
