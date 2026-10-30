import React, { useState } from 'react'
import { BookOpenCheck, CheckCircle2, FileText, FolderOpen, Images, Loader2, Upload } from 'lucide-react'
import { getError, supabase } from '../shared.js'
import { hasGuidedSlides, isGuidedSlide } from '../../../src/guided-slides.js'
import { replaceGuidedSlides, saveGuidedSlides } from './guided-slide-utils.js'
import { classifyGuidedUpload, renderGuidedMedia } from './guided-image-pack.js'
import '../styles/guided-slides.css'

export default function GuidedSlideImporter({courseId, courseStatus, phases, questions, refresh, setMessage}) {
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const already=hasGuidedSlides(phases)
  const existingPhase=(phases||[]).find(p=>(p.blocks||[]).some(b=>isGuidedSlide(b)&&b.status!=='draft'))
  const existingBlocks=(existingPhase?.blocks||[]).filter(b=>isGuidedSlide(b)&&b.status!=='draft')
    .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
  // Practice transitions reuse the course's active questions and answer options.
  const available=(questions||[]).filter(q=>q.active!==false &&
    (q.options||[]).length>=2 && (q.options||[]).some(o=>o.is_correct)).length

  const choose=(list)=>{
    setFiles(Array.from(list||[]).filter(f=>f && f.size))
    setError(''); setSuccess('')
  }

  const create=async()=>{
    if(!files.length || busy || !available)return
    setError('');setSuccess('')
    if(courseStatus==='published' && !window.confirm(
      'Vas a actualizar una capacitación publicada. Si cambia el número de diapositivas, se creará una versión nueva y podrá cambiar el progreso pendiente de los trabajadores. ¿Continuar?'
    )) return
    let createdPhase=null
    setBusy('Leyendo archivo y contando diapositivas…')
    try {
      const {slides,source}=await renderGuidedMedia(files,setBusy)
      if(!slides.length)throw Error('El paquete no contiene diapositivas.')
      if(existingBlocks.length && existingBlocks.length===slides.length) {
        const count=await replaceGuidedSlides({courseId,blocks:existingBlocks,slides,source,onProgress:setBusy})
        setSuccess(count+' diapositivas actualizadas. Se conservó el avance de los trabajadores y seguirán apareciendo como máximo dos preguntas aleatorias durante el recorrido.')
        setFiles([])
        await refresh()
        setMessage('Paquete actualizado sin reiniciar el progreso: el límite de dos preguntas se mantiene.')
        return
      }
      // A changed page count creates a NEW course version while retaining
      // the original rows as drafts for progress/audit traceability.
      const firstOrder=existingPhase ? Number(existingPhase.sort_order)||0 :
        Math.min(0,...phases.map(p=>Number(p.sort_order)||0))-1
      const {data,error:phaseError}=await supabase.from('course_phases').insert({
        course_id:courseId,
        title:'Presentación interactiva · '+slides.length+' diapositivas',
        description:'El visor de Aula EI muestra cada imagen e intercala hasta dos preguntas aleatorias durante la capacitación.',
        sort_order:firstOrder,
      }).select('id').single()
      if(phaseError)throw phaseError
      createdPhase=data.id
      const count=await saveGuidedSlides({courseId,phaseId:createdPhase,slides,source,onProgress:setBusy})
      if(existingBlocks.length) {
        const oldIds=existingBlocks.map(block=>block.id)
        const {error:archiveError}=await supabase.from('content_blocks')
          .update({status:'draft',required:false}).in('id',oldIds)
        if(archiveError)throw archiveError
      }
      setSuccess(count+' diapositivas '+(existingBlocks.length?'publicadas en una nueva versión; se conserva el historial anterior.':'incorporadas.')+' Durante la capacitación se intercalarán como máximo dos preguntas aleatorias, sin repetirlas al retroceder.')
      setFiles([])
      await refresh()
      setMessage('Presentación interactiva lista: '+count+' diapositivas y hasta dos preguntas aleatorias del banco existente.')
    }catch(e){
      if(createdPhase)await supabase.from('course_phases').delete().eq('id',createdPhase)
      setError(getError(e,'No fue posible preparar el paquete de diapositivas.'))
    }finally{setBusy('')}
  }

  let format=''
  if(files.length) {
    try { format=classifyGuidedUpload(files) } catch(e) { format=getError(e) }
  }
  const formatLabel={pdf:'PDF por páginas',zip:'ZIP de imágenes',images:'Imágenes individuales'}[format] || format

  return <section className="guided-slide-importer" aria-label="Presentación con preguntas del banco existente">
    <div className="guided-slide-heading">
      <span className="guided-slide-mark"><Images size={22}/></span>
      <div>
        <span className="eyebrow">Presentación interactiva · sin generar preguntas</span>
        <h3>Carga PDF, imágenes o un paquete ZIP</h3>
        <p>Aula EI detecta cada página o imagen, las ordena y las presenta una a una. Durante la capacitación aparecen como máximo dos preguntas aleatorias del banco existente, repartidas por el recorrido, sin generar preguntas nuevas ni interrumpir cada diapositiva.</p>
      </div>
    </div>
    {already && <div className="guided-slide-ready"><CheckCircle2 size={18}/>
      Hay {existingBlocks.length} diapositivas activas. Puedes cargar las imágenes actualizadas:
      si el número es igual, se sustituyen sin borrar el avance; si cambia, se publica una nueva versión manteniendo el historial.
    </div>}
    <>
      <label className="guided-slide-file"><Upload size={17}/>
        <span>{files.length ? files.length+' archivo(s) seleccionado(s)' : 'Seleccionar PDF, ZIP o varias imágenes PNG, JPG, WebP'}</span>
        <input type="file" accept=".pdf,.zip,.png,.jpg,.jpeg,.webp,application/pdf,application/zip,image/png,image/jpeg,image/webp"
          multiple disabled={Boolean(busy)} onChange={e=>choose(e.target.files)}/>
      </label>
      <label className="guided-slide-file"><FolderOpen size={17}/>
        <span>O seleccionar una carpeta de imágenes del equipo</span>
        <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple webkitdirectory=""
          disabled={Boolean(busy)} onChange={e=>choose(e.target.files)}/>
      </label>
      {files.length>0 && <div className="guided-slide-ready">
        <Images size={18}/> Origen: {formatLabel}. El visor contará las páginas o imágenes al importar y las mostrará en orden natural (1, 2, 3…).
      </div>}
      <div className="guided-slide-options">
        <span><BookOpenCheck size={16}/> Preguntas activas de la capacitación: <strong>{available}</strong></span>
        {available===0 && <span className="guided-slide-warning">El curso todavía no tiene preguntas activas. Incorpora tu banco existente antes de activar el modo interactivo; no se generará ninguna pregunta.</span>}
        {courseStatus==='published' && <span className="guided-slide-warning">Al publicar diapositivas obligatorias adicionales puede cambiar el progreso pendiente de los trabajadores.</span>}
      </div>
      <button className="primary-button" type="button" disabled={!files.length||Boolean(busy)||available===0}
        onClick={create}>
        {busy?<Loader2 size={17} className="spin"/>:<Images size={17}/>}
        {busy||'Crear presentación interactiva'}
      </button>
    </>
    <p className="guided-slide-fineprint"><FileText size={14}/>
      Canva no permite detectar los cambios de página dentro de su visor externo. Descarga desde Canva un PDF, o desde Google Drive la carpeta como ZIP y súbela aquí. Un enlace de carpeta de Drive no proporciona por sí solo un listado autorizado de sus imágenes.
    </p>
    {error&&<div className="guided-slide-error" role="alert">{error}</div>}
    {success&&<div className="guided-slide-ready" role="status"><CheckCircle2 size={17}/>{success}</div>}
  </section>
}
