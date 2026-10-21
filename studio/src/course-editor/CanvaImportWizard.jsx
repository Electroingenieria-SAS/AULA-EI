import React, { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleAlert, ExternalLink, FileText, Loader2, Presentation, Sparkles, Upload, X } from 'lucide-react'
import { getError, slugify, supabase } from '../shared.js'
import { normalizeCanvaEmbedUrl } from '../../../src/canva-embed.js'
import { prepareCanvaPages, prepareCanvaQuestions } from './canva-import-model.js'
import { renderGuidedSlideBlobs, saveGuidedSlides } from './guided-slide-utils.js'
import '../styles/canva-import.css'

const MAX_LOCAL_PDF_BYTES = 12 * 1024 * 1024


function assertSaved(result, label) {
  if (result.error) throw new Error(label + ': ' + result.error.message)
  return result.data
}

function questionIsReady(question) {
  return question.prompt.trim() && question.options.length === 4 &&
    question.options.every((option) => option.trim()) &&
    new Set(question.options.map(option => option.trim().toLocaleLowerCase('es'))).size === 4 &&
    Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex <= 3
}

export default function CanvaImportWizard({ close, onCreated }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pdf, setPdf] = useState(null)
  const [pages, setPages] = useState([])
  const [questions, setQuestions] = useState([])
  const [analysed, setAnalysed] = useState(false)
  const [guidedSlides, setGuidedSlides] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const embed = useMemo(() => normalizeCanvaEmbedUrl(url), [url])
  const chosen = questions.filter((q) => q.selected)
  const hasAnalysis = pages.length > 0
  const resetAnalysis = () => { setPages([]); setQuestions([]); setAnalysed(false) }

  const analyzePdf = async () => {
    if (!pdf || !title.trim()) return setError('Escribe el título y adjunta el PDF exportado desde Canva.')
    if (pdf.size > MAX_LOCAL_PDF_BYTES) return setError('El PDF debe pesar máximo 12 MB. Divide una presentación muy larga en partes.')
    setError('')
    setBusy('Leyendo páginas localmente…')
    try {
      const { analyzeLocalPdf } = await import('./local-pdf-analysis.js')
      const data = await analyzeLocalPdf(pdf)
      const preparedPages = prepareCanvaPages(data?.pages)
      if (!preparedPages.length) throw new Error('El PDF no contiene suficientes diapositivas con texto. Puedes importar la presentación sin generar preguntas.')
      setPages(preparedPages)
      setQuestions(prepareCanvaQuestions(data?.suggested_questions))
      if (!description.trim()) setDescription(String(data.description || '').slice(0, 2000))
      setAnalysed(true)
    } catch (reason) {
      setError(getError(reason, 'No fue posible analizar el material.'))
    } finally { setBusy('') }
  }

  const changeQuestion = (index, patch) => setQuestions((list) => list.map((item, i) => i === index ? { ...item, ...patch } : item))
  const changePage = (index, patch) => setPages((list) => list.map((item, i) => i === index ? { ...item, ...patch } : item))

  const saveDraft = async () => {
    if (!embed || !title.trim()) return setError('Se necesita un enlace válido de Canva y un título.')
    if (chosen.some((question) => !questionIsReady(question))) return setError('Corrige todas las preguntas seleccionadas antes de guardar.')
    if (guidedSlides && pdf && chosen.length === 0) return setError('Para abrir preguntas emergentes, selecciona al menos una pregunta completa o desactiva el modo guiado.')
    setBusy('Creando capacitación en borrador…')
    setError('')
    let createdId = null
    try {
      const enableGuided = Boolean(guidedSlides && pdf)
      const renderedSlides = enableGuided ? await renderGuidedSlideBlobs(pdf,setBusy) : []
      const slug = slugify(title.trim()) + '-' + crypto.randomUUID().slice(0, 8)
      const course = assertSaved(await supabase.from('courses')
        .insert({
          title: title.trim().slice(0, 100),
          description: description.trim() || 'Capacitación importada desde Canva. Revisa y completa los contenidos antes de publicar.',
          slug,
          passing_score: 80,
          status: 'draft',
        }).select('id').single(), 'Crear capacitación')
      createdId = course.id

      const phase = assertSaved(await supabase.from('course_phases').insert({
        course_id: createdId,
        title: 'Presentación y material de estudio',
        sort_order: renderedSlides.length ? 1 : 0,
      }).select('id').single(), 'Crear módulo')

      const blocks = [{
        phase_id: phase.id,
        type: 'presentation',
        title: 'Presentación interactiva de Canva',
        description: 'Explora el material original y las notas extraídas del PDF.',
        content: { url: embed, provider: 'canva' },
        required: !renderedSlides.length,
        sort_order: 0,
        status: 'published',
        completion_rule: { mode: 'manual' },
      }]
      pages.forEach((page, index) => blocks.push({
        phase_id: phase.id,
        type: 'text',
        title: 'Diapositiva ' + page.page + ' · ' + page.title,
        description: 'Idea principal: ' + page.takeaway,
        content: { html: '<p>' + page.explanation.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;') + '</p>', source_provider: 'local_pdf', source_page: page.page },
        required: !renderedSlides.length,
        sort_order: index + 1,
        status: 'published',
        completion_rule: { mode: 'manual' },
      }))
      assertSaved(await supabase.from('content_blocks').insert(blocks), 'Crear contenidos')
      for (let i = 0; i < chosen.length; i += 1) {
        const item = chosen[i]
        const question = assertSaved(await supabase.from('questions').insert({
          course_id: createdId,
          prompt: item.prompt.trim(),
          sort_order: i,
          active: true,
        }).select('id').single(), 'Crear pregunta ' + (i + 1))
        assertSaved(await supabase.from('question_options').insert(item.options.map((option, index) => ({
          question_id: question.id,
          label: option.trim(),
          sort_order: index,
          is_correct: index === item.correctIndex,
        }))), 'Guardar respuestas')
      }
      if (renderedSlides.length) {
        setBusy('Preparando el reproductor interactivo…')
        const visualPhase = assertSaved(await supabase.from('course_phases').insert({
          course_id:createdId,
          title:'Diapositivas interactivas · preguntas aleatorias',
          description:'Cada diapositiva se recorre dentro de AULA EI y abre una pregunta emergente al avanzar.',
          sort_order:0,
        }).select('id').single(),'Crear fase interactiva')
        await saveGuidedSlides({courseId:createdId,phaseId:visualPhase.id,slides:renderedSlides,onProgress:setBusy})
      }
      await onCreated(createdId, 'Importación creada como borrador. El modo interactivo presenta preguntas al avanzar entre diapositivas. Revisa y publica cuando esté listo.')
    } catch (reason) {
      const message = getError(reason, 'No fue posible importar esta capacitación.')
      setError(message)
      if (createdId) {
        await onCreated(createdId, 'Se creó un borrador parcial. Revisa su contenido antes de continuar. Detalle: ' + message)
      }
    } finally { setBusy('') }
  }

  return <div className="modal-backdrop canva-import-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) close() }}>
    <section className="canva-import-dialog" role="dialog" aria-modal="true" aria-labelledby="canva-import-title">
      <header className="canva-import-header">
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Importación guiada · Canva</span>
          <h2 id="canva-import-title">Convierte tus diapositivas en capacitación</h2>
          <p>Conserva la presentación original. El PDF se analiza frase por frase para proponer preguntas editables, incluso desde listas y frases cortas, sin servicios de pago.</p>
        </div>
        <button type="button" className="icon-button" aria-label="Cerrar importación" disabled={Boolean(busy)} onClick={close}><X size={19}/></button>
      </header>

      <div className="canva-import-content">
        <div className="canva-import-column">
          <section className="canva-import-section">
            <div className="canva-import-step"><span>1</span><div><strong>Presentación de Canva</strong><small>Canva → Compartir → Ver todo → Insertar → copiar enlace de inserción.</small></div></div>
            <label>Título de la capacitación
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Ej. Inducción en seguridad industrial" />
            </label>
            <label>Enlace público de Canva
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.canva.com/design/.../view?embed" />
              <small>Admite también el código iframe copiado desde Canva. Los enlaces privados o sin publicar no se podrán reproducir.</small>
            </label>
            <label>Descripción del curso
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe los objetivos y el propósito de esta capacitación."/>
            </label>
            {url.trim() && !embed && <p className="canva-import-alert"><CircleAlert size={16}/> El enlace no corresponde a una inserción válida de un diseño Canva.</p>}
          </section>

          <section className="canva-import-section">
            <div className="canva-import-step"><span>2</span><div><strong>Lecturas y preguntas sugeridas</strong><small>El texto se extrae en el navegador mediante PDF.js, sin enviar el documento a ninguna API.</small></div></div>
            <label className="canva-import-file">
              <Upload size={24} />
              <span>{pdf ? pdf.name : 'Seleccionar PDF de la presentación'}</span>
              <small>Opcional · hasta 12 MB, 50 páginas. El PDF se analiza localmente, sin API, créditos ni cargos.</small>
              <input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { setPdf(e.target.files?.[0] || null); resetAnalysis(); }}/>
            </label>
            
            {pdf && analysed && <label className="canva-import-consent">
              <input type="checkbox" checked={guidedSlides} onChange={(e)=>setGuidedSlides(e.target.checked)}/>
              <span>Activar presentación guiada con preguntas aleatorias emergentes al avanzar de diapositiva. AULA EI usará imágenes del PDF, manteniendo el enlace original de Canva como recurso adicional.</span>
            </label>}
            <button type="button" className="secondary-button canva-analyze-button" disabled={Boolean(busy) || !pdf || !title.trim()} onClick={analyzePdf}>
              {busy.startsWith('Leyendo') ? <Loader2 size={17} className="spin"/> : <Sparkles size={17}/>}
              {busy.startsWith('Analizando') ? busy : analysed ? 'Volver a generar sugerencias' : 'Leer PDF y sugerir preguntas'}
            </button>
          </section>
        </div>

        <div className="canva-import-column">
          <section className="canva-import-section">
            <div className="canva-import-step"><span>3</span><div><strong>Vista previa y revisión</strong><small>Lo generado no modifica el examen hasta que selecciones preguntas.</small></div></div>
            {embed ? <div className="canva-import-embed"><iframe src={embed} title="Vista previa de Canva" loading="lazy" allowFullScreen /><a href={embed} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir original</a></div> : <div className="canva-import-preview-placeholder"><Presentation size={34}/><span>La presentación aparecerá cuando pegues un enlace válido.</span></div>}
            {hasAnalysis && <div className="canva-import-review">
              <div className="canva-import-review-title"><BookOpen size={18}/><strong>{pages.length} transcripciones extraídas</strong></div>
              <small>Son transcripciones del texto del PDF, no explicaciones generadas por IA. Revísalas antes de agregarlas.</small>
              {pages.map((page, index) => <details key={page.page + '-' + index}>
                <summary>Diapositiva {page.page}: {page.title}</summary>
                <label>Título<input value={page.title} onChange={(e) => changePage(index, {title:e.target.value})}/></label>
                <label>Explicación<textarea rows={4} value={page.explanation} onChange={(e) => changePage(index, {explanation:e.target.value})}/></label>
                <label>Idea clave<input value={page.takeaway} onChange={(e) => changePage(index, {takeaway:e.target.value})}/></label>
              </details>)}
            </div>}
            {analysed && <div className="canva-import-review">
              <div className="canva-import-review-title"><Check size={18}/><strong>{chosen.length} de {questions.length} preguntas elegidas</strong></div>
              <small>Las alternativas A, B, C y D y la respuesta correcta se proponen automáticamente a partir del PDF. Revisa las respuestas y completa cualquier alternativa faltante antes de guardar.</small>
              {questions.map((question, index) => <details key={index}>
                <summary><input type="checkbox" checked={question.selected} onClick={(e) => e.stopPropagation()} onChange={(e) => changeQuestion(index, {selected:e.target.checked})}/> Diapositiva {question.page} · {question.kind} {question.options.some(option => !option.trim()) ? '· Requiere completar alternativas' : ''} · {question.prompt}</summary>
                {question.sourceExcerpt && <p className="canva-question-evidence">Fundamento de la diapositiva: {question.sourceExcerpt}</p>}
                <label>Pregunta<textarea rows={2} value={question.prompt} onChange={(e) => changeQuestion(index, {prompt:e.target.value})}/></label>
                {question.options.map((option, optionIndex) => <label key={optionIndex}>Opción {String.fromCharCode(65 + optionIndex)}<input value={option} placeholder={option.trim() ? '' : 'Escribe una alternativa'} onChange={(e) => changeQuestion(index, {options:question.options.map((v,i)=>i===optionIndex?e.target.value:v)})}/></label>)}
                <p className="canva-answer-hint">Respuesta correcta propuesta: {String.fromCharCode(65+question.correctIndex)} · {question.options[question.correctIndex]}</p>
                <label>Respuesta correcta<select value={question.correctIndex} onChange={(e) => changeQuestion(index, {correctIndex:Number(e.target.value)})}>{question.options.map((_,i)=><option value={i} key={i}>{String.fromCharCode(65+i)}</option>)}</select></label>
              </details>)}
            </div>}
          </section>
        </div>
      </div>

      {error && <div role="alert" className="canva-import-error"><CircleAlert size={17}/>{error}</div>}
      <footer className="canva-import-footer">
        <span><FileText size={16}/> Siempre se creará como borrador. El examen final queda bajo control del administrador.</span>
        <div>
          <button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={close}><ArrowLeft size={16}/> Cancelar</button>
          <button type="button" className="primary-button" disabled={Boolean(busy) || !embed || !title.trim()} onClick={saveDraft}>
            {busy ? <Loader2 size={17} className="spin"/> : <ArrowRight size={17}/>} {busy || 'Crear borrador de capacitación'}
          </button>
        </div>
      </footer>
    </section>
  </div>
}
