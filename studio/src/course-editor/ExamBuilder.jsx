import React, { useMemo, useState } from 'react'
import {
  ArrowDown, ArrowUp, Check, CheckCircle2, Download, Edit3,
  FileQuestion, Loader2, Plus, Save, Trash2, Upload, X,
} from 'lucide-react'
import { getError, supabase } from '../shared.js'

const EMPTY_QUESTION = { prompt: '', a: '', b: '', c: '', d: '', correct: 'A' }

export default function ExamBuilder({ courseId, questions, refresh, setMessage }) {
  const [form, setForm] = useState(EMPTY_QUESTION)
  const [editingId, setEditingId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)

  const sortedOptions = (question) => [...(question.options || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  const edit = (question) => {
    const options = sortedOptions(question)
    const correct = Math.max(0, options.findIndex((item) => item.is_correct))
    setEditingId(question.id)
    setForm({
      prompt: question.prompt,
      a: options[0]?.label || '',
      b: options[1]?.label || '',
      c: options[2]?.label || '',
      d: options[3]?.label || '',
      correct: ['A', 'B', 'C', 'D'][correct] || 'A',
    })
    window.requestAnimationFrame(() => document.querySelector('.question-editor-pro')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const optionsFor = (value) => [value.a, value.b, value.c, value.d].map((label, index) => ({
    label: label.trim(),
    sort_order: index,
    is_correct: ['A', 'B', 'C', 'D'][index] === value.correct,
  }))

  const save = async (event) => {
    event.preventDefault()
    const clean = {
      ...form,
      prompt: form.prompt.trim(),
      a: form.a.trim(),
      b: form.b.trim(),
      c: form.c.trim(),
      d: form.d.trim(),
    }
    const options = optionsFor(clean)
    if (!clean.prompt || options.some((item) => !item.label)) {
      return setMessage('Completa la pregunta y las opciones A, B, C y D.')
    }

    setBusy(true)
    try {
      let questionId = editingId
      if (editingId) {
        const update = await supabase.from('questions').update({ prompt: clean.prompt, active: true }).eq('id', editingId)
        if (update.error) throw update.error
        const remove = await supabase.from('question_options').delete().eq('question_id', editingId)
        if (remove.error) throw remove.error
      } else {
        const created = await supabase
          .from('questions')
          .insert({ course_id: courseId, prompt: clean.prompt, sort_order: questions.length, active: true })
          .select()
          .single()
        if (created.error) throw created.error
        questionId = created.data.id
      }

      const inserted = await supabase
        .from('question_options')
        .insert(options.map((item) => ({ ...item, question_id: questionId })))
      if (inserted.error) throw inserted.error

      setEditingId(null)
      setForm(EMPTY_QUESTION)
      setMessage(editingId ? 'Pregunta actualizada.' : 'Pregunta agregada al examen.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible guardar la pregunta.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta del examen final?')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) setMessage(error.message)
    else {
      setMessage('Pregunta eliminada.')
      await refresh()
    }
  }

  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= questions.length) return
    const results = await Promise.all([
      supabase.from('questions').update({ sort_order: target }).eq('id', questions[index].id),
      supabase.from('questions').update({ sort_order: index }).eq('id', questions[target].id),
    ])
    const failure = results.find((item) => item.error)
    if (failure?.error) setMessage(failure.error.message)
    else await refresh()
  }

  const parseImport = () => importText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('pregunta;'))
    .map((line, index) => {
      const columns = line.split(';').map((value) => value.trim())
      if (columns.length < 6) throw new Error('La línea ' + String(index + 1) + ' no tiene 6 columnas separadas por punto y coma.')
      const correct = columns[5].toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(correct)) throw new Error('La línea ' + String(index + 1) + ' tiene una respuesta correcta inválida.')
      return { prompt: columns[0], a: columns[1], b: columns[2], c: columns[3], d: columns[4], correct }
    })

  const importQuestions = async () => {
    setBusy(true)
    try {
      const rows = parseImport()
      if (!rows.length) throw new Error('No hay preguntas para importar.')

      for (let index = 0; index < rows.length; index += 1) {
        const item = rows[index]
        const created = await supabase
          .from('questions')
          .insert({ course_id: courseId, prompt: item.prompt, sort_order: questions.length + index, active: true })
          .select()
          .single()
        if (created.error) throw created.error

        const inserted = await supabase
          .from('question_options')
          .insert(optionsFor(item).map((option) => ({ ...option, question_id: created.data.id })))
        if (inserted.error) throw inserted.error
      }

      setImportText('')
      setImportOpen(false)
      setMessage(String(rows.length) + ' preguntas importadas.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible importar las preguntas.'))
    } finally {
      setBusy(false)
    }
  }

  const download = (name, text) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const template = 'Pregunta;A;B;C;D;Correcta\n¿Qué es un peligro?;Una fuente con potencial de causar daño;Un pago;Un documento;Una capacitación;A\n¿Qué debe hacerse ante una señal de alerta?;Ignorarla;Reportarla;Borrarla;Comentarlo informalmente;B'

  const exportText = useMemo(() => [
    'Pregunta;A;B;C;D;Correcta',
    ...questions.map((question) => {
      const options = sortedOptions(question)
      const correct = Math.max(0, options.findIndex((item) => item.is_correct))
      return [
        question.prompt,
        options[0]?.label || '',
        options[1]?.label || '',
        options[2]?.label || '',
        options[3]?.label || '',
        ['A', 'B', 'C', 'D'][correct] || 'A',
      ].map((value) => String(value).replace(/\r?\n/g, ' ').replace(/;/g, ',')).join(';')
    }),
  ].join('\n'), [questions])

  return <div className="exam-authoring-workspace">
    <div className="exam-authoring-summary">
      <div className="exam-summary-metric"><span><FileQuestion size={19} /></span><div><strong>{questions.length}</strong><small>preguntas</small></div></div>
      <div className="exam-summary-copy">
        <strong>Examen final</strong>
        <span>La nota mínima del curso se configura en “Información”. Marca una respuesta correcta en cada pregunta.</span>
      </div>
      <div className="toolbar-buttons exam-toolbar">
        <button className="secondary-button compact" onClick={() => setImportOpen((value) => !value)}><Upload size={16} /> Importar</button>
        <button className="secondary-button compact" onClick={() => download('plantilla-examen-aula-ei.csv', template)}><Download size={16} /> Plantilla</button>
        <button className="secondary-button compact" onClick={() => download('preguntas-examen-aula-ei.csv', exportText)} disabled={!questions.length}><Download size={16} /> Exportar</button>
      </div>
    </div>

    {importOpen && <div className="exam-import-panel">
      <div><strong>Importar varias preguntas</strong><span>Pega contenido con formato: Pregunta;A;B;C;D;Correcta</span></div>
      <textarea rows="7" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Pregunta;A;B;C;D;Correcta" />
      <div className="row-actions">
        <button className="secondary-button compact" onClick={() => { setImportOpen(false); setImportText('') }}>Cancelar</button>
        <button className="primary-button compact" onClick={importQuestions} disabled={busy || !importText.trim()}>{busy ? <Loader2 className="spin" size={15} /> : <Upload size={15} />} Importar preguntas</button>
      </div>
    </div>}

    <form className="question-editor-pro" onSubmit={save}>
      <div className="question-editor-pro-head">
        <div><span className="eyebrow">{editingId ? 'Editando' : 'Nueva pregunta'}</span><h3>{editingId ? 'Modifica la pregunta y sus respuestas' : 'Agrega una pregunta al examen'}</h3></div>
        {editingId && <button type="button" className="text-action" onClick={() => { setEditingId(null); setForm(EMPTY_QUESTION) }}><X size={15} /> Cancelar edición</button>}
      </div>

      <label className="question-prompt-field">Pregunta
        <textarea rows="4" value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="Escribe una pregunta clara y específica." required />
      </label>

      <div className="exam-options-grid">
        {['A', 'B', 'C', 'D'].map((letter) => {
          const key = letter.toLowerCase()
          return <label key={letter} className={'exam-option-card ' + (form.correct === letter ? 'correct' : '')}>
            <span className="exam-option-letter">{letter}</span>
            <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={'Respuesta ' + letter} required />
            <button type="button" onClick={() => setForm({ ...form, correct: letter })}>{form.correct === letter ? <><Check size={14} /> Correcta</> : 'Marcar correcta'}</button>
          </label>
        })}
      </div>

      <div className="question-editor-pro-footer">
        <div><CheckCircle2 size={16} /><span>Respuesta correcta: <strong>{form.correct}</strong></span></div>
        <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? 'Guardar pregunta' : 'Agregar pregunta'}</button>
      </div>
    </form>

    <div className="exam-question-list">
      <div className="exam-question-list-head"><strong>Preguntas del examen</strong><span>Ordena las preguntas con las flechas.</span></div>
      {questions.map((question, index) => {
        const options = sortedOptions(question)
        const correct = options.find((item) => item.is_correct)
        return <article key={question.id} className="exam-question-card">
          <span className="question-number">{index + 1}</span>
          <div>
            <strong>{question.prompt}</strong>
            <small>Respuesta correcta: {correct?.label || 'Sin definir'}</small>
          </div>
          <div className="row-actions">
            <button className="icon-button" title="Editar" onClick={() => edit(question)}><Edit3 size={15} /></button>
            <button className="icon-button" title="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button className="icon-button" title="Bajar" disabled={index === questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button className="icon-button danger" title="Eliminar" onClick={() => remove(question.id)}><Trash2 size={15} /></button>
          </div>
        </article>
      })}
      {!questions.length && <div className="authoring-empty-state small"><span><FileQuestion size={24} /></span><strong>Aún no hay preguntas</strong><p>Agrega al menos una pregunta para que la capacitación pueda publicarse.</p></div>}
    </div>
  </div>
}
