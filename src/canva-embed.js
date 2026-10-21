// Only accept Canva design links. Never embed arbitrary caller-controlled hosts.
export function normalizeCanvaEmbedUrl(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)
  const input = (match?.[1] || raw).replace(/&amp;/g, '&')
  let url
  try { url = new URL(input) } catch { return '' }
  if (url.protocol !== 'https:' || !['canva.com', 'www.canva.com'].includes(url.hostname)) return ''
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'design' || parts.length < 2 || !/^[A-Za-z0-9_-]{5,80}$/.test(parts[1])) return ''
  const id = parts[1]
  const token = parts.length >= 3 && !['edit','view','watch','present','share'].includes(parts[2]) && /^[A-Za-z0-9_-]{3,120}$/.test(parts[2]) ? '/' + parts[2] : ''
  return 'https://www.canva.com/design/' + id + token + '/view?embed'
}

export function isCanvaEmbedUrl(value) {
  return Boolean(normalizeCanvaEmbedUrl(value))
}
