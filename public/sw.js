const CACHE_VERSION = 'aula-ei-pwa-v6'
const STATIC_CACHE = CACHE_VERSION + '-static'
const RUNTIME_CACHE = CACHE_VERSION + '-runtime'

const scopeUrl = new URL(self.registration.scope)
const inScope = (path = '') => new URL(path, scopeUrl).href
const APP_SHELL = [
  inScope('./'),
  inScope('manifest.webmanifest'),
  inScope('favicon.svg'),
  inScope('icons/pwa-192.png'),
  inScope('icons/pwa-512.png'),
  inScope('brand/logo-aula-ei.png'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('aula-ei-pwa-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

function isSameOriginGet(request, url) {
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  if (url.pathname.includes('/auth/') || url.pathname.includes('/rest/') || url.pathname.includes('/functions/')) return false
  return true
}

function isFreshCode(request) {
  return ['script', 'style', 'manifest'].includes(request.destination)
}

function isCacheableMedia(request) {
  return ['image', 'font'].includes(request.destination)
}

async function networkFirst(request, fallback = null) {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : null) || Response.error()
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.put(inScope('./'), response.clone())
    }
    return response
  } catch {
    return (await caches.match(inScope('./'))) || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  const update = fetch(request)
    .then(async (response) => {
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(RUNTIME_CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    update.catch(() => {})
    return cached
  }

  return (await update) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!isSameOriginGet(request, url)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isFreshCode(request)) {
    event.respondWith(networkFirst(request))
    return
  }

  if (isCacheableMedia(request)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
