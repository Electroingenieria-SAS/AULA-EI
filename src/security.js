export function safeExternalUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('#')) return raw
  try {
    const url = new URL(raw, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function sanitizeHtml(value) {
  const html = String(value || '')
  if (typeof document === 'undefined') return html

  const template = document.createElement('template')
  template.innerHTML = html

  template.content
    .querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,meta,link,base')
    .forEach((node) => node.remove())

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)
  let node
  while ((node = walker.nextNode())) {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        node.removeAttribute(attribute.name)
        continue
      }
      if (name === 'href' || name === 'src') {
        const safe = safeExternalUrl(value)
        if (!safe && !value.startsWith('#')) node.removeAttribute(attribute.name)
        else if (safe) node.setAttribute(attribute.name, safe)
      }
    }
  }

  template.content.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
  })

  return template.innerHTML
}
