import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpenCheck, CheckCircle2, ExternalLink, FileQuestion, Link2, Loader2, Presentation, Sparkles, Upload } from 'lucide-react'
import { analyzeTrainingPdf } from './analyze-pdf-client.js'
import { prepareCanvaQuestions } from './canva-import-model.js'
import { normalizeCanvaEmbedUrl } from '../../../src/canva-embed.js'
import { getError, supabase } from '../shared.js'
import '../styles/ai-exam-assistant.css'

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

function isValidQuestion(q) {
  return q.prompt.trim().length >= 8
    && q.options.length === 4
    && q.options.every((option) => option.trim().length > 0)
    && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
}

export default function AiExamAssistant({ courseId, title, initialCanvaUrl = '', existingQuestions, refresh, setMessage, useInEditor }) {
  const [canvaUrl, setCanvaUrl] = useState(initialCanvaUrl)
  const validCanvaUrl = useMemo(() => normalizeCanvaEmbedUrl(canvaUrl), [canvaUrl])
  const [canvaConnection, setCanvaConnection] = useState({ loading: true, configured: false, connected: false, error: '' })
  const [file, setFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const knownPrompts = useMemo(
    () => new Set((existingQuestions || []).map((item) => normalize(item.prompt))),
    [existingQuestions],
  )
  const chosen = suggestions.filter((item) => item.selected && !item.saved && !knownPrompts.has(normalize(item.prompt)))
  const allSelectable = suggestions.filter((item) => !item.saved && !knownPrompts.has(normalize(item.prompt)))
  const canSave = chosen.length > 0 && chosen.every(isValidQuestion)

  useEffect(() => {
    let alive = true
    supabase.functions.invoke('aula-canva-connect', { body: {action:'status'} })
      .then(({data,error}) => {
        if (!alive) return
        if (error || data?.error) {
          setCanvaConnection({loading:false,configured:false,connected:false,error:'No se pudo consultar la conexión de Canva.'})
        } else {
          setCanvaConnection({loading:false,configured:Boolean(data?.configured),connected:Boolean(data?.connected),error:''})
        }
      }).catch(() => {
        if (alive) setCanvaConnection({loading:false,configured:false,connected:false,error:'No se pudo consultar Canva.'})
      })
    return () => { alive = false }
  }, [])

  const connectCanva = async () => {
    setBusy('Conectando con Canva…')
    setError('')
    try {
      const {data,error:invokeError}=await supabase.functions.invoke('aula-canva-connect',{body:{action:'start'}})
      if (invokeError || data?.error) throw new Error(data?.error || invokeError?.message || 'No fue posible iniciar sesión con Canva.')
      if (!data?.authorization_url?.startsWith('https://www.canva.com/api/oauth/authorize?')) throw new Error('Canva devolvió una URL de autorización inválida.')
      window.location.assign(data.authorization_url)
    } catch(err) {
      setError(getError(err,'No se pudo conectar Canva.'))
      setBusy('')
    }
  }

  const analyze = async () => {
    setBusy('Analizando material…')
    setError('')
    setNotice('')
    try {
      const analysis = await analyzeTrainingPdf({ file, canvaUrl: validCanvaUrl, title, consent })
      const next = prepareCanvaQuestions(analysis.suggested_questions)
      setSuggestions(next.map((item, index) => ({ ...item, localId: index, saved: false })))
      setLoaded(true)
      if (!next.length) setNotice('El PDF fue analizado, pero no generó preguntas válidas. Prueba con un documento de mejor calidad.')
      else setNotice(next.length + ' preguntas sugeridas. Todas están sin seleccionar hasta que las revises.')
    } catch (err) {
      setError(getError(err, 'No fue posible generar preguntas.'))
    } finally { setBusy('') }
  }

  const update = (localId, patch) => setSuggestions((items) =>
    items.map((item) => item.localId === localId ? { ...item, ...patch } : item))

  const selectAll = (checked) => setSuggestions((items) =>
    items.map((item) => item.saved || knownPrompts.has(normalize(item.prompt)) ? item : { ...item, selected: checked }))

  const save = async () => {
    if (!canSave) return setError('Revisa las preguntas seleccionadas y sus cuatro opciones antes de incorporarlas.')
    setBusy('Incorporando preguntas…')
    setError('')
    setNotice('')
    let savedCount = 0
    try {
      for (const item of chosen) {
        if (knownPrompts.has(normalize(item.prompt))) continue
        const { data, error: createError } = await supabase.from('questions')
          .insert({ course_id: courseId, prompt: item.prompt.trim(), sort_order: (existingQuestions || []).length + savedCount, active: false })
          .select('id').single()
        if (createError) throw createError
        const { error: optionsError } = await supabase.from('question_options')
          .insert(item.options.map((label, index) => ({
            question_id: data.id, label: label.trim(), sort_order: index, is_correct: index === item.correctIndex,
          })))
        if (optionsError) throw new Error('No se pudieron agregar las respuestas de una pregunta. Revisa el banco antes de reintentar: ' + optionsError.message)
        const { error: activateError } = await supabase.from('questions')
          .update({ active: true }).eq('id', data.id)
        if (activateError) throw new Error('La pregunta se guardó como inactiva. Revisa el banco antes de repetir: ' + activateError.message)
        savedCount += 1
        update(item.localId, { saved: true, selected: false })
      }
      setMessage(savedCount + ' preguntas incorporadas al banco. El examen continúa bajo tu control.')
      setNotice('Importación terminada. Puedes volver a generar sugerencias o editar las preguntas guardadas.')
    } catch (err) {
      setError('Importación parcial: ' + savedCount + ' preguntas incorporadas. ' + getError(err, 'Revisa el banco antes de repetir la operación.'))
    } finally {
      await refresh()
      setBusy('')
    }
  }

  return <section className="ai-exam-panel" aria-label="Asistente de preguntas basadas en Canva">
    <div className="ai-exam-heading">
      <span className="ai-exam-symbol"><Sparkles size={23}/></span>
      <div>
        <span className="eyebrow">Asistente pedagógico</span>
        <h3>Preguntas sugeridas desde tus diapositivas</h3>
        <p>Pega el enlace de Canva para consultar las diapositivas durante la revisión. Para generar preguntas a partir de su contenido, adjunta también el PDF exportado desde el mismo diseño.</p>
      </div>
    </div>
    <div className="ai-exam-canva-source">
      <label htmlFor="ai-exam-canva-url"><Link2 size={17}/> Enlace de tu presentación en Canva</label>
      <div className="ai-exam-link-row">
        <input id="ai-exam-canva-url" type="text" inputMode="url" spellCheck={false}
          aria-invalid={Boolean(canvaUrl.trim() && !validCanvaUrl)}
          value={canvaUrl} onChange={(e) => setCanvaUrl(e.target.value)}
          placeholder="Pega el enlace de Canva o su código de inserción"/>
        {validCanvaUrl && <a href={validCanvaUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Abrir</a>}
      </div>
      {canvaUrl.trim() && !validCanvaUrl &&
        <span role="alert" className="ai-exam-link-invalid">Utiliza un enlace completo de canva.com/design/... o el código de inserción proporcionado por Canva.</span>}
      {validCanvaUrl && <div className="ai-exam-link-preview">
        <div className="ai-exam-link-preview-top"><Presentation size={16}/><strong>Vista previa de la presentación</strong><span>Enlace válido</span></div>
        <iframe loading="lazy" title="Presentación Canva para revisar preguntas" src={validCanvaUrl} allowFullScreen/>
      </div>}
      <p className="ai-exam-link-help">Puedes analizar el enlace directamente si has conectado una cuenta de Canva con permisos sobre este diseño. AULA EI exportará temporalmente las diapositivas mediante la API oficial, sin pedirte el PDF manualmente.</p>
      {canvaConnection.loading ? <p className="ai-exam-connection"><Loader2 className="spin" size={15}/> Comprobando conexión de Canva…</p>
        : <div className="ai-exam-connection">
          {canvaConnection.connected ? <span className="ai-exam-connection-ok"><CheckCircle2 size={16}/> Cuenta de Canva conectada</span>
            : <span>{canvaConnection.configured ? 'Canva no está conectado a tu cuenta de AULA EI.' : 'La integración oficial de Canva todavía no está configurada.'}</span>}
          {canvaConnection.configured && !canvaConnection.connected && <button type="button" className="secondary-button compact" disabled={Boolean(busy)} onClick={connectCanva}><Link2 size={15}/> Conectar Canva</button>}
          {canvaConnection.error && <small>{canvaConnection.error}</small>}
        </div>}
    </div>
    <div className="ai-exam-upload-row">
      <label className="ai-exam-file">
        <Upload size={19}/>
        <span>{file ? file.name : 'Adjuntar PDF de la misma presentación (hasta 4 MB)'}</span>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setSuggestions([]); setLoaded(false); setConsent(false); setNotice(''); setError('') }}/>
      </label>
      <button className="primary-button" type="button" disabled={(!file && !validCanvaUrl) || !consent || Boolean(busy)}
        onClick={analyze}>{busy === 'Analizando material…' ? <Loader2 size={17} className="spin"/> : <Sparkles size={17}/>}
        {busy === 'Analizando material…' ? busy : file ? 'Analizar PDF y generar sugerencias' : 'Analizar enlace de Canva'}</button>
    </div>
    <label className="ai-exam-consent">
      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}/>
      Autorizo el análisis de este diseño de Canva o PDF y su envío al proveedor de IA para generar preguntas. No incluir información reservada sin autorización.
    </label>
    <div className="ai-exam-tip"><BookOpenCheck size={16}/> {validCanvaUrl && !file && !canvaConnection.connected ? 'Para analizar el enlace, primero debes conectar Canva. Como alternativa puedes adjuntar el PDF. ' : ''}Puedes revisar y modificar cada pregunta; ninguna se agrega automáticamente y el examen no se publica desde aquí.</div>
    {error && <div className="ai-exam-error" role="alert"><AlertCircle size={17}/>{error}</div>}
    {notice && <div className="ai-exam-notice" role="status"><CheckCircle2 size={17}/>{notice}</div>}
    {loaded && suggestions.length > 0 && <>
      <div className="ai-exam-review-heading">
        <div><strong>{suggestions.length} sugerencias</strong><span>{chosen.length} seleccionadas para incorporar</span></div>
        <label><input type="checkbox" disabled={Boolean(busy) || !allSelectable.length}
          checked={allSelectable.length > 0 && allSelectable.every((item) => item.selected)}
          onChange={(e) => selectAll(e.target.checked)}/> Seleccionar disponibles</label>
      </div>
      <div className="ai-exam-suggestions">
        {suggestions.map((q) => {
          const repeated = knownPrompts.has(normalize(q.prompt))
          return <details key={q.localId} className={'ai-exam-suggestion' + (q.selected ? ' picked' : '')}>
            <summary>
              <span className="ai-exam-selection" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" aria-label={'Seleccionar pregunta de diapositiva ' + q.page}
                  disabled={Boolean(busy) || q.saved || repeated} checked={q.selected && !q.saved}
                  onChange={(e) => update(q.localId, { selected: e.target.checked })}/>
              </span>
              <span className="ai-exam-question-title"><small>Diapositiva {q.page} {q.saved ? '· Ya incorporada' : repeated ? '· Ya existe' : ''}</small>{q.prompt}</span>
            </summary>
            <div className="ai-exam-fields">
              <label>Pregunta<textarea rows={2} value={q.prompt} disabled={Boolean(busy) || q.saved}
                onChange={(e) => update(q.localId, { prompt: e.target.value })}/></label>
              <div className="ai-exam-answer-grid">{q.options.map((option, i) =>
                <label key={i}>Opción {String.fromCharCode(65 + i)}<input value={option} disabled={Boolean(busy) || q.saved}
                  onChange={(e) => update(q.localId, { options: q.options.map((value, idx) => idx === i ? e.target.value : value) })}/></label>)}</div>
              <label>Respuesta correcta<select disabled={Boolean(busy) || q.saved} value={q.correctIndex}
                onChange={(e) => update(q.localId, { correctIndex: Number(e.target.value) })}>
                {[0,1,2,3].map((i) => <option key={i} value={i}>{String.fromCharCode(65+i)}</option>)}</select></label>
              <button className="secondary-button compact" type="button" disabled={Boolean(busy) || q.saved}
                onClick={() => useInEditor(q)}><FileQuestion size={15}/> Pasar al editor manual</button>
            </div>
          </details>
        })}
      </div>
      <div className="ai-exam-actions">
        <span>La elección y edición son tuyas. No se modifica ninguna pregunta existente.</span>
        <button type="button" className="primary-button" disabled={Boolean(busy) || !canSave} onClick={save}>
          {busy === 'Incorporando preguntas…' ? <Loader2 size={17} className="spin"/> : <CheckCircle2 size={17}/>}
          {busy || ('Incorporar ' + chosen.length + ' seleccionada' + (chosen.length === 1 ? '' : 's'))}
        </button>
      </div>
    </>}
  </section>
}
