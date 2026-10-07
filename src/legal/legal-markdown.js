export function parseLegalMarkdown(value = '') {
  const lines = String(value || '').replace(/\r/g, '').split('\n')
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }

  const flushList = () => {
    if (list?.items?.length) blocks.push(list)
    list = null
  }

  const startList = (ordered) => {
    const type = ordered ? 'ordered-list' : 'unordered-list'
    if (!list || list.type !== type) {
      flushList()
      list = { type, items: [] }
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      })
      continue
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      startList(true)
      list.items.push(ordered[1].trim())
      continue
    }

    const unordered = line.match(/^[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      startList(false)
      list.items.push(unordered[1].trim())
      continue
    }

    if (list) flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

export function stripLegalMarkdown(value = '') {
  return String(value || '')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .trim()
}
