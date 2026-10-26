// Local PDF/ZIP/image import. Only validated image pixels are persisted to the
// private course-assets bucket; ZIP entries are never extracted to disk.
// No OCR, generated questions, OAuth token, or third-party processing.
import { renderGuidedSlideBlobs, MAX_GUIDED_SLIDES } from './guided-slide-utils.js'

const MAX_INPUT_BYTES = 30 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024
const MAX_RENDER_WIDTH = 1440
const MAX_SLIDE_BYTES = 1_750_000

const allowedImage = /\.(png|jpe?g|webp)$/i
const naturalOrder = (a,b) => a.name.localeCompare(b.name, 'es', {numeric:true, sensitivity:'base'})

export function classifyGuidedUpload(files) {
  const input = Array.from(files || []).filter(Boolean)
  if (!input.length) throw new Error('Selecciona un PDF, ZIP o varias imágenes.')
  const single = input.length === 1 ? input[0] : null
  if (single && (/\.pdf$/i.test(single.name) || single.type === 'application/pdf')) return 'pdf'
  if (single && (/\.zip$/i.test(single.name) || single.type === 'application/zip')) return 'zip'
  if (input.every(file => allowedImage.test(file.name))) return 'images'
  throw new Error('No mezcles formatos. Elige un PDF, un ZIP de imágenes o varias imágenes PNG, JPG o WebP.')
}

function limitFile(file) {
  if (!file || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Una imagen está vacía o supera 10 MB.')
  }
  if (!allowedImage.test(file.name)) throw new Error('El paquete contiene un archivo de imagen no admitido.')
}

function imageSignature(data, name) {
  if (data.length < 12) return false
  const isPng = data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71
  const isJpeg = data[0]===255&&data[1]===216&&data[2]===255
  const isWebp = String.fromCharCode(...data.slice(0,4))==='RIFF' &&
    String.fromCharCode(...data.slice(8,12))==='WEBP'
  if (/\.png$/i.test(name)) return isPng
  if (/\.jpe?g$/i.test(name)) return isJpeg
  if (/\.webp$/i.test(name)) return isWebp
  return false
}

async function imageToSlide(file, index, total, onProgress) {
  limitFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!imageSignature(bytes,file.name)) throw new Error('El archivo '+file.name+' no es una imagen válida.')
  onProgress('Preparando imagen '+(index+1)+' de '+total)
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
    const width = Math.min(bitmap.width, MAX_RENDER_WIDTH)
    const height = Math.max(1,Math.round(bitmap.height*width/bitmap.width))
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width*bitmap.height > 70_000_000) {
      throw new Error('Imagen demasiado grande o con dimensiones inválidas.')
    }
    const canvas = document.createElement('canvas')
    canvas.width=width; canvas.height=height
    const context=canvas.getContext('2d',{alpha:false})
    if (!context) throw new Error('El navegador no puede procesar imágenes.')
    context.fillStyle='#ffffff'
    context.fillRect(0,0,width,height)
    context.drawImage(bitmap,0,0,width,height)
    let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.77))
    if(!blob || blob.size>MAX_SLIDE_BYTES) {
      blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.58))
    }
    canvas.width=0;canvas.height=0
    if(!blob || blob.size>MAX_SLIDE_BYTES) throw new Error('La imagen '+file.name+' supera el límite por diapositiva.')
    return {
      index,
      blob,
      filename:'diapositiva-'+String(index+1).padStart(3,'0')+'.webp',
      source_name:file.name,
    }
  } finally {
    if(bitmap) bitmap.close()
  }
}

