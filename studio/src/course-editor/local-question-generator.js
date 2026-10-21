// Deterministic, free question drafts from verbatim PDF text.
// No text or PDF data leaves the user's browser.
// This is NOT a language model, and proposed distractors need author review.

const tidy = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[\u200b-\u200f]/g, '')
  .replace(/\s+/g, ' ').trim()

const signature = (text) => tidy(text).toLocaleLowerCase('es').replace(/[^a-záéíóúüñ\d]+/g, ' ').trim()

function statements(page) {
  const segments = String(page.text || '')
    .split(/(?:[\r\n]+|(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡]))/)
    .flatMap((paragraph) => paragraph.length > 300 ? paragraph.split(/[.;]\s+/) : [paragraph])
    .map(tidy)
    .filter((line) => line.length >= 32 && line.length <= 270
      && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{4}/.test(line)
      && !/^(https?:|www\.|\d{1,3}[.) -]|p[aá]gina\s+\d)/i.test(line))
  const results = []
  const seen = new Set()
  for (const item of segments) {
    const key=signature(item)
    if (seen.has(key)) continue
    seen.add(key)
    results.push({page:page.page, line:item})
  }
  return results
}

export function generateLocalQuestions(pages, { maxQuestions = 20 } = {}) {
  const entries = (Array.isArray(pages) ? pages : []).flatMap(statements)
  // Exclude phrases repeated verbatim across pages (typical headings and footers).
  const appearances = new Map()
  for (const entry of entries) {
    const key=signature(entry.line)
    if (!appearances.has(key)) appearances.set(key,new Set())
    appearances.get(key).add(entry.page)
  }
  const distinct = entries.filter((entry)=>appearances.get(signature(entry.line)).size === 1)
  const unique = distinct.filter((entry,index)=>distinct.findIndex((p)=>signature(p.line)===signature(entry.line))===index)
  const output = []
  const usedPages = new Map()
  for (const correct of unique) {
    if (output.length >= maxQuestions) break
    if ((usedPages.get(correct.page)||0)>=3) continue
    const distractors = unique
      .filter((entry)=>entry.page!==correct.page
        && signature(entry.line)!==signature(correct.line)
        && Math.abs(entry.line.length-correct.line.length) <= Math.max(110,correct.line.length))
      .sort((a,b)=>Math.abs(a.line.length-correct.line.length)-Math.abs(b.line.length-correct.line.length))
      .slice(0,3)
    if (distractors.length < 3) continue
    const answerIndex=output.length % 4
    const choices=distractors.map(d=>d.line)
    choices.splice(answerIndex,0,correct.line)
    output.push({
      page:correct.page,
      prompt:`Según la diapositiva ${correct.page}, ¿cuál de estas afirmaciones aparece en el material?`,
      options:choices,
      correctIndex:answerIndex,
      sourceExcerpt:correct.line,
      selected:false,
    })
    usedPages.set(correct.page,(usedPages.get(correct.page)||0)+1)
  }
  return output
}

export function extractStudyNotes(pages) {
  return (Array.isArray(pages)?pages:[])
    .filter(p=>tidy(p.text).length>=24)
    .slice(0,40)
    .map((p)=>({
      page:p.page,
      title:tidy((p.text||'').split(/\n/).find(line=>tidy(line).length>8) || `Diapositiva ${p.page}`).slice(0,140),
      explanation:tidy(p.text).slice(0,3000),
      takeaway:'Transcripción extraída del PDF, sin interpretación automática. Revisar contra la presentación original.',
    }))
}
