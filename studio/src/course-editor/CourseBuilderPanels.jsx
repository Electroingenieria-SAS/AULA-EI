import React, { useState } from 'react'
import {
  Archive, ArrowDown, ArrowRight, ArrowUp, Check, CheckCircle2, CircleAlert, Edit3, ExternalLink, File, FileAudio, FileText, Gamepad2, Image, Link2, Loader2, Plus, Presentation, Rocket, Save, Settings2, ShieldCheck, Trash2, Upload, Video, X,
} from 'lucide-react'
import { getError, supabase, uploadCourseAsset } from '../shared.js'
import { clampScore, exampleForType, statusLabel } from './course-utils.js'

const EMPTY_BLOCK = {
  type: 'text',
  title: '',
  description: '',
  required: true,
  text: '',
  url: '',
  prompt: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctIndex: 0,
  gameType: 'multiple_choice',
  instructions: '',
  status: 'published',
}

const BLOCK_TYPES = [
  { value: 'text', label: 'Lectura', detail: 'Texto, guía o explicación corta.', icon: FileText },
  { value: 'video', label: 'Video', detail: 'Video subido o enlace externo.', icon: Video },
  { value: 'presentation', label: 'Presentación', detail: 'Diapositivas o material visual.', icon: Presentation },
  { value: 'image', label: 'Imagen', detail: 'Infografía, esquema o pieza gráfica.', icon: Image },
  { value: 'audio', label: 'Audio', detail: 'Audio explicativo o cápsula.', icon: FileAudio },
  { value: 'file', label: 'Archivo', detail: 'PDF, documento o recurso descargable.', icon: File },
  { value: 'link', label: 'Enlace', detail: 'Drive, OneDrive o recurso web.', icon: Link2 },
  { value: 'game', label: 'Juego', detail: 'Actividad interactiva o práctica.', icon: Gamepad2 },
  { value: 'validation', label: 'Validación', detail: 'Pregunta rápida dentro del contenido.', icon: ShieldCheck },
]

export function CourseOverviewStep({ config, updateConfig, coverUrl, coverFile, setCoverFile, saveConfig, busy }) {
  return <section className="authoring-section">
    <SectionHeader
      eyebrow="Paso 1"
      title="Define la capacitación"
      description="Completa la información principal y la portada. Esto ayuda a que el colaborador entienda rápidamente de qué trata el curso."
      icon={Settings2}
    />

    <div className="course-overview-grid">
      <section className="authoring-card">
        <div className="authoring-card-title">
          <div><strong>Información principal</strong><small>Usa textos claros y orientados a lo que la persona va a aprender.</small></div>
        </div>

        <div className="authoring-form-grid">
          <label className="wide">Título
            <input value={config.title} onChange={(event) => updateConfig({ title: event.target.value })} placeholder="Nombre de la capacitación" />
            <small className="helper-text">Debe ser fácil de identificar en el catálogo y en las asignaciones.</small>
          </label>
          <label className="wide">Descripción
            <textarea rows="6" value={config.description} onChange={(event) => updateConfig({ description: event.target.value })} placeholder="¿Qué aprenderá la persona? ¿Qué objetivo tiene esta capacitación?" />
            <small className="helper-text">{config.description.trim().length < 20 ? 'Recomendación: escribe al menos una frase completa.' : 'Descripción con buen nivel de detalle.'}</small>
          </label>
          <label className="wide">Nota mínima de aprobación
            <div className="score-control-large">
              <input type="range" min="1" max="100" value={config.passing_score} onChange={(event) => updateConfig({ passing_score: Number(event.target.value) })} />
              <div><strong>{config.passing_score}%</strong><span>mínimo para aprobar el examen</span></div>
              <input type="number" min="1" max="100" value={config.passing_score} onChange={(event) => updateConfig({ passing_score: clampScore(event.target.value) })} />
            </div>
          </label>
        </div>
      </section>

      <section className="authoring-card cover-authoring-card">
        <div className="authoring-card-title">
          <div><strong>Portada</strong><small>Recomendada para que la capacitación sea fácil de reconocer.</small></div>
        </div>
        <label className={'course-cover-dropzone ' + (coverUrl ? 'has-image' : '')}>
          {coverUrl ? <img src={coverUrl} alt="Portada de la capacitación" /> : <div><Image size={32} /><strong>Agrega una imagen de portada</strong><span>PNG, JPG o WEBP. Preferiblemente horizontal.</span></div>}
          <input type="file" accept="image/*" hidden onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />
          <span className="cover-change-button"><Upload size={15} /> {coverUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
        </label>
        {coverFile && <div className="pending-cover-note"><CheckCircle2 size={15} /> Imagen seleccionada. Se subirá cuando guardes.</div>}
      </section>
    </div>

    <div className="authoring-step-footer">
      <div><strong>{config.title.trim() ? 'Información lista para guardar' : 'Falta el título'}</strong><span>Puedes continuar editando y guardar cuando quieras.</span></div>
      <button className="primary-button" onClick={() => saveConfig()} disabled={busy || !config.title.trim()}>
        {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} Guardar información
      </button>
    </div>
  </section>
}

export function SectionHeader({ eyebrow, title, description, icon: Icon }) {
  return <div className="authoring-section-header">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <span className="authoring-section-icon"><Icon size={25} /></span>
  </div>
}

export function PhaseEditor({ phase, done, setMessage }) {
  const [title, setTitle] = useState(phase.title)
  const [description, setDescription] = useState(phase.description || '')
  const [busy, setBusy] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    if (!title.trim()) return setMessage('La fase necesita un título.')
    setBusy(true)
    const { error } = await supabase
      .from('course_phases')
      .update({ title: title.trim(), description: description.trim() })
      .eq('id', phase.id)
    setBusy(false)
    if (error) setMessage(error.message)
    else {
      setMessage('Fase actualizada.')
      await done()
    }
  }

  return <form className="phase-editor-panel" onSubmit={save}>
    <div className="phase-editor-heading"><Edit3 size={17} /><strong>Editar información de la fase</strong></div>
    <div className="form-grid">
      <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="wide">Descripción<textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explica brevemente qué se trabajará en esta fase." /></label>
    </div>
    <div className="row-actions"><button className="primary-button compact" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Guardar fase</button></div>
  </form>
}