async function unzipImages(file) {
  // Parse the central directory instead of trusting local headers, and cap
  // decompressed sizes BEFORE allocation to limit ZIP bomb abuse.
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  const end = Math.max(0,bytes.length-65557)
  let eocd=-1
  for(let p=bytes.length-22;p>=end;p--) {
    if(view.getUint32(p,true)===0x06054b50 && p+22+view.getUint16(p+20,true)<=bytes.length) {
      eocd=p;break
    }
  }
  if(eocd<0) throw new Error('El ZIP no tiene un índice válido.')
  const entries=view.getUint16(eocd+10,true)
  const directorySize=view.getUint32(eocd+12,true)
  const directoryOffset=view.getUint32(eocd+16,true)
  if(entries===65535 || directoryOffset===0xffffffff || directorySize===0xffffffff) {
    throw new Error('Los archivos ZIP64 no son compatibles. Utiliza un ZIP normal.')
  }
  if(directoryOffset+directorySize>bytes.length) throw new Error('Índice ZIP incompleto.')
  const decoder=new TextDecoder('utf-8',{fatal:false})
  const headers=[]
  let total=0
  let position=directoryOffset
  for(let i=0;i<entries;i++) {
    if(position+46>bytes.length || view.getUint32(position,true)!==0x02014b50) {
      throw new Error('El índice del ZIP contiene datos inválidos.')
    }
    const flags=view.getUint16(position+8,true)
    const method=view.getUint16(position+10,true)
    const compressed=view.getUint32(position+20,true)
    const uncompressed=view.getUint32(position+24,true)
    const nameLength=view.getUint16(position+28,true)
    const extraLength=view.getUint16(position+30,true)
    const commentLength=view.getUint16(position+32,true)
    const offset=view.getUint32(position+42,true)
    const next=position+46+nameLength+extraLength+commentLength
    if(next>bytes.length) throw new Error('El ZIP contiene nombres de archivo inválidos.')
    const name=decoder.decode(bytes.subarray(position+46,position+46+nameLength))
    position=next
    if(!allowedImage.test(name) || /(^|\/)(__MACOSX|\.|~)/i.test(name)) continue
    if(flags&1 || ![0,8].includes(method)) throw new Error('No se admiten imágenes ZIP cifradas ni compresiones especiales.')
    if(uncompressed>MAX_IMAGE_BYTES || compressed>MAX_IMAGE_BYTES ||
      offset===0xffffffff || uncompressed===0xffffffff) throw new Error('Una imagen del ZIP supera el límite de 10 MB.')
    total+=uncompressed
    if(total>MAX_UNCOMPRESSED_BYTES) throw new Error('El ZIP contiene demasiados datos al descomprimir.')
    headers.push({name,compressed,uncompressed,offset,method})
    if(headers.length>MAX_GUIDED_SLIDES) throw new Error('El paquete supera las 50 imágenes.')
  }
  if(!headers.length) throw new Error('No hay imágenes PNG, JPG o WebP en el ZIP.')
  const results=[]
  for(const item of headers.sort(naturalOrder)) {
    const p=item.offset
    if(p+30>bytes.length || view.getUint32(p,true)!==0x04034b50) throw new Error('Imagen ZIP inválida.')
    const dataStart=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true)
    if(dataStart+item.compressed>bytes.length) throw new Error('Imagen ZIP incompleta.')
    const compressed=bytes.slice(dataStart,dataStart+item.compressed)
    let raw
    if(item.method===0) raw=compressed
    else {
      if(typeof DecompressionStream!=='function') {
        throw new Error('Tu navegador no admite ZIP comprimidos. Extrae las imágenes y selecciónalas directamente.')
      }
      try {
        const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
        const reader=stream.getReader()
        const chunks=[]
        let count=0
        try {
          while(true) {
            const {value,done}=await reader.read()
            if(done)break
            count+=value.byteLength
            if(count>item.uncompressed || count>MAX_IMAGE_BYTES) {
              await reader.cancel()
              throw new Error('El ZIP excede el límite de tamaño al descomprimir.')
            }
            chunks.push(value)
          }
        } finally {reader.releaseLock()}
        raw=new Uint8Array(count)
        let at=0
        for(const chunk of chunks){raw.set(chunk,at);at+=chunk.length}
      } catch {
        throw new Error('No se pudo descomprimir el ZIP. Extrae las imágenes y selecciónalas directamente.')
      }
    }
    if(raw.byteLength!==item.uncompressed) throw new Error('El ZIP contiene una imagen de tamaño inconsistente.')
    const mime=/\.png$/i.test(item.name)?'image/png':/\.webp$/i.test(item.name)?'image/webp':'image/jpeg'
    results.push(new File([raw],item.name,{type:mime}))
  }
  return results
}

export async function renderGuidedMedia(files, onProgress=()=>{}) {
  const input=Array.from(files||[]).filter(Boolean)
  const source=classifyGuidedUpload(input)
  const totalBytes=input.reduce((n,f)=>n+f.size,0)
  if(totalBytes>MAX_INPUT_BYTES) throw new Error('La carga supera 30 MB. Divide las diapositivas en paquetes más pequeños.')
  if(source==='pdf') {
    const slides=await renderGuidedSlideBlobs(input[0],onProgress)
    return {source,slides}
  }
  const items=source==='zip'?await unzipImages(input[0]):[...input].sort(naturalOrder)
  if(items.length>MAX_GUIDED_SLIDES) throw new Error('Máximo 50 diapositivas por paquete.')
  const slides=[]
  for(let i=0;i<items.length;i++) slides.push(await imageToSlide(items[i],i,items.length,onProgress))
  if(slides.reduce((n,item)=>n+item.blob.size,0)>20*1024*1024) {
    throw new Error('El material supera 20 MB tras su preparación.')
  }
  return {source,slides}
}
