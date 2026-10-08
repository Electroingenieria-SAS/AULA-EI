import React, { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, Gamepad2, NotebookPen, RotateCcw } from 'lucide-react'
import { navigateLearner } from '../navigation.js'

function readDraft(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '{}')
    return { notes: String(value.notes || '').slice(0, 3000), reviewed: Array.isArray(value.reviewed) ? value.reviewed : [] }
  } catch { return { notes: '', reviewed: [] } }
}

export default function StudyReview({ course, blocks, completed, userId }) {
  const key = 'aula-ei-study-v1:' + userId + ':' + course.id
  const [draft, setDraft] = useState(() => readDraft(key))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Tus apuntes están guardados solo en este navegador.')
  const cards = useMemo(() => (blocks || []).filter((block) =>
    completed.has(block.id) && block.title && (block.description || block.type === 'text')
  ).map((block) => ({
    id: block.id,
    title: block.title,
    explanation: String(block.description || String(block.content?.text || block.content?.html || '')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 480) || 'Vuelve a consultar el contenido del curso.',
  })), [blocks, completed])
  const current = cards[Math.min(index, cards.length - 1)] || null
  const reviewed = cards.filter((card) => draft.reviewed.includes(card.id)).length

  useEffect(() => {
    setDraft(readDraft(key))
    setIndex(0)
    setRevealed(false)
  }, [key])

  const save = (value) => {
    setDraft(value)
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      setSaveMessage('Apuntes guardados en este navegador.')
    } catch {
      setSaveMessage('No fue posible guardar aquí. Copia los apuntes antes de salir.')
    }
  }
  const changeCard = (next) => {
    setIndex(next)
    setRevealed(false)
  }
  const markRemembered = () => {
    if (!current) return
    save({ ...draft, reviewed: draft.reviewed.includes(current.id)
      ? draft.reviewed.filter((id) => id !== current.id)
      : [...draft.reviewed, current.id] })
  }
  const clear = () => {
    if (!window.confirm('¿Borrar tus apuntes y tarjetas repasadas de este curso en este navegador?')) return
    try { window.localStorage.removeItem(key) } catch {}
    setDraft({ notes: '', reviewed: [] })
    setIndex(0)
    setRevealed(false)
    setSaveMessage('Apuntes locales borrados.')
  }

  return <details className="study-review-panel">
    <summary><BookOpenCheck size={19}/><strong>Mi espacio de repaso</strong><span>Tarjetas de memoria y apuntes personales</span></summary>
    <div className="study-review-content">
      <section className="study-flashcards">
        <header><div><span>REPASO EXPRÉS</span><h3>Recuerda lo que aprendiste</h3></div>
          <small>{reviewed} / {cards.length} recordadas</small>
        </header>
        {current ? <>
          <button className="study-flashcard" type="button" onClick={() => setRevealed((value) => !value)} aria-pressed={revealed}>
            <small>{revealed ? 'EXPLICACIÓN' : 'CONCEPTO'}</small>
            <strong>{revealed ? current.explanation : current.title}</strong>
            <span>{revealed ? 'Toca para volver al concepto' : 'Toca para revelar el contenido'}</span>
          </button>
          <div className="study-flash-controls">
            <button type="button" disabled={index === 0} onClick={() => changeCard(index - 1)} aria-label="Tarjeta anterior"><ChevronLeft size={18}/></button>
            <span>{index + 1} de {cards.length}</span>
            <button type="button" disabled={index === cards.length - 1} onClick={() => changeCard(index + 1)} aria-label="Siguiente tarjeta"><ChevronRight size={18}/></button>
            <button className={draft.reviewed.includes(current.id) ? 'is-remembered' : ''} type="button" onClick={markRemembered}>
              <CheckCircle2 size={16}/>{draft.reviewed.includes(current.id) ? 'Recordada' : 'La recordé'}
            </button>
          </div>
        </> : <p className="study-empty">Completa contenidos con explicación para habilitar las tarjetas de repaso.</p>}
        <button className="study-open-games" type="button" onClick={() => navigateLearner('/games/' + encodeURIComponent(course.id))}>
          <Gamepad2 size={18}/> Practicar juegos de esta capacitación
        </button>
        <p className="study-local-note">Este repaso es voluntario, no cambia tus calificaciones ni la finalización de la capacitación.</p>
      </section>
      <section className="study-notes">
        <header><NotebookPen size={20}/><h3>Mis apuntes</h3></header>
        <label htmlFor="aula-study-notes">Ideas o conceptos que quieras recordar</label>
        <textarea id="aula-study-notes" maxLength={3000} rows={8} value={draft.notes}
          placeholder="Escribe tus propios apuntes para estudiar después…"
          onChange={(event) => save({ ...draft, notes: event.target.value })}/>
        <small role="status">{saveMessage} · {draft.notes.length}/3000 caracteres</small>
        <button type="button" className="study-clear" onClick={clear}><RotateCcw size={15}/> Borrar apuntes locales</button>
      </section>
    </div>
  </details>
}
