import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, Download, Edit3, FileQuestion, Image, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { getError, signedAsset, slugify, supabase, uploadCourseAsset } from './shared.js'

const EMPTY_COURSE = { title: '', description: '', passing_score: 80 }
const EMPTY_BLOCK = { type: 'text', title: '', description: '', required: true, text: '', url: '', prompt: '', optionA: '', optionB: '', optionC: '', optionD: '', correctIndex: 0, gameType: 'multiple_choice', instructions: '', status: 'published' }
const EMPTY_QUESTION = { prompt: '', a: '', b: '', c: '', d: '', correct: 'A' }

export default function CoursesManager({ courses, refresh, setMessage }) {
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_COURSE)
  const [busy, setBusy] = useState(false)
  const selected = courses.find((course) => course.id === selectedId) || null

  const createCourse = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const slug = slugify(form.title) + '-' + String(Date.now()).slice(-5)
      const { data, error } = await supabase.from('courses').insert({ ...form, slug, status: 'draft' }).select().single()
      if (error) throw error
      setForm(EMPTY_COURSE)
      await refresh()
      setSelectedId(data.id)
      setMessage('Capacitación creada. Ya puedes completar su estructura.')
    } catch (error) {
      setMessage(getError(error, 'No fue posible crear la capacitación.'))
    } finally {
      setBusy(false)
    }
  }

  if (selected) return <CourseBuilder course={selected} onBack={() => setSelectedId(null)} refresh={refresh} setMessage={setMessage} />

  return <div className="two-column-layout">
    <section className="panel-card">
      <div className="section-title-row"><div><span className="eyebrow">Nueva capacitación</span><h2>Crea la estructura general.</h2><p>Después agrega fases, contenidos y el examen final.</p></div><BookOpen size={28} /></div>
      <form className="stack-form" onSubmit={createCourse}>
        <label>Título<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label>Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label>Nota mínima<input type="number" min="1" max="100" value={form.passing_score} onChange={(event) => setForm({ ...form, passing_score: Number(event.target.value) })} /></label>
        <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <Plus size={17} />} Crear y editar</button>
      </form>
    </section>
    <section className="panel-card">
      <div className="section-title-row"><div><span className="eyebrow">Capacitaciones creadas</span><h2>{courses.length} registros</h2></div></div>
      <div className="course-admin-list">{courses.map((course) => <button key={course.id} onClick={() => setSelectedId(course.id)}><div><strong>{course.title}</strong><small>{course.status} · aprobación {course.passing_score}%</small></div><span>Editar →</span></button>)}</div>
    </section>
  </div>
}

