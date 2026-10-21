import React, { useState } from 'react'
import { BookOpenCheck, CheckCircle2, FileText, Images, Loader2, Sparkles, Upload } from 'lucide-react'
import { getError, supabase } from '../shared.js'
import { hasGuidedSlides, renderGuidedSlideBlobs, saveGuidedSlides } from './guided-slide-utils.js'
import '../styles/guided-slides.css'

export default function GuidedSlideImporter({courseId, courseStatus, phases, questions, refresh, setMessage}) {
  const [file,setFile]=useState(null)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const already=hasGuidedSlides(phases)
  const available=(questions||[]).filter(q=>q.active!==false && (q.options||[]).length>=4).length

  const create=async()=>{
    if(!file || busy || already)return
    setError('')
    setSuccess('')
    let createdPhase=null
    setBusy('Preparando diapositivas…')
    try {
      const slides=await renderGuidedSlideBlobs(file,setBusy)
      if(!slides.length)throw Error('El documento no contiene diapositivas.')
      const firstOrder=Math.min(0,...phases.map(x=>Number(x.sort_order)||0)) - 1
      const {data,error:phaseError}=await supabase.from('course_phases')
        .insert({course_id:courseId,title:'Presentación interactiva · preguntas por diapositiva',
          description:'Diapositivas de Canva exportadas en PDF. Aparece una pregunta aleatoria al avanzar.',
          sort_order:firstOrder}).select('id').single()
      if(phaseError)throw phaseError
      createdPhase=data.id
      const count=await saveGuidedSlides({courseId,phaseId:createdPhase,slides,onProgress:setBusy})
      setSuccess('Se incorporaron '+count+' diapositivas interactivas. Al pulsar Siguiente se abrirá una pregunta aleatoria del banco de preguntas.')
      setFile(null)
      await refresh()
      setMessage(count+' diapositivas listas. Revisa el examen para confirmar que haya preguntas activas.')
    }catch(e){
      if(createdPhase)await supabase.from('course_phases').delete().eq('id',createdPhase)
      setError(getError(e,'No fue posible preparar las diapositivas interactivas.'))
    }finally{setBusy('')}
  }

  return <section className="guided-slide-importer" aria-label="Preguntas emergentes entre diapositivas">
    <div className="guided-slide-heading">
      <span className="guided-slide-mark"><Images size={22}/></span>
      <div>
        <span className="eyebrow">Modo interactivo · 100 % gratis</span>
        <h3>Preguntas emergentes entre diapositivas</h3>
        <p>Conserva la apariencia de Canva utilizando el PDF exportado. AULA EI mostrará cada página como una diapositiva independiente y, al avanzar, abrirá una pregunta aleatoria de las que aprobaste en el examen.</p>
      </div>
    </div>
    {already ? <div className="guided-slide-ready"><CheckCircle2 size={18}/> Este curso ya tiene diapositivas interactivas. Puedes revisarlas en la ruta de aprendizaje.</div> : <>
      <label className="guided-slide-file"><Upload size={17}/>
        <span>{file ? file.name : 'Adjuntar PDF de Canva (hasta 12 MB, máximo 50 páginas)'}</span>
        <input type="file" accept="application/pdf,.pdf" disabled={Boolean(busy)} onChange={e=>setFile(e.target.files?.[0]||null)}/>
      </label>
      <div className="guided-slide-options">
        <span><BookOpenCheck size={16}/> Preguntas activas disponibles: <strong>{available}</strong></span>
        {available===0 && <span className="guided-slide-warning">Primero incorpora preguntas completas desde «Examen final → Sugerir desde PDF», para que aparezcan en los pop-ups.</span>}
        {courseStatus==='published' && <span className="guided-slide-warning">Esta capacitación ya está publicada. Añadir diapositivas obligatorias cambiará el progreso de quienes la están cursando.</span>}
      </div>
      <button className="primary-button" type="button" disabled={!file||Boolean(busy)||available===0} onClick={create}>
        {busy?<Loader2 size={17} className="spin"/>:<Sparkles size={17}/>}
        {busy || 'Activar preguntas entre diapositivas'}
      </button>
    </>}
    <p className="guided-slide-fineprint"><FileText size={14}/> Los cambios de página dentro del iframe externo de Canva no se pueden detectar. El modo guiado usa las imágenes extraídas del PDF y respeta la navegación y las preguntas del reproductor de AULA EI.</p>
    {error&&<div className="guided-slide-error" role="alert">{error}</div>}
    {success&&<div className="guided-slide-ready" role="status"><CheckCircle2 size={17}/>{success}</div>}
  </section>
}
