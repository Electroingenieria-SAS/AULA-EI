import React, { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, FileText, FolderOpen, Images, Loader2, Upload, X } from 'lucide-react'
import { getError, slugify, supabase } from '../shared.js'
import { normalizeCanvaEmbedUrl } from '../../../src/canva-embed.js'
import { renderGuidedMedia, classifyGuidedUpload } from './guided-image-pack.js'
import { saveGuidedSlides } from './guided-slide-utils.js'
import '../styles/canva-import.css'

function assertSaved(result,label) {
  if(result.error) throw new Error(label+': '+result.error.message)
  return result.data
}

export default function CanvaImportWizard({close,onCreated}) {
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [url,setUrl]=useState('')
  const [files,setFiles]=useState([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const embed=useMemo(()=>normalizeCanvaEmbedUrl(url),[url])
  const selectFiles=list=>{setFiles(Array.from(list||[]).filter(f=>f&&f.size));setError('')}
  let origin=''
  try {origin=files.length?classifyGuidedUpload(files):''}
  catch(e) {origin=getError(e)}

  const saveDraft=async()=>{
    if(!title.trim()||!files.length||busy) return
    setBusy('Contando diapositivas y preparando imágenes…')
    setError('')
    let createdId=null
    try {
      const {slides,source}=await renderGuidedMedia(files,setBusy)
      if(!slides.length) throw Error('No se encontraron páginas o imágenes.')
      const course=assertSaved(await supabase.from('courses').insert({
        title:title.trim().slice(0,100),
        description:description.trim()||'Capacitación con presentación interactiva por diapositivas.',
        slug:slugify(title.trim())+'-'+crypto.randomUUID().slice(0,8),
        passing_score:80,
        status:'draft',
      }).select('id').single(),'Crear capacitación')
      createdId=course.id
      const phase=assertSaved(await supabase.from('course_phases').insert({
        course_id:createdId,
        title:'Presentación interactiva · '+slides.length+' diapositivas',
        description:'Cada avance presenta una pregunta del banco del curso, sin generarlas automáticamente.',
        sort_order:0,
      }).select('id').single(),'Crear módulo')
      await saveGuidedSlides({courseId:createdId,phaseId:phase.id,slides,source,onProgress:setBusy})
      if(embed) {
        const appendix=assertSaved(await supabase.from('course_phases').insert({
          course_id:createdId,
          title:'Canva original (material de consulta)',
          sort_order:1,
        }).select('id').single(),'Guardar enlace de referencia')
        assertSaved(await supabase.from('content_blocks').insert({
          phase_id:appendix.id,
          type:'presentation',
          title:'Abrir presentación original en Canva',
          description:'Referencia complementaria. El recorrido interactivo se realiza con las imágenes cargadas.',
          content:{url:embed,provider:'canva'},
          required:false,sort_order:0,status:'published',
          completion_rule:{mode:'manual'},
        }),'Guardar presentación original')
      }
      await onCreated(createdId,
        'Importadas '+slides.length+' diapositivas como borrador. No se generaron preguntas: agrega o importa el banco de este curso antes de publicar. Las preguntas se mostrarán al avanzar.')
    } catch(err) {
      const message=getError(err,'No fue posible importar las diapositivas.')
      setError(message)
      if(createdId) await onCreated(createdId,'La importación quedó incompleta: '+message+'. Revisa el borrador.')
    }finally{setBusy('')}
  }

  return <div className="modal-backdrop canva-import-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)close()}}>
    <section className="canva-import-dialog" role="dialog" aria-modal="true" aria-labelledby="canva-import-title">
      <header className="canva-import-header">
        <div>
          <span className="eyebrow"><Images size={15}/> Importación de diapositivas</span>
          <h2 id="canva-import-title">Crear capacitación desde PDF o imágenes</h2>
          <p>Sube una sola presentación PDF, un ZIP de imágenes o selecciona varias imágenes. Aula EI detectará y ordenará las diapositivas. Las preguntas emergentes se toman del banco del curso, nunca se generan desde las imágenes.</p>
        </div>
        <button type="button" className="icon-button" aria-label="Cerrar importación" disabled={Boolean(busy)} onClick={close}><X size={19}/></button>
      </header>
      <div className="canva-import-content">
        <div className="canva-import-column">
          <section className="canva-import-section">
            <div className="canva-import-step"><span>1</span><div><strong>Datos de la capacitación</strong><small>El curso se guarda primero como borrador.</small></div></div>
            <label>Título
              <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} placeholder="Ej. Seguridad y Salud en el Trabajo"/>
            </label>
            <label>Descripción
              <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Propósito de la capacitación"/>
            </label>
            <label>Enlace de Canva (opcional, solo referencia)
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.canva.com/design/.../view?embed"/>
              <small>El enlace no permite detectar cuándo se cambia de página dentro de Canva. El recorrido con preguntas utilizará las páginas importadas a Aula EI.</small>
            </label>
            {url.trim()&&!embed && <p className="canva-import-alert"><CircleAlert size={16}/> Enlace de inserción de Canva no reconocido; déjalo vacío o corrígelo.</p>}
          </section>
        </div>
        <div className="canva-import-column">
          <section className="canva-import-section">
            <div className="canva-import-step"><span>2</span><div><strong>Subir las diapositivas</strong><small>Sin interpretación del contenido, sin IA y sin API de pago.</small></div></div>
            <label className="canva-import-file">
              <Upload size={24}/>
              <span>{files.length ? files.length+' archivo(s) seleccionado(s)' : 'Seleccionar PDF, ZIP o varias imágenes'}</span>
              <small>Hasta 50 páginas o imágenes. PDF de hasta 12 MB. Las imágenes deben ser PNG, JPG o WebP.</small>
              <input type="file" accept=".pdf,.zip,.png,.jpg,.jpeg,.webp,application/pdf,application/zip,image/png,image/jpeg,image/webp" multiple hidden
                disabled={Boolean(busy)} onChange={e=>selectFiles(e.target.files)}/>
            </label>
            <label className="canva-import-file">
              <FolderOpen size={23}/>
              <span>O elegir una carpeta de imágenes del equipo</span>
              <small>Se utilizará el orden numérico de los nombres de archivo.</small>
              <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple webkitdirectory="" hidden
                disabled={Boolean(busy)} onChange={e=>selectFiles(e.target.files)}/>
            </label>
            <div className="canva-import-review">
              <div className="canva-import-review-title"><FileText size={18}/><strong>{files.length ? 'Formato detectado: '+origin : 'Sin archivos seleccionados'}</strong></div>
              <small>Si tienes las imágenes en Google Drive, descarga la carpeta como ZIP y adjúntala aquí. Un enlace de carpeta no permite enumerar imágenes sin autorización de la API de Drive.</small>
            </div>
          </section>
          <section className="canva-import-section">
            <div className="canva-import-step"><span>3</span><div><strong>Preguntas existentes</strong><small>No se crearán preguntas ni se modificarán evaluaciones de otros cursos.</small></div></div>
            <p>Una vez importado el paquete, entra a «Examen final» y agrega o importa tus preguntas existentes. Aula EI las utilizará aleatoriamente en cada transición, como práctica, y seguirá manteniendo separado el examen oficial.</p>
            <p><CheckCircle2 size={16}/> Para una capacitación que ya tiene preguntas, utiliza «Ruta de aprendizaje → Presentación interactiva» dentro de ese curso, sin crear uno nuevo.</p>
          </section>
        </div>
      </div>
      {error&&<div role="alert" className="canva-import-error"><CircleAlert size={17}/>{error}</div>}
      <footer className="canva-import-footer">
        <span><FileText size={16}/> El PDF o paquete se reproduce dentro de Aula EI, no dentro del iframe de Canva.</span>
        <div>
          <button className="secondary-button" disabled={Boolean(busy)} onClick={close}><ArrowLeft size={16}/> Cancelar</button>
          <button className="primary-button" disabled={Boolean(busy)||!title.trim()||!files.length} onClick={saveDraft}>
            {busy?<Loader2 size={17} className="spin"/>:<ArrowRight size={17}/>}
            {busy||'Crear capacitación interactiva'}
          </button>
        </div>
      </footer>
    </section>
  </div>
}
