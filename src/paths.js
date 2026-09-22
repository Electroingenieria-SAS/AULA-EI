const rawBase = String(import.meta.env.BASE_URL || '/')
export const APP_BASE = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '')

export function appUrl(path = '/') {
  const clean = '/' + String(path || '/').replace(/^#?\/?/, '')
  return APP_BASE + '/#' + clean
}

export function assetUrl(path = '') {
  return APP_BASE + '/' + String(path || '').replace(/^\/+/, '')
}

export function navigateApp(path = '/', { replace = false } = {}) {
  const target = appUrl(path)
  if (replace) window.location.replace(target)
  else window.location.assign(target)
}
