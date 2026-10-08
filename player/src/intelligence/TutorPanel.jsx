import React, { useState } from 'react'
import { BookOpenCheck, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { answerFromCourse } from './intelligence-model.js'

export default function TutorPanel({ cards, courseTitle }) {
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [response, setResponse] = useState(null)
  const ask = (text) => {
    setQuestion(text)
    setAsked(text)
    setResponse(answerFromCourse(text, cards))
  }
  return <section className="intelligence-panel" aria-labelledby="tutor-title">
    <header className="intelligence-panel-heading"><span><MessageCircle size={23}/></span>
      <div><small>01 · GUÍA DE ESTUDIO</small><h2 id="tutor-title">Tutor contextual</h2>
        <p>Consulta el contenido que ya estudiaste. La respuesta reproduce material de la capacitación, no lo inventa.</p></div>
    </header>
    <div className="intelligence-tutor-body">
      <p className="intelligence-source-label"><ShieldCheck size={16}/> Fuente: {courseTitle || 'selecciona una capacitación'}</p>
      {cards.length ? <>
        <div className="intelligence-suggestions">
          {cards.slice(0,5).map((card) => <button type="button" key={card.id}
            onClick={() => ask(card.title)}>{card.title}</button>)}
        </div>
        <form className="intelligence-question-form" onSubmit={(event) => { event.preventDefault(); ask(question) }}>
          <label htmlFor="intelligence-question">¿Qué tema quieres consultar?</label>
          <div><input id="intelligence-question" value={question} onChange={(event) => setQuestion(event.target.value)}
            placeholder="Por ejemplo, política de calidad…" maxLength={180}/>
            <button type="submit" disabled={!question.trim()}><Search size={17}/> Consultar</button></div>
        </form>
        {asked && <article className="intelligence-tutor-answer" aria-live="polite">
          {response ? <>
            <small><BookOpenCheck size={15}/> En el material de formación</small>
            <h3>{response.title}</h3>
            <p>{response.description}</p>
            <footer>Fase: {response.phase} · {response.note}</footer>
          </> : <>
            <h3>No encontré ese tema entre tus contenidos completados</h3>
            <p>Prueba con una palabra del título o consulta otro tema. No utilizo exámenes finales ni materiales que todavía no has estudiado.</p>
          </>}
        </article>}
      </> : <div className="intelligence-empty"><BookOpenCheck size={28}/>
        <strong>Tu tutor se activa con contenidos estudiados</strong>
        <p>Selecciona una capacitación y completa bloques que tengan descripciones. No se interpretan automáticamente imágenes o videos sin explicación escrita.</p>
      </div>}
      <p className="intelligence-disclaimer">Guía de consulta basada en búsqueda textual, sin IA generativa ni conexión con servicios externos. Comprueba siempre el documento institucional original.</p>
    </div>
  </section>
}
