import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ipoidimevokogptydbvt.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_T2MmUM_SxiMAtGpp8mQ1NA_ZR6JWuwp'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'aula-ei-auth',
  },
})

const signedUrlCache = new Map()
const pendingSignedUrls = new Map()
let signedFlushScheduled = false

export function clearSignedAssetCache() {
  signedUrlCache.clear()
}

export async function signedAsset(path, ttl = 3600) {
  const normalizedPath = String(path || '').trim()
  if (!normalizedPath) return null

  const cacheKey = ttl + ':' + normalizedPath
  const cached = signedUrlCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  return new Promise((resolve, reject) => {
    const existing = pendingSignedUrls.get(cacheKey)
    if (existing) {
      existing.waiters.push({ resolve, reject })
    } else {
      pendingSignedUrls.set(cacheKey, {
        path: normalizedPath,
        ttl,
        waiters: [{ resolve, reject }],
      })
    }

    if (!signedFlushScheduled) {
      signedFlushScheduled = true
      queueMicrotask(flushSignedUrlQueue)
    }
  })
}

export async function signedAssets(paths, ttl = 3600) {
  const unique = [...new Set((paths || []).filter(Boolean))]
  const values = await Promise.all(unique.map((path) => signedAsset(path, ttl)))
  return new Map(unique.map((path, index) => [path, values[index]]))
}

async function flushSignedUrlQueue() {
  signedFlushScheduled = false
  const queued = [...pendingSignedUrls.entries()]
  pendingSignedUrls.clear()
  if (!queued.length) return

  const groups = new Map()
  for (const [cacheKey, item] of queued) {
    const group = groups.get(item.ttl) || []
    group.push({ cacheKey, ...item })
    groups.set(item.ttl, group)
  }

  await Promise.all([...groups.entries()].map(async ([ttl, items]) => {
    const paths = items.map((item) => item.path)

    try {
      const { data, error } = await supabase.storage
        .from('course-assets')
        .createSignedUrls(paths, Number(ttl))

      if (error) throw error

      const byPath = new Map((data || []).map((entry, index) => [
        entry.path || paths[index],
        entry,
      ]))

      for (const item of items) {
        const result = byPath.get(item.path)
        if (!result?.signedUrl || result.error) {
          throw result?.error || new Error('No fue posible firmar un recurso de capacitación.')
        }

        const expiresAt = Date.now() + Math.max(30, Number(ttl) - 60) * 1000
        signedUrlCache.set(item.cacheKey, { url: result.signedUrl, expiresAt })
        item.waiters.forEach(({ resolve }) => resolve(result.signedUrl))
      }
    } catch (batchError) {
      await Promise.all(items.map(async (item) => {
        try {
          const { data, error } = await supabase.storage
            .from('course-assets')
            .createSignedUrl(item.path, Number(ttl))
          if (error) throw error
          const expiresAt = Date.now() + Math.max(30, Number(ttl) - 60) * 1000
          signedUrlCache.set(item.cacheKey, { url: data.signedUrl, expiresAt })
          item.waiters.forEach(({ resolve }) => resolve(data.signedUrl))
        } catch (error) {
          item.waiters.forEach(({ reject }) => reject(error || batchError))
        }
      }))
    }
  }))
}
