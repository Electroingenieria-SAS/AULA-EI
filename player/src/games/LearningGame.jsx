import React, { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import '../styles/games.css'
import { gameIsPlayable } from './game-data.js'

function MemoryRound({ content, onResult }) {
  const mistakes = useRef(0)
  const [active, setActive] = useState(null)
  const [matched, setMatched] = useState([])
  const [message, setMessage] = useState('Selecciona un concepto y después su definición.')
  const pairs = content.pairs
  const definitions = pairs.map((item, index) => ({ ...item, index })).reverse()
  const match = (index) => {
    if (active === null || matched.includes(index)) return
    if (active === index) {
      if (matched.length + 1 === pairs.length) onResult?.({ success: true, mistakes: mistakes.current })
      setMatched((current) => [...current, index])
      setActive(null)
      setMessage('¡Correcto! Has relacionado los conceptos.')
    } else { mistakes.current += 1; setMessage('No coincide. Prueba otra definición.') }
  }
  const complete = matched.length === pairs.length
  return <>
    <p className="game-help">{message}</p>
    <div className="game-match-grid">
      <div className="game-match-column" aria-label="Conceptos">
        <strong>Conceptos</strong>
        {pairs.map((pair, index) => <button type="button" key={index}
          disabled={matched.includes(index)} aria-pressed={active === index}
          className={active === index ? 'selected' : matched.includes(index) ? 'correct' : ''}
          onClick={() => { setActive(index); setMessage('Ahora selecciona la definición que corresponde.') }}>
          {matched.includes(index) && <CheckCircle2 size={17}/>} {pair.term}
        </button>)}
      </div>
      <div className="game-match-column" aria-label="Definiciones">
        <strong>Definiciones</strong>
        {definitions.map((pair) => <button type="button" key={pair.index}
          disabled={matched.includes(pair.index)}
          className={matched.includes(pair.index) ? 'correct' : ''}
          onClick={() => match(pair.index)}>
          {matched.includes(pair.index) && <CheckCircle2 size={17}/>} {pair.definition}
        </button>)}
      </div>
    </div>
    <GameResult complete={complete} count={matched.length} total={pairs.length}/>
  </>
}

function ClassificationRound({ content, onResult }) {
  const mistakes = useRef(0)
  const [done, setDone] = useState([])
  const [message, setMessage] = useState('Elige la categoría que corresponde a cada elemento.')
  const itemIndex = content.items.findIndex((_, index) => !done.includes(index))
  const item = content.items[itemIndex]
  const categories = [...new Set(content.items.map((entry) => entry.category))]
  const classify = (category) => {
    if (category === item.category) {
      if (done.length + 1 === content.items.length) onResult?.({ success: true, mistakes: mistakes.current })
      setDone((current) => [...current, itemIndex])
      setMessage('Clasificación correcta. Sigue con el siguiente ejemplo.')
    } else { mistakes.current += 1; setMessage('Esa categoría no corresponde. Revisa el elemento e inténtalo nuevamente.') }
  }
  return <>
    <p className="game-help" role="status">{message}</p>
    {item && <div className="game-classification">
      <div><small>ELEMENTO POR CLASIFICAR</small><strong>{item.label}</strong></div>
      <div className="game-choice-grid">
        {categories.map((category) => <button type="button" key={category} onClick={() => classify(category)}>{category}</button>)}
      </div>
    </div>}
    <GameResult complete={!item} count={done.length} total={content.items.length}/>
  </>
}

function SequenceRound({ content, onResult }) {
  const mistakes = useRef(0)
  const finished = useRef(false)
  const steps = content.steps
  const [order, setOrder] = useState(() => steps.map((_, i) => i).reverse())
  const [evaluated, setEvaluated] = useState(false)
  const correct = order.every((entry, position) => entry === position)
  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    setOrder((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setEvaluated(false)
  }
  return <>
    <p className="game-help">Organiza las etapas desde la primera hasta la última.</p>
    <ol className="game-order-list">
      {order.map((id, i) => <li key={id}>
        <span className="game-step-number">{i + 1}</span>
        <strong>{steps[id]}</strong>
        <div className="game-order-actions">
          <button type="button" aria-label={'Subir ' + steps[id]} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={18}/></button>
          <button type="button" aria-label={'Bajar ' + steps[id]} disabled={i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown size={18}/></button>
        </div>
      </li>)}
    </ol>
    <button className="game-check-action" type="button" onClick={() => {
      if (correct && !finished.current) { finished.current = true; onResult?.({ success: true, mistakes: mistakes.current }) }
      else if (!correct) mistakes.current += 1
      setEvaluated(true)
    }}>Comprobar secuencia</button>
    <div role="status" className={evaluated ? 'game-result' : 'game-result is-idle'}>
      {evaluated ? (correct ? '¡Excelente! Ordenaste correctamente todas las etapas.' : 'Aún hay pasos fuera de orden. Ajusta la secuencia y comprueba nuevamente.') : 'Puedes reorganizar las etapas tantas veces como necesites.'}
    </div>
  </>
}

function DecisionRound({ content, onResult }) {
  const mistakes = useRef(0)
  const finished = useRef(false)
  const [choice, setChoice] = useState(null)
  const [checked, setChecked] = useState(false)
  const success = checked && choice === content.correctIndex
  return <>
    <h3 className="game-decision-question">{content.prompt}</h3>
    <div className="game-choice-grid game-decision-choices">
      {content.options.map((option, index) => <button key={index} type="button" aria-pressed={choice === index}
        className={choice === index ? 'selected' : ''}
        onClick={() => { setChoice(index); setChecked(false) }}>{option}</button>)}
    </div>
    <button className="game-check-action" type="button" disabled={choice === null} onClick={() => {
      if (choice === content.correctIndex && !finished.current) {
        finished.current = true
        onResult?.({ success: true, mistakes: mistakes.current })
      } else if (choice !== content.correctIndex) mistakes.current += 1
      setChecked(true)
    }}>Revisar decisión</button>
    {checked && <div role="status" className="game-result">
      {success ? '¡Muy bien! Elegiste la respuesta adecuada.' : 'Esta decisión puede mejorarse. Revisa el caso y selecciona otra opción.'}
    </div>}
  </>
}

function GameResult({ complete, count, total }) {
  const percentage = total ? Math.round(100 * count / total) : 0
  return <div className={complete ? 'game-result is-complete' : 'game-result'} role="status">
    <div className="game-result-copy">
      <span className="game-result-icon"><CheckCircle2 size={19} aria-hidden="true"/></span>
      <span><strong>{complete ? '¡Actividad completada!' : 'Tu progreso en esta actividad'}</strong>
        <small>{complete ? 'Relacionaste todos los elementos correctamente.' : count+' de '+total+' relaciones acertadas'}</small>
      </span>
      <b>{percentage}%</b>
    </div>
    <div className="game-result-track" role="progressbar" aria-label="Progreso del juego"
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}>
      <i style={{ width:percentage+'%' }}/>
    </div>
  </div>
}

export default function LearningGame({ content, title, onResult }) {
  const [round, setRound] = useState(0)
  if (!gameIsPlayable(content)) return <div className="game-legacy-note">
    <strong>{title || 'Actividad de práctica'}</strong>
    <p>{content?.instructions || 'Esta actividad aún necesita una configuración interactiva.'}</p>
    <small>El creador debe configurar los elementos del juego para activar el modo interactivo.</small>
  </div>
  return <section className="learning-game" aria-label={title || 'Juego didáctico'}>
    <header className="learning-game-header">
      <div><span><Sparkles size={15}/> Práctica interactiva</span><h3>{title || 'Actividad didáctica'}</h3></div>
      <button type="button" onClick={() => setRound((count) => count + 1)}><RotateCcw size={16}/> Reiniciar</button>
    </header>
    {content.instructions && <div className="learning-game-instructions">
      <Lightbulb size={18} aria-hidden="true"/><p>{content.instructions}</p>
    </div>}
    <div key={round} className="learning-game-round">
      {content.gameType === 'memory' && <MemoryRound content={content} onResult={onResult}/>}
      {content.gameType === 'classification' && <ClassificationRound content={content} onResult={onResult}/>}
      {content.gameType === 'sequence' && <SequenceRound content={content} onResult={onResult}/>}
      {content.gameType === 'decision' && <DecisionRound content={content} onResult={onResult}/>}
    </div>
    <footer className="learning-game-disclaimer">
      Práctica formativa sin nota. El avance oficial del curso se gestiona mediante las actividades y preguntas de transición.
    </footer>
  </section>
}