function CourseBuilder({ course, onBack, refresh, setMessage }) {
  const [config, setConfig] = useState({ title: course.title, description: course.description || '', status: course.status, passing_score: course.passing_score || 80, cover_path: course.cover_path || null })
  const [coverFile, setCoverFile] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [phases, setPhases] = useState([])
  const [questions, setQuestions] = useState([])
  const [phaseTitle, setPhaseTitle] = useState('')
  const [openEditor, setOpenEditor] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [phaseResult, questionResult] = await Promise.all([
      supabase.from('course_phases').select('*,blocks:content_blocks(*)').eq('course_id', course.id).order('sort_order'),
      supabase.from('questions').select('*,options:question_options(*)').eq('course_id', course.id).order('sort_order'),
    ])
    if (phaseResult.error) setMessage(phaseResult.error.message)
    else setPhases((phaseResult.data || []).map((phase) => ({ ...phase, blocks: [...(phase.blocks || [])].sort((a, b) => a.sort_order - b.sort_order) })))
    if (!questionResult.error) setQuestions(questionResult.data || [])
  }

  useEffect(() => { load() }, [course.id])
  useEffect(() => {
    let alive = true
    if (coverFile) {
      const url = URL.createObjectURL(coverFile)
      setCoverUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (!config.cover_path) { setCoverUrl(null); return }
    signedAsset(config.cover_path).then((url) => { if (alive) setCoverUrl(url) }).catch(() => { if (alive) setCoverUrl(null) })
    return () => { alive = false }
  }, [coverFile, config.cover_path])

  const saveConfig = async () => {
    setBusy(true)
    try {
      let coverPath = config.cover_path
      if (coverFile) coverPath = await uploadCourseAsset(course.id, coverFile)
      const payload = { ...config, cover_path: coverPath }
      const { error } = await supabase.from('courses').update(payload).eq('id', course.id)
      if (error) throw error
      setConfig(payload)
      setCoverFile(null)
      await refresh()
      setMessage('Capacitación actualizada.')
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar la capacitación.'))
    } finally {
      setBusy(false)
    }
  }

  const addPhase = async (event) => {
    event.preventDefault()
    if (!phaseTitle.trim()) return
    const { error } = await supabase.from('course_phases').insert({ course_id: course.id, title: phaseTitle.trim(), sort_order: phases.length })
    if (error) return setMessage(error.message)
    setPhaseTitle('')
    await load()
  }

  const deletePhase = async (phaseId) => {
    if (!window.confirm('¿Eliminar la fase y sus bloques?')) return
    const { error } = await supabase.from('course_phases').delete().eq('id', phaseId)
    if (error) setMessage(error.message)
    else await load()
  }

  const movePhase = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= phases.length) return
    const current = phases[index]
    const other = phases[target]
    const results = await Promise.all([
      supabase.from('course_phases').update({ sort_order: target }).eq('id', current.id),
      supabase.from('course_phases').update({ sort_order: index }).eq('id', other.id),
    ])
    const failure = results.find((result) => result.error)
    if (failure?.error) setMessage(failure.error.message)
    else await load()
  }

  return <div className="course-builder">
    <div className="builder-topbar">
      <button className="text-action" onClick={onBack}><ArrowLeft size={17} /> Volver a capacitaciones</button>
      <div><span className="eyebrow">Constructor visual</span><h2>{course.title}</h2></div>
      <button className="primary-button" onClick={saveConfig} disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} Guardar configuración</button>
    </div>

    <div className="builder-layout">
      <aside className="panel-card compact-panel">
        <h3>Configuración</h3>
        <label>Título<input value={config.title} onChange={(event) => setConfig({ ...config, title: event.target.value })} /></label>
        <label>Descripción<textarea value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} /></label>
        <label>Imagen de portada<input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} /></label>
        <div className={'course-cover-preview ' + (coverUrl ? '' : 'empty')}>{coverUrl ? <img src={coverUrl} alt="Vista previa" /> : <span><Image size={24} /> Sin imagen de portada</span>}</div>
        <label>Estado<select value={config.status} onChange={(event) => setConfig({ ...config, status: event.target.value })}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
        <label>Nota mínima<input type="number" min="1" max="100" value={config.passing_score} onChange={(event) => setConfig({ ...config, passing_score: Number(event.target.value) })} /></label>
      </aside>

      <section className="builder-main">
        <section className="panel-card">
          <div className="section-title-row compact-row"><div><span className="eyebrow">Fases y contenidos</span><h3>Ruta de aprendizaje</h3></div></div>
          <form className="inline-form" onSubmit={addPhase}><input value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} placeholder="Nueva fase o módulo" /><button className="primary-button compact"><Plus size={16} /> Agregar fase</button></form>
          <div className="phase-list">
            {phases.map((phase, index) => <article className="phase-card" key={phase.id}>
              <div className="phase-heading">
                <div><span>Fase {index + 1}</span><h4>{phase.title}</h4><small>{(phase.blocks || []).length} contenido(s)</small></div>
                <div className="row-actions">
                  <button className="icon-button" title="Subir" onClick={() => movePhase(index, -1)}><ArrowUp size={16} /></button>
                  <button className="icon-button" title="Bajar" onClick={() => movePhase(index, 1)}><ArrowDown size={16} /></button>
                  <button className="icon-button" title="Editar fase" onClick={() => setOpenEditor(openEditor === phase.id ? null : phase.id)}><Edit3 size={16} /></button>
                  <button className="icon-button danger" title="Eliminar fase" onClick={() => deletePhase(phase.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              {openEditor === phase.id && <PhaseEditor phase={phase} done={async () => { setOpenEditor(null); await load() }} setMessage={setMessage} />}
              <BlockList courseId={course.id} phase={phase} refresh={load} setMessage={setMessage} />
            </article>)}
            {!phases.length && <div className="empty-state compact-empty">Agrega la primera fase para comenzar a estructurar la capacitación.</div>}
          </div>
        </section>
        <ExamBuilder courseId={course.id} questions={questions} refresh={load} setMessage={setMessage} />
      </section>
    </div>
  </div>
}

function PhaseEditor({ phase, done, setMessage }) {
  const [title, setTitle] = useState(phase.title)
  const [description, setDescription] = useState(phase.description || '')
  const [busy, setBusy] = useState(false)
  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    const { error } = await supabase.from('course_phases').update({ title, description }).eq('id', phase.id)
    setBusy(false)
    if (error) setMessage(error.message)
    else { setMessage('Fase actualizada.'); await done() }
  }
  return <form className="editor-box" onSubmit={save}><div className="form-grid"><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="wide">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><button className="primary-button compact" disabled={busy}><Save size={16} /> Guardar fase</button></form>
}

