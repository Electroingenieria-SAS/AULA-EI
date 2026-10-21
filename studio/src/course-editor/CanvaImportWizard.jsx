import React, { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleAlert, ExternalLink, FileText, Loader2, Presentation, Sparkles, Upload, X } from 'lucide-react'
import { getError, slugify, supabase } from '../shared.js'
import { normalizeCanvaEmbedUrl } from '../../../src/canva-embed.js'
import { prepareCanvaPages, prepareCanvaQuestions } from './canva-import-model.js'
import '../styles/canva-import.css'

const MAX_PDF_BYTES = 4 * 1024 * 1024

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const parts = []
  for (let i = 0; i < bytes.length; i += 8192) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
  }
  return btoa(parts.join(''))
}

function assertSaved(result, label) {
  if (result.error) throw new Error(label + ': ' + result.error.message)
  return result.data
}

function questionIsReady(question) {
  return question.prompt.trim() && question.options.length === 4 &&
    question.options.every((option) => option.trim()) &&
    Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex <= 3
}

export default function CanvaImportWizard({ close, onCreated }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pdf, setPdf] = useState(null)
  const [consent, setConsent] = useState(false)
  const [pages, setPages] = useState([])
  const [questions, setQuestions] = useState([])
  const [analysed, setAnalysed] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const embed = useMemo(() => normalizeCanvaEmbedUrl(url), [url])
  const chosen = questions.filter((q) => q.selected)
  const hasAnalysis = pages.length > 0
  const resetAnalysis = () => { setPages([]); setQuestions([]); setAnalysed(false) }

  const analyzePdf = async () => {
    if (!pdf || !title.trim()) return setError('Escribe el título y adjunta el PDF exportado desde Canva.')
    if (pdf.size > MAX_PDF_BYTES) return setError('El PDF debe pesar máximo 4 MB. Divide una presentación muy larga en partes.')
    if (!consent) return setError('Confirma que el PDF puede enviarse al servicio de IA para generar sugerencias.')
    setError('')
    setBusy('Analizando páginas y preparando preguntas…')
    try {
      const pdf_base64 = await fileToBase64(pdf)
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-course-pdf', {
        body: { title: title.trim(), pdf_base64, consent: true },
      })
      if (invokeError) {
        const response = invokeError.context
        let remoteMessage = ''
        if (response && typeof response.json === 'function') {
          try { remoteMessage = (await response.json())?.error || '' } catch {}
        }
        throw new Error(remoteMessage || invokeError.message || 'El análisis no está disponible.')
      }
      if (data?.error) throw new Error(data.error)
      const preparedPages = prepareCanvaPages(data?.pages)
      if (!preparedPages.length) throw new Error('No se encontraron diapositivas con texto interpretable. Puedes importar el enlace sin IA.')
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
    setBusy('Creando capacitación en borrador…')
    setError('')
    let createdId = null
    try {
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
        sort_order: 0,
      }).select('id').single(), 'Crear módulo')

      const blocks = [{
        phase_id: phase.id,
        type: 'presentation',
        title: 'Presentación interactiva de Canva',
        description: 'Explora el material original antes de estudiar las explicaciones.',
        content: { url: embed, provider: 'canva' },
        required: true,
        sort_order: 0,
        status: 'published',
        completion_rule: { mode: 'manual' },
      }]
      pages.forEach((page, index) => blocks.push({
        phase_id: phase.id,
        type: 'text',
        title: 'Diapositiva ' + page.page + ' · ' + page.title,
        description: 'Idea principal: ' + page.takeaway,
        content: { html: page.explanation, source_provider: 'canva_pdf', source_page: page.page },
        required: true,
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
      await onCreated(createdId, 'Importación creada como borrador. Revisa el contenido y completa manualmente el examen antes de publicar.')
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
          <p>Conserva la presentación original y prepara lecturas y preguntas sugeridas, siempre bajo tu revisión.</p>
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
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Puedes escribirla o generarla al analizar el PDF."/>
            </label>
            {url.trim() && !embed && <p className="canva-import-alert"><CircleAlert size={16}/> El enlace no corresponde a una inserción válida de un diseño Canva.</p>}
          </section>

          <section className="canva-import-section">
            <div className="canva-import-step"><span>2</span><div><strong>Lecturas y preguntas sugeridas</strong><small>Adjunta el PDF exportado desde la misma presentación para analizar las páginas.</small></div></div>
            <label className="canva-import-file">
              <Upload size={24} />
              <span>{pdf ? pdf.name : 'Seleccionar PDF de la presentación'}</span>
              <small>Opcional · hasta 4 MB. El enlace sin PDF también permite crear el curso.</small>
              <input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { setPdf(e.target.files?.[0] || null); resetAnalysis(); setConsent(false) }}/>
            </label>
            {pdf && <label className="canva-import-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}/><span>Autorizo el envío de este PDF al proveedor de IA configurado para analizarlo. No incluir información confidencial sin autorización.</span></label>}
            <button type="button" className="secondary-button canva-analyze-button" disabled={Boolean(busy) || !pdf || !consent || !title.trim()} onClick={analyzePdf}>
              {busy.startsWith('Analizando') ? <Loader2 size={17} className="spin"/> : <Sparkles size={17}/>}
              {busy.startsWith('Analizando') ? busy : analysed ? 'Volver a generar sugerencias' : 'Analizar PDF y sugerir contenido'}
            </button>
          </section>
        </div>

        <div className="canva-import-column">
          <section className="canva-import-section">
            <div className="canva-import-step"><span>3</span><div><strong>Vista previa y revisión</strong><small>Lo generado no modifica el examen hasta que selecciones preguntas.</small></div></div>
            {embed ? <div className="canva-import-embed"><iframe src={embed} title="Vista previa de Canva" loading="lazy" allowFullScreen /><a href={embed} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir original</a></div> : <div className="canva-import-preview-placeholder"><Presentation size={34}/><span>La presentación aparecerá cuando pegues un enlace válido.</span></div>}
            {hasAnalysis && <div className="canva-import-review">
              <div className="canva-import-review-title"><BookOpen size={18}/><strong>{pages.length} explicaciones generadas</strong></div>
              <small>Edita cualquier explicación antes de incorporarla al curso.</small>
              {pages.map((page, index) => <details key={page.page + '-' + index}>
                <summary>Diapositiva {page.page}: {page.title}</summary>
                <label>Título<input value={page.title} onChange={(e) => changePage(index, {title:e.target.value})}/></label>
                <label>Explicación<textarea rows={4} value={page.explanation} onChange={(e) => changePage(index, {explanation:e.target.value})}/></label>
                <label>Idea clave<input value={page.takeaway} onChange={(e) => changePage(index, {takeaway:e.target.value})}/></label>
              </details>)}
            </div>}
            {analysed && <div className="canva-import-review">
              <div className="canva-import-review-title"><Check size={18}/><strong>{chosen.length} de {questions.length} preguntas elegidas</strong></div>
              <small>Solo las seleccionadas se incorporarán al banco de preguntas, no se publicará el examen.</small>
              {questions.map((question, index) => <details key={index}>
                <summary><input type="checkbox" checked={question.selected} onClick={(e) => e.stopPropagation()} onChange={(e) => changeQuestion(index, {selected:e.target.checked})}/> Diapositiva {question.page} · {question.prompt}</summary>
                <label>Pregunta<textarea rows={2} value={question.prompt} onChange={(e) => changeQuestion(index, {prompt:e.target.value})}/></label>
                {question.options.map((option, optionIndex) => <label key={optionIndex}>Opción {String.fromCharCode(65 + optionIndex)}<input value={option} onChange={(e) => changeQuestion(index, {options:question.options.map((v,i)=>i===optionIndex?e.target.value:v)})}/></label>)}
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
