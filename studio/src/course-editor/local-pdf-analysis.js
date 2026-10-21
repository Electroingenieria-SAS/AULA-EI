// Mozilla PDF.js runs entirely on-device. No paid services, no uploads.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { generateLocalQuestions, extractStudyNotes } from './local-question-generator.js'

GlobalWorkerOptions.workerSrc = workerUrl

export const MAX_LOCAL_PDF_BYTES = 12 * 1024 * 1024
export const MAX_LOCAL_PDF_PAGES = 50

export async function analyzeLocalPdf(file) {
  if (!file || !(file instanceof Blob)) throw new Error('Adjunta el PDF de la presentación.')
  if (file.size > MAX_LOCAL_PDF_BYTES) throw new Error('El PDF supera 12 MB. Reduce el tamaño para analizarlo localmente.')
  if (file.size < 100) throw new Error('El PDF está vacío o dañado.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder('ascii').decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('El archivo no es un PDF válido.')
  const task = getDocument({ data:bytes, isEvalSupported:false, useSystemFonts:true })
  try {
    const doc = await task.promise
    if (doc.numPages > MAX_LOCAL_PDF_PAGES) throw new Error('El PDF tiene más de 50 páginas. Divide la presentación en archivos más pequeños.')
    const pages = []
    for (let index=1;index<=doc.numPages;index++) {
      const page=await doc.getPage(index)
      const textContent=await page.getTextContent()
      const fragments=[]
      for (const item of textContent.items) {
        if (typeof item.str !== 'string') continue
        fragments.push(item.str)
        if (item.hasEOL) fragments.push('\n')
        else fragments.push(' ')
      }
      pages.push({page:index,text:fragments.join('').slice(0,10000)})
      page.cleanup()
    }
    const characters=pages.reduce((sum,p)=>sum+p.text.trim().length,0)
    if(characters<100) {
      throw new Error('Este PDF no contiene suficiente texto seleccionable. Si son imágenes escaneadas, exporta desde Canva como PDF con texto o prepara las preguntas manualmente.')
    }
    const suggested_questions=generateLocalQuestions(pages)
    const study=extractStudyNotes(pages)
    return {pages:study,suggested_questions,extractedPages:pages,characters,method:'local-pdfjs'}
  } finally { await task.destroy() }
}