function BlockList({ courseId, phase, refresh, setMessage }) {
  const [editing, setEditing] = useState(null)
  const blocks = phase.blocks || []
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este contenido?')) return
    const { error } = await supabase.from('content_blocks').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await refresh()
  }
  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    const a = blocks[index], b = blocks[target]
    const result = await Promise.all([
      supabase.from('content_blocks').update({ sort_order: target }).eq('id', a.id),
      supabase.from('content_blocks').update({ sort_order: index }).eq('id', b.id),
    ])
    const failure = result.find((item) => item.error)
    if (failure?.error) setMessage(failure.error.message)
    else await refresh()
  }
  return <div className="block-section">
    <button className="secondary-button compact add-block-button" onClick={() => setEditing(editing === 'new' ? null : 'new')}><Plus size={16} /> Agregar contenido</button>
    {editing === 'new' && <BlockEditor courseId={courseId} phaseId={phase.id} nextOrder={blocks.length} done={async () => { setEditing(null); await refresh() }} setMessage={setMessage} />}
    <div className="block-list">{blocks.map((block, index) => <div className="block-card" key={block.id}>
      <div><span className="block-type">{block.type}</span><strong>{block.title}</strong><small>{block.required ? 'Obligatorio' : 'Opcional'} · {block.status}</small></div>
      <div className="row-actions">
        <button className="icon-button" onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
        <button className="icon-button" onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
        <button className="icon-button" onClick={() => setEditing(editing === block.id ? null : block.id)}><Edit3 size={15} /></button>
        <button className="icon-button danger" onClick={() => remove(block.id)}><Trash2 size={15} /></button>
      </div>
      {editing === block.id && <div className="block-editor-row"><BlockEditor courseId={courseId} phaseId={phase.id} nextOrder={block.sort_order} existing={block} done={async () => { setEditing(null); await refresh() }} setMessage={setMessage} /></div>}
    </div>)}</div>
  </div>
}

