import React, { useMemo, useState } from 'react'
import { AlertCircle, BookOpenCheck, CheckCircle2, FileQuestion, Loader2, Sparkles, Upload } from 'lucide-react'
import { prepareCanvaQuestions } from './canva-import-model.js'
import { getError, supabase } from '../shared.js'
import '../styles/ai-exam-assistant.css'

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

function isValidQuestion(q) {
  return q.prompt.trim().length >= 8 && q.options.length === 4 &&
    q.options.every((option) => option.trim().length > 0) &&
    new Set(q.options.map(normalize)).size === 4 &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
}

export default function AiExamAssistant({ courseId, existingQuestions, refresh, setMessage, useInEditor }) {
  const [file, setFile] = useState(null)
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
  const allSelectable = suggestions.filter((item) => !item.saved && !knownPrompts.has(normalize(item.prompt)) && isValidQuestion(item))
  const canSave = chosen.length > 0 && chosen.every(isValidQuestion)
  const incompleteCount = suggestions.filter(item => !item.saved && !isValidQuestion(item)).length

  const analyze = async () => {
    setBusy('Leyendo el PDF localmente…')
    setError('')
    setNotice('')
    try {
      const { analyzeLocalPdf } = await import('./local-pdf-analysis.js')
      const analysis = await analyzeLocalPdf(file)
      const next = prepareCanvaQuestions(analysis.suggested_questions)
      setSuggestions(next.map((item, index) => ({ ...item, localId: index, saved: false })))
      setLoaded(true)
      setNotice(next.length
        ? next.length + ' preguntas con respuestas A, B, C y D propuestas automáticamente. ' + next.filter(q => q.options.some(option => !option.trim())).length + ' requieren completar opciones. Revisa que las alternativas sean correctas antes de incorporarlas.'
        : 'Se leyó el PDF, pero no se identificaron frases con significado suficiente. Comprueba que el PDF contenga texto seleccionable.')
    } catch (err) {
      setError(getError(err, 'No fue posible leer el texto del PDF.'))
    } finally { setBusy('') }
  }

  const update = (localId, patch) => setSuggestions((items) =>
    items.map((item) => item.localId === localId ? { ...item, ...patch } : item))

  const selectAll = (checked) => setSuggestions((items) =>
    items.map((item) => item.saved || knownPrompts.has(normalize(item.prompt)) || !isValidQuestion(item) ? item : { ...item, selected: checked }))

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

  return <section className="ai-exam-panel" aria-label="Asistente gratuito de preguntas desde PDF">
    <div className="ai-exam-heading">
      <span className="ai-exam-symbol"><Sparkles size={23}/></span>
      <div>
        <span className="eyebrow">Sin créditos ni API · 100 % local</span>
        <h3>Preguntas sugeridas a partir del texto de un PDF</h3>
        <p>Lee el PDF frase por frase: reconoce conceptos, listas, elementos, indicaciones, riesgos y procedimientos. También conserva preguntas incompletas cuando faltan opciones, para que puedas terminarlas. Todo se procesa localmente, sin API de pago.</p>
      </div>
    </div>
    <div className="ai-exam-upload-row">
      <label className="ai-exam-file">
        <Upload size={19}/>
        <span>{file ? file.name : 'Seleccionar presentación PDF (máximo 12 MB y 50 páginas)'}</span>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setSuggestions([]); setLoaded(false); setNotice(''); setError('') }}/>
      </label>
      <button className="primary-button" type="button" disabled={!file || Boolean(busy)} onClick={analyze}>
        {busy ? <Loader2 size={17} className="spin"/> : <Sparkles size={17}/>}
        {busy || 'Leer PDF y sugerir preguntas'}
      </button>
    </div>
    <div className="ai-exam-tip"><BookOpenCheck size={16}/> El sistema propone las cuatro opciones A–D y marca la correcta según el PDF. Valida todas las alternativas: algunas pueden proceder de otros temas del mismo material. Si faltan datos, dejará opciones pendientes en vez de inventarlas.</div>
    {error && <div className="ai-exam-error" role="alert"><AlertCircle size={17}/>{error}</div>}
    {notice && <div className="ai-exam-notice" role="status"><CheckCircle2 size={17}/>{notice}</div>}
    {loaded && suggestions.length > 0 && <>
      <div className="ai-exam-review-heading">
        <div><strong>{suggestions.length} sugerencias</strong><span>{chosen.length} seleccionadas · {incompleteCount} requieren completar alternativas</span></div>
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
              <span className="ai-exam-question-title"><small>Diapositiva {q.page} · {q.kind} · {q.difficulty} {!isValidQuestion(q) ? '· Completar respuestas' : ''} {q.saved ? '· Ya incorporada' : repeated ? '· Ya existe' : ''}</small>{q.prompt}</span>
            </summary>
            <div className="ai-exam-fields">
              {q.sourceExcerpt && <div className="ai-exam-evidence">
                <strong>Fundamento · diapositiva {q.page}</strong>
                <p>{q.sourceExcerpt}</p>
              </div>}
              <label>Pregunta<textarea rows={2} value={q.prompt} disabled={Boolean(busy) || q.saved}
                onChange={(e) => update(q.localId, { prompt: e.target.value })}/></label>
              <div className="ai-exam-answer-grid">{q.options.map((option, i) =>
                <label key={i}>Opción {String.fromCharCode(65 + i)}<input value={option} placeholder={option.trim() ? '' : 'Escribe una alternativa distinta'} disabled={Boolean(busy) || q.saved}
                  onChange={(e) => update(q.localId, { options: q.options.map((value, idx) => idx === i ? e.target.value : value) })}/></label>)}</div>
              <div className="ai-exam-suggested-answer"><CheckCircle2 size={16}/> Respuesta correcta propuesta: {String.fromCharCode(65 + q.correctIndex)} · {q.options[q.correctIndex]}</div>
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
        <span>AULA EI completa las alternativas con información del PDF siempre que sea posible. Verifica que solo una sea correcta antes de seleccionar las preguntas.</span>
        <button type="button" className="primary-button" disabled={Boolean(busy) || !canSave} onClick={save}>
          {busy === 'Incorporando preguntas…' ? <Loader2 size={17} className="spin"/> : <CheckCircle2 size={17}/>}
          {busy || ('Incorporar ' + chosen.length + ' seleccionada' + (chosen.length === 1 ? '' : 's'))}
        </button>
      </div>
    </>}
  </section>
}
