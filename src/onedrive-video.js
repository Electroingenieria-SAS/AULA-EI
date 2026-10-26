// Pure OneDrive / SharePoint video helpers. Never render copied HTML directly.
// Work/school share links open the OneDrive page; only provider-generated
// embed URLs belong in an iframe. The platform cannot override Microsoft's CSP.
const businessHost = (host) => host === 'sharepoint.com' || host.endsWith('.sharepoint.com')
const personalHost = (host) => host === 'onedrive.live.com'
const shortHost = (host) => host === '1drv.ms' || host.endsWith('.1drv.ms')

function parseHttps(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'https:' ? url : null
  } catch { return null }
}

export function oneDriveVideoInfo(value) {
  const raw = String(value || '').trim()
  if (!raw) return { kind: 'empty', url: '' }
  let target = raw
  if (/^<iframe\b/i.test(raw)) {
    // Extract only a quoted src from an iframe, not attributes or HTML.
    const source = raw.match(/\bsrc\s*=\s*(["'])([^"']+)\1/i)
    if (!source) return { kind: 'invalid', url: '' }
    target = source[2].replace(/&amp;/gi, '&')
  } else if (raw.startsWith('<')) {
    return { kind: 'invalid', url: '' }
  }
  const url = parseHttps(target)
  if (!url) return { kind: 'invalid', url: '' }
  const host = url.hostname.toLowerCase()
  if (businessHost(host)) {
    const isEmbed = /\/_layouts\/15\/embed\.aspx$/i.test(url.pathname)
    return { kind: isEmbed ? 'embed' : 'share', url: url.toString() }
  }
  if (personalHost(host)) {
    const isEmbed = /^\/embed\/?$/i.test(url.pathname)
    return { kind: isEmbed ? 'embed' : 'share', url: url.toString() }
  }
  if (shortHost(host)) return { kind: 'share', url: url.toString() }
  if (raw.startsWith('<iframe')) return { kind: 'invalid', url: '' }
  return { kind: 'other', url: url.toString() }
}