function BlockEditor({ courseId, phaseId, nextOrder, existing, done, setMessage }) {
  const source = existing?.content || {}
  const [form, setForm] = useState({
    ...EMPTY_BLOCK,
    type: existing?.type || 'text',
    title: existing?.title || '',
    description: existing?.description || '',
    required: existing?.required ?? true,
    text: source.html || source.text || '',
    url: source.url || '',
    prompt: source.prompt || '',
    optionA: source.options?.[0] || '',
    optionB: source.options?.[1] || '',
    optionC: source.options?.[2] || '',
    optionD: source.options?.[3] || '',
    correctIndex: Number(source.correctIndex || 0),
    gameType: source.gameType || 'multiple_choice',
    instructions: source.instructions || '',
    status: existing?.status || 'published',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileTypes = ['video', 'presentation', 'image', 'audio', 'file']
  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      let assetPath = existing?.asset_path || null
      if (file) assetPath = await uploadCourseAsset(courseId, file)
      let content = {}
      if (form.type === 'text') content = { html: form.text }
      else if (form.type === 'link') content = { url: form.url.trim() }
      else if (fileTypes.includes(form.type)) content = { url: form.url.trim() }
      else if (form.type === 'validation') content = { prompt: form.prompt, options: [form.optionA, form.optionB, form.optionC, form.optionD].filter(Boolean), correctIndex: form.correctIndex }
      else if (form.type === 'game') content = { gameType: form.gameType, instructions: form.instructions }
      if (fileTypes.includes(form.type) && !file && !form.url.trim() && !existing?.asset_path) throw new Error('Sube un archivo o pega un enlace de Drive / OneDrive.')
      const payload = {
        phase_id: phaseId,
        type: form.type,
        title: form.title,
        description: form.description,
        required: form.required,
        sort_order: existing?.sort_order ?? nextOrder,
        status: form.status,
        content,
        asset_path: assetPath,
        completion_rule: { mode: form.type === 'video' ? 'watch_to_end' : 'manual' },
      }
      const result = existing ? await supabase.from('content_blocks').update(payload).eq('id', existing.id) : await supabase.from('content_blocks').insert(payload)
      if (result.error) throw result.error
      setMessage(existing ? 'Contenido actualizado.' : 'Contenido agregado.')
      await done()
    } catch (error) {
      setMessage(getError(error, 'No fue posible guardar el contenido.'))
    } finally {
      setBusy(false)
    }
  }
  return <form className="editor-box block-editor" onSubmit={save}>
    <div className="form-grid">
      <label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="text">Lectura corta</option><option value="video">Video corto</option><option value="presentation">Presentación</option><option value="image">Imagen / infografía</option><option value="audio">Audio</option><option value="file">Archivo descargable</option><option value="link">Enlace externo</option><option value="game">Juego</option><option value="validation">Pregunta de validación</option></select></label>
      <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="published">Publicado</option><option value="draft">Borrador</option></select></label>
      <label className="wide">Título<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
      <label className="wide">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      {form.type === 'text' && <label className="wide">Contenido<textarea rows="8" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} /></label>}
      {(form.type === 'link' || fileTypes.includes(form.type)) && <label className="wide">Enlace externo / Drive / OneDrive<input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></label>}
      {fileTypes.includes(form.type) && <label className="wide">O subir archivo<input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>}
      {form.type === 'validation' && <><label className="wide">Pregunta<input value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} /></label>{['A','B','C','D'].map((letter, index) => <label key={letter}>Opción {letter}<input value={form['option' + letter]} onChange={(event) => setForm({ ...form, ['option' + letter]: event.target.value })} /></label>)}<label>Correcta<select value={form.correctIndex} onChange={(event) => setForm({ ...form, correctIndex: Number(event.target.value) })}>{['A','B','C','D'].map((letter, index) => <option value={index} key={letter}>{letter}</option>)}</select></label></>}
      {form.type === 'game' && <><label>Tipo de juego<input value={form.gameType} onChange={(event) => setForm({ ...form, gameType: event.target.value })} /></label><label className="wide">Instrucciones<textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label></>}
      <label className="check-label"><input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} /> Contenido obligatorio</label>
    </div>
    <div className="row-actions"><button className="primary-button compact" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Guardar contenido</button></div>
  </form>
}

