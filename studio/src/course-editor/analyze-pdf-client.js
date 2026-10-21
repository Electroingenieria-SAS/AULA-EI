import { supabase } from '../shared.js'
import { normalizeCanvaEmbedUrl } from '../../../src/canva-embed.js'

export const MAX_PDF_BYTES = 4 * 1024 * 1024

export function validateTrainingPdf(file) {
  if (!file) throw new Error('Adjunta el PDF de la presentación de Canva.')
  if (file.size > MAX_PDF_BYTES) throw new Error('El PDF supera 4 MB. Exporta una versión reducida o divide la presentación.')
  if (file.size < 100 || (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')) {
    throw new Error('Selecciona un archivo PDF válido.')
  }
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5))
  if (header !== '%PDF-') throw new Error('El archivo seleccionado no es un PDF válido.')
  const chunks = []
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)))
  }
  return btoa(chunks.join(''))
}

/**
 * No media is persisted by this utility. The PDF leaves the browser only
 * after explicit confirmation by the author, through an authenticated Edge Function.
 */
export async function analyzeTrainingPdf({ file, canvaUrl = '', title, consent }) {
  const normalizedCanva = normalizeCanvaEmbedUrl(canvaUrl)
  if (!file && !normalizedCanva) throw new Error('Adjunta un PDF o pega un enlace de Canva válido.')
  if (file) validateTrainingPdf(file)
  if (!String(title || '').trim()) throw new Error('Define el título de la capacitación.')
  if (!consent) throw new Error('Autoriza el análisis de este material por el proveedor de IA.')
  const { data, error } = await supabase.functions.invoke('analyze-course-pdf', {
    body: {
      title: String(title).trim().slice(0, 140),
      ...(file ? { pdf_base64: await fileToBase64(file) } : { canva_url: normalizedCanva }),
      consent: true,
    },
  })
  if (error) {
    let remoteMessage = ''
    if (error.context && typeof error.context.json === 'function') {
      try { remoteMessage = (await error.context.json())?.error || '' } catch { /* no JSON response */ }
    }
    throw new Error(remoteMessage || error.message || 'No fue posible consultar el analizador.')
  }
  if (data?.error) throw new Error(data.error)
  if (!data || !Array.isArray(data.suggested_questions) || !Array.isArray(data.pages)) {
    throw new Error('El analizador no devolvió resultados válidos.')
  }
  return data
}