export function BlockList({ courseId, phase, refresh, setMessage }) {
  const [editing, setEditing] = useState(null)
  const blocks = phase.blocks || []

  const remove = async (id) => {
    const block = blocks.find((item) => item.id === id)
    if (!window.confirm(`¿Eliminar "${block?.title || 'este contenido'}"?`)) return
    const { error } = await supabase.from('content_blocks').delete().eq('id', id)
    if (error) setMessage(error.message)
    else {
      setMessage('Contenido eliminado.')
      await refresh()
    }
  }

  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    const a = blocks[index]
    const b = blocks[target]
    const result = await Promise.all([
      supabase.from('content_blocks').update({ sort_order: target }).eq('id', a.id),
      supabase.from('content_blocks').update({ sort_order: index }).eq('id', b.id),
    ])
    const failure = result.find((item) => item.error)
    if (failure?.error) setMessage(failure.error.message)
    else await refresh()
  }

  return <div className="block-authoring-section">
    <div className="block-authoring-top">
      <div><strong>Contenidos de esta fase</strong><small>{blocks.length ? 'El orden de arriba hacia abajo será el orden que verá el colaborador.' : 'Agrega el primer contenido de esta fase.'}</small></div>
      <button className="primary-button compact" onClick={() => setEditing(editing === 'new' ? null : 'new')}>
        {editing === 'new' ? <X size={16} /> : <Plus size={16} />} {editing === 'new' ? 'Cerrar' : 'Agregar contenido'}
      </button>
    </div>

    {editing === 'new' && (
      <BlockEditor
        courseId={courseId}
        phaseId={phase.id}
        nextOrder={blocks.length}
        done={async () => { setEditing(null); await refresh() }}
        setMessage={setMessage}
      />
    )}

    <div className="block-authoring-list">
      {blocks.map((block, index) => {
        const type = BLOCK_TYPES.find((item) => item.value === block.type) || BLOCK_TYPES[0]
        const Icon = type.icon
        return <article className={'block-authoring-card ' + (editing === block.id ? 'editing' : '')} key={block.id}>
          <div className="block-order">{index + 1}</div>
          <span className={'block-type-icon type-' + block.type}><Icon size={18} /></span>
          <div className="block-authoring-copy">
            <div className="block-title-row">
              <strong>{block.title}</strong>
              <span className="block-kind">{type.label}</span>
              {block.required && <span className="required-pill">Obligatorio</span>}
              <span className={'block-state ' + block.status}>{block.status === 'published' ? 'Publicado' : 'Borrador'}</span>
            </div>
            <p>{block.description || type.detail}</p>
          </div>
          <div className="row-actions block-authoring-actions">
            <button className="icon-button" title="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button className="icon-button" title="Bajar" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button className="icon-button" title="Editar" onClick={() => setEditing(editing === block.id ? null : block.id)}><Edit3 size={15} /></button>
            <button className="icon-button danger" title="Eliminar" onClick={() => remove(block.id)}><Trash2 size={15} /></button>
          </div>

          {editing === block.id && (
            <div className="block-editor-row">
              <BlockEditor
                courseId={courseId}
                phaseId={phase.id}
                nextOrder={block.sort_order}
                existing={block}
                done={async () => { setEditing(null); await refresh() }}
                setMessage={setMessage}
              />
            </div>
          )}
        </article>
      })}
    </div>
  </div>
}