function ExamBuilder({ courseId, questions, refresh, setMessage }) {
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
    setForm({ prompt: question.prompt, a: options[0]?.label || '', b: options[1]?.label || '', c: options[2]?.label || '', d: options[3]?.label || '', correct: ['A','B','C','D'][correct] || 'A' })
  }
  const optionsFor = (value) => [value.a, value.b, value.c, value.d].map((label, index) => ({ label: label.trim(), sort_order: index, is_correct: ['A','B','C','D'][index] === value.correct }))

  const save = async (event) => {
    event.preventDefault()
    const clean = { ...form, prompt: form.prompt.trim(), a: form.a.trim(), b: form.b.trim(), c: form.c.trim(), d: form.d.trim() }
    const options = optionsFor(clean)
    if (!clean.prompt || options.some((item) => !item.label)) return setMessage('Completa la pregunta y las opciones A, B, C y D.')
    setBusy(true)
    try {
      let questionId = editingId
      if (editingId) {
        const update = await supabase.from('questions').update({ prompt: clean.prompt, active: true }).eq('id', editingId)
        if (update.error) throw update.error
        const remove = await supabase.from('question_options').delete().eq('question_id', editingId)
        if (remove.error) throw remove.error
      } else {
        const created = await supabase.from('questions').insert({ course_id: courseId, prompt: clean.prompt, sort_order: questions.length, active: true }).select().single()
        if (created.error) throw created.error
        questionId = created.data.id
      }
      const inserted = await supabase.from('question_options').insert(options.map((item) => ({ ...item, question_id: questionId })))
      if (inserted.error) throw inserted.error
      setEditingId(null); setForm(EMPTY_QUESTION); setMessage(editingId ? 'Pregunta actualizada.' : 'Pregunta agregada al examen.'); await refresh()
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
    else await refresh()
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

  const parseImport = () => importText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.toLowerCase().startsWith('pregunta;')).map((line, index) => {
    const columns = line.split(';').map((value) => value.trim())
    if (columns.length < 6) throw new Error('La línea ' + String(index + 1) + ' no tiene 6 columnas separadas por punto y coma.')
    const correct = columns[5].toUpperCase()
    if (!['A','B','C','D'].includes(correct)) throw new Error('La línea ' + String(index + 1) + ' tiene una respuesta correcta inválida.')
    return { prompt: columns[0], a: columns[1], b: columns[2], c: columns[3], d: columns[4], correct }
  })

  const importQuestions = async () => {
    setBusy(true)
    try {
      const rows = parseImport()
      if (!rows.length) throw new Error('No hay preguntas para importar.')
      for (let index = 0; index < rows.length; index += 1) {
        const item = rows[index]
        const created = await supabase.from('questions').insert({ course_id: courseId, prompt: item.prompt, sort_order: questions.length + index, active: true }).select().single()
        if (created.error) throw created.error
        const inserted = await supabase.from('question_options').insert(optionsFor(item).map((option) => ({ ...option, question_id: created.data.id })))
        if (inserted.error) throw inserted.error
      }
      setImportText(''); setImportOpen(false); setMessage(String(rows.length) + ' preguntas importadas.'); await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible importar las preguntas.'))
    } finally { setBusy(false) }
  }

  const download = (name, text) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
  }
  const template = 'Pregunta;A;B;C;D;Correcta\n¿Qué es un peligro?;Una fuente con potencial de causar daño;Un pago;Un documento;Una capacitación;A\n¿Qué debe hacerse ante una señal de alerta?;Ignorarla;Reportarla;Borrarla;Comentarlo informalmente;B'
  const exportText = useMemo(() => ['Pregunta;A;B;C;D;Correcta', ...questions.map((question) => {
    const options = sortedOptions(question), correct = Math.max(0, options.findIndex((item) => item.is_correct))
    return [question.prompt, options[0]?.label || '', options[1]?.label || '', options[2]?.label || '', options[3]?.label || '', ['A','B','C','D'][correct] || 'A'].map((value) => String(value).replace(/\r?\n/g, ' ').replace(/;/g, ',')).join(';')
  })].join('\n'), [questions])

  return <section className="panel-card exam-builder">
    <div className="section-title-row compact-row"><div><span className="eyebrow">Examen final</span><h3>{questions.length} preguntas creadas</h3><p>Puedes agregar una por una o importar varias desde plantilla.</p></div><FileQuestion size={26} /></div>
    <div className="toolbar-buttons exam-toolbar"><button className="secondary-button compact" onClick={() => setImportOpen((value) => !value)}><Upload size={16} /> Importar preguntas</button><button className="secondary-button compact" onClick={() => download('plantilla-examen-aula-ei.csv', template)}><Download size={16} /> Plantilla</button><button className="secondary-button compact" onClick={() => download('preguntas-examen-aula-ei.csv', exportText)}><Download size={16} /> Exportar examen</button></div>
    {importOpen && <div className="import-box"><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Pregunta;A;B;C;D;Correcta" /><button className="primary-button compact" onClick={importQuestions} disabled={busy}>Importar</button></div>}
    <form className="editor-box question-editor" onSubmit={save}>
      <div className="question-editor-title"><strong>{editingId ? 'Editar pregunta' : 'Agregar pregunta rápida'}</strong>{editingId && <button type="button" className="text-action" onClick={() => { setEditingId(null); setForm(EMPTY_QUESTION) }}><X size={15} /> Cancelar edición</button>}</div>
      <label>Pregunta<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} required /></label>
      <div className="abcd-grid">{['A','B','C','D'].map((letter) => {
        const key = letter.toLowerCase()
        return <label key={letter} className={'abcd-option ' + (form.correct === letter ? 'selected' : '')}><span>{letter}</span><input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required /><button type="button" onClick={() => setForm({ ...form, correct: letter })}>{form.correct === letter ? <Check size={14} /> : 'Correcta'}</button></label>
      })}</div>
      <button className="primary-button compact" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} {editingId ? 'Guardar pregunta' : 'Agregar pregunta'}</button>
    </form>
    <div className="question-list">{questions.map((question, index) => <div key={question.id}><span><strong>{index + 1}. {question.prompt}</strong></span><div className="row-actions"><button className="icon-button" onClick={() => edit(question)}><Edit3 size={15} /></button><button className="icon-button" onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button className="icon-button" onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button className="icon-button danger" onClick={() => remove(question.id)}><Trash2 size={15} /></button></div></div>)}</div>
  </section>
}
