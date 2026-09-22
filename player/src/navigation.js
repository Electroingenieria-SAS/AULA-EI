import { appUrl, assetUrl } from '../../src/paths.js'

export { appUrl, assetUrl }

export function navigateLearner(path = '/', options = {}) {
  const target = appUrl(path)
  if (options.replace) window.location.replace(target)
  else window.location.assign(target)
}