export function BlockEditor({ courseId, phaseId, nextOrder, existing, done, setMessage }) {
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
  const selectedType = BLOCK_TYPES.find((item) => item.value === form.type) || BLOCK_TYPES[0]

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (!form.title.trim()) throw new Error('Escribe un título para el contenido.')
      let assetPath = existing?.asset_path || null
      if (file) assetPath = await uploadCourseAsset(courseId, file)

      let content = {}
      if (form.type === 'text') content = { html: form.text }
      else if (form.type === 'link') content = { url: form.url.trim() }
      else if (fileTypes.includes(form.type)) content = { url: form.url.trim() }
      else if (form.type === 'validation') {
        const options = [form.optionA, form.optionB, form.optionC, form.optionD].map((value) => value.trim()).filter(Boolean)
        if (!form.prompt.trim() || options.length < 2) throw new Error('Completa la pregunta y al menos dos opciones de respuesta.')
        if (form.correctIndex >= options.length) throw new Error('Selecciona una respuesta correcta válida.')
        content = { prompt: form.prompt.trim(), options, correctIndex: form.correctIndex }
      } else if (form.type === 'game') {
        content = { gameType: form.gameType.trim(), instructions: form.instructions.trim() }
      }

      if (fileTypes.includes(form.type) && !file && !form.url.trim() && !existing?.asset_path) {
        throw new Error('Sube un archivo o pega un enlace de Drive / OneDrive.')
      }

      const payload = {
        phase_id: phaseId,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        required: form.required,
        sort_order: existing?.sort_order ?? nextOrder,
        status: form.status,
        content,
        asset_path: assetPath,
        completion_rule: { mode: form.type === 'video' ? 'watch_to_end' : 'manual' },
      }

      const result = existing
        ? await supabase.from('content_blocks').update(payload).eq('id', existing.id)
        : await supabase.from('content_blocks').insert(payload)

      if (result.error) throw result.error
      setMessage(existing ? 'Contenido actualizado.' : 'Contenido agregado.')
      await done()
    } catch (error) {
      setMessage(getError(error, 'No fue posible guardar el contenido.'))
    } finally {
      setBusy(false)
    }
  }

  return <form className="block-editor-pro" onSubmit={save}>
    <div className="block-editor-heading">
      <div>
        <span className="eyebrow">{existing ? 'Editar contenido' : 'Nuevo contenido'}</span>
        <h4>{selectedType.label}</h4>
        <p>{selectedType.detail}</p>
      </div>
    </div>

    <div className="content-type-picker">
      {BLOCK_TYPES.map((type) => {
        const Icon = type.icon
        return <button type="button" key={type.value} className={form.type === type.value ? 'selected' : ''} onClick={() => setForm((current) => ({ ...current, type: type.value }))}>
          <span><Icon size={19} /></span>
          <strong>{type.label}</strong>
          <small>{type.detail}</small>
          {form.type === type.value && <CheckCircle2 size={16} className="content-type-check" />}
        </button>
      })}
    </div>

    <div className="block-editor-form">
      <label>Título
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={'Ej. ' + exampleForType(form.type)} required />
      </label>
      <label>Descripción breve
        <textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explica qué debe hacer o aprender la persona en este contenido." />
      </label>

      {form.type === 'text' && (
        <label>Contenido de lectura
          <textarea rows="10" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Escribe aquí el contenido principal. Puedes usar texto claro, listas y párrafos cortos." />
          <small className="helper-text">Consejo: divide textos largos en varios contenidos para facilitar la lectura.</small>
        </label>
      )}

      {(form.type === 'link' || fileTypes.includes(form.type)) && (
        <div className="resource-source-grid">
          <label>Enlace externo / Drive / OneDrive
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://…" />
            <small className="helper-text">{form.type === 'link' ? 'Pega el enlace que abrirá el colaborador.' : 'Puedes usar un enlace si no quieres subir el archivo directamente.'}</small>
          </label>
          {fileTypes.includes(form.type) && (
            <label className="resource-upload-box">
              <Upload size={22} />
              <strong>{file ? file.name : existing?.asset_path ? 'Reemplazar archivo actual' : 'Subir archivo'}</strong>
              <span>Haz clic para seleccionar un archivo desde tu equipo.</span>
              <input type="file" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
          )}
        </div>
      )}

      {form.type === 'validation' && (
        <div className="validation-builder">
          <label>Pregunta de validación
            <input value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="¿Qué debe recordar la persona antes de continuar?" />
          </label>
          <div className="validation-options-grid">
            {['A', 'B', 'C', 'D'].map((letter, index) => (
              <label key={letter} className={'validation-option ' + (form.correctIndex === index ? 'correct' : '')}>
                <span>{letter}</span>
                <input value={form['option' + letter]} onChange={(event) => setForm({ ...form, ['option' + letter]: event.target.value })} placeholder={'Opción ' + letter} />
                <button type="button" onClick={() => setForm({ ...form, correctIndex: index })}>{form.correctIndex === index ? <Check size={14} /> : 'Marcar correcta'}</button>
              </label>
            ))}
          </div>
        </div>
      )}

      {form.type === 'game' && (
        <div className="game-builder-grid">
          <label>Tipo de juego
            <input value={form.gameType} onChange={(event) => setForm({ ...form, gameType: event.target.value })} placeholder="multiple_choice" />
          </label>
          <label>Instrucciones
            <textarea rows="5" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Explica qué debe hacer la persona y cuándo se considera completado." />
          </label>
        </div>
      )}

      <div className="block-options-row">
        <label className="toggle-option">
          <input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} />
          <span><strong>Contenido obligatorio</strong><small>Debe completarse antes del examen final.</small></span>
        </label>
        <label className="block-status-select">Estado
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
        </label>
      </div>
    </div>

    <div className="block-editor-footer">
      <div><strong>{existing ? 'Editando contenido existente' : 'Nuevo contenido'}</strong><span>Los cambios se aplicarán solo al guardar.</span></div>
      <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {existing ? 'Guardar cambios' : 'Agregar contenido'}</button>
    </div>
  </form>
}

