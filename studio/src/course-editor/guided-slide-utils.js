// Fully local export of PDF slide artwork. Uploads to the existing private
// course-assets bucket only after an authorized course editor explicitly asks.
// No premium Canva/OpenAI service and no attempt to read cross-origin iframe state.
import { supabase, uploadCourseAsset } from '../shared.js'
import { guidedSlideContent } from '../../../src/guided-slides.js'

export const MAX_GUIDED_SLIDES = 50
const MAX_RENDER_WIDTH = 1440
const MAX_SLIDE_BYTES = 1_750_000
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

export async function renderGuidedSlideBlobs(file, onProgress = () => {}) {
  if (!file) throw new Error('Selecciona el PDF exportado desde Canva.')
  if (file.size > 12 * 1024 * 1024) throw new Error('El PDF supera el máximo de 12 MB.')
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/build/pdf.mjs')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  GlobalWorkerOptions.workerSrc = workerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder('ascii').decode(bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('El archivo seleccionado no contiene un PDF válido.')
  }
  const job = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true })
  const slides = []
  let totalBytes = 0
  try {
    const pdfDocument = await job.promise
    if (pdfDocument.numPages > MAX_GUIDED_SLIDES) {
      throw new Error('La presentación supera las 50 diapositivas. Divídela en PDF más pequeños.')
    }
    for (let number = 1; number <= pdfDocument.numPages; number++) {
      onProgress('Preparando diapositiva ' + number + ' de ' + pdfDocument.numPages)
      const page = await pdfDocument.getPage(number)
      try {
        const nativeSize = page.getViewport({scale: 1})
        const ratio = Math.min(2, MAX_RENDER_WIDTH / nativeSize.width)
        const viewport = page.getViewport({scale: ratio})
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('El navegador no puede renderizar las diapositivas.')
        await page.render({canvasContext: context, canvas, viewport, background: '#ffffff'}).promise
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.77))
        canvas.width = 0
        canvas.height = 0
        if (!blob || blob.size > MAX_SLIDE_BYTES) {
          throw new Error('La diapositiva ' + number + ' resulta demasiado grande. Reduce las imágenes del PDF.')
        }
        totalBytes += blob.size
        if(totalBytes>MAX_TOTAL_BYTES) throw new Error('Las diapositivas superan el límite de 20 MB. Comprime el PDF o divídelo en varios módulos.')
        slides.push({index: number - 1,blob,
          filename: 'diapositiva-' + String(number).padStart(3,'0') + (blob.type === 'image/webp' ? '.webp' : '.png')})
      } finally { page.cleanup() }
    }
  } finally { await job.destroy() }
  return slides
}

export async function saveGuidedSlides({courseId, phaseId, slides, source='pdf', onProgress = () => {}}) {
  if (!courseId || !phaseId || !Array.isArray(slides) || !slides.length) {
    throw new Error('No hay diapositivas válidas para guardar.')
  }
  const uploaded=[]
  try {
    for (const slide of slides) {
      onProgress('Guardando diapositiva ' + (slide.index+1) + ' de ' + slides.length)
      const asset = new File([slide.blob], slide.filename, {type:slide.blob.type})
      const path = await uploadCourseAsset(courseId, asset)
      uploaded.push(path)
    }
    const values=uploaded.map((asset_path,index)=>({
      phase_id:phaseId,
      type:'image',
      title:'Diapositiva '+(index+1)+' de '+slides.length,
      description:'Al avanzar, responde una pregunta del banco existente de este curso.',
      content:guidedSlideContent(index,slides.length,source),
      asset_path,
      sort_order:index,
      status:'published',
      required:true,
      completion_rule:{mode:'manual'},
    }))
    const {error} = await supabase.from('content_blocks').insert(values)
    if(error)throw error
    return values.length
  }catch(error){
    // On upload errors, avoid abandoned storage files where possible.
    if(uploaded.length)await supabase.storage.from('course-assets').remove(uploaded)
    throw error
  }
}