export function PublishStep({ config, readiness, phases, totalBlocks, requiredBlocks, questions, setActiveStep, publishCourse, setCourseStatus, preview, busy }) {
  return <section className="authoring-section">
    <SectionHeader
      eyebrow="Paso 4"
      title="Revisa antes de publicar"
      description="Aula EI valida los elementos mínimos para evitar publicar una capacitación incompleta."
      icon={Rocket}
    />

    <div className="publish-hero-card">
      <div className={'publish-readiness-ring ' + (readiness.ready ? 'ready' : '')}>
        <strong>{readiness.percent}%</strong>
        <span>preparación</span>
      </div>
      <div>
        <span className="eyebrow">{readiness.ready ? 'Todo listo' : 'Aún hay pendientes'}</span>
        <h3>{readiness.ready ? 'La capacitación puede publicarse.' : 'Completa los elementos obligatorios.'}</h3>
        <p>{readiness.ready ? 'Haz una vista previa y, cuando estés conforme, publícala para que pueda ser asignada.' : 'Usa la lista inferior para ir directamente al paso que requiere atención.'}</p>
      </div>
      <button className="secondary-button" onClick={preview}><ExternalLink size={17} /> Vista previa</button>
    </div>

    <div className="publish-check-grid">
      {readiness.checks.filter((item) => !item.optional).map((item) => (
        <button key={item.id} className={item.done ? 'done' : 'pending'} onClick={() => setActiveStep(item.step)}>
          <span>{item.done ? <Check size={16} /> : <CircleAlert size={16} />}</span>
          <div><strong>{item.label}</strong><small>{item.done ? 'Completo' : 'Pendiente'}</small></div>
          <ArrowRight size={15} />
        </button>
      ))}
    </div>

    <div className="publish-course-summary">
      <article><strong>{phases.length}</strong><span>Fases</span></article>
      <article><strong>{totalBlocks}</strong><span>Contenidos</span></article>
      <article><strong>{requiredBlocks}</strong><span>Obligatorios</span></article>
      <article><strong>{questions.length}</strong><span>Preguntas</span></article>
      <article><strong>{config.passing_score}%</strong><span>Aprobación</span></article>
    </div>

    <section className="publish-actions-card">
      <div>
        <span className={'course-status-badge ' + config.status}>{statusLabel(config.status)}</span>
        <h3>Estado actual: {statusLabel(config.status)}</h3>
        <p>{config.status === 'published' ? 'La capacitación está visible para las personas que tengan una asignación válida.' : config.status === 'archived' ? 'La capacitación está archivada y no debe usarse para nuevas asignaciones.' : 'La capacitación permanece en borrador y aún no está disponible para colaboradores.'}</p>
      </div>
      <div className="publish-action-buttons">
        {config.status !== 'draft' && <button className="secondary-button" disabled={busy} onClick={() => setCourseStatus('draft')}><Edit3 size={16} /> Pasar a borrador</button>}
        {config.status !== 'archived' && <button className="secondary-button danger-outline" disabled={busy} onClick={() => setCourseStatus('archived')}><Archive size={16} /> Archivar</button>}
        {config.status !== 'published' && <button className="primary-button publish-button" disabled={busy || !readiness.ready} onClick={publishCourse}>{busy ? <Loader2 className="spin" size={17} /> : <Rocket size={17} />} Publicar capacitación</button>}
      </div>
    </section>
  </section>
}
