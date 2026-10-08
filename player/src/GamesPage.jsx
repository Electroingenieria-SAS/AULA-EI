import React, { useState } from 'react'
import { BrainCircuit, Gamepad2, Layers3, ListOrdered, Search, Shapes, Sparkles } from 'lucide-react'
import LearningGame from './games/LearningGame.jsx'
import { DEMO_GAMES } from './games/game-data.js'

const ICONS = { memory: BrainCircuit, classification: Shapes, sequence: ListOrdered, decision: Layers3 }
const FUTURE = [
  { name: 'Búsqueda visual', Icon: Search, description: 'Identificación guiada de elementos sobre imágenes institucionales.' },
  { name: 'Mini RPG', Icon: Gamepad2, description: 'Misiones y recorridos de aprendizaje por escenarios.' },
]

export default function GamesPage() {
  const [selected, setSelected] = useState(DEMO_GAMES[0].id)
  const current = DEMO_GAMES.find((game) => game.id === selected) || DEMO_GAMES[0]
  return <main className="learner-games-page">
    <section className="games-original-hero">
      <div>
        <span><Sparkles size={15}/> Laboratorio interactivo</span>
        <h1>Juegos EI</h1>
        <p>Practica conocimientos con dinámicas reales. Estos ejercicios son ejemplos formativos: no generan notas ni certificados.</p>
      </div>
      <div className="games-hero-metric"><strong>{DEMO_GAMES.length}</strong><span>Juegos para practicar</span></div>
    </section>

    <section className="games-section-heading">
      <span>APRENDE JUGANDO</span>
      <h2>Selecciona una dinámica y comienza</h2>
      <p>También puedes encontrar juegos personalizados dentro de las capacitaciones creadas por el equipo de formación.</p>
    </section>

    <section className="games-lab" aria-label="Laboratorio de juegos">
      <nav className="games-lab-picker" aria-label="Elegir tipo de actividad">
        {DEMO_GAMES.map((game) => {
          const Icon = ICONS[game.id]
          return <button type="button" key={game.id} aria-pressed={selected === game.id}
            className={selected === game.id ? 'active' : ''} onClick={() => setSelected(game.id)}>
            <span><Icon size={21}/></span>
            <strong>{game.title}</strong>
            <small>Probar actividad</small>
          </button>
        })}
      </nav>
      <div className="games-lab-stage" key={selected}>
        <LearningGame content={current} title={current.title}/>
      </div>
    </section>

    <section className="games-roadmap">
      <h2>Próximas dinámicas</h2>
      <p>Estas dos experiencias están en diseño, todavía no se presentan como juegos disponibles.</p>
      <div>{FUTURE.map(({ name, Icon, description }) => <article key={name}>
        <Icon size={22}/><strong>{name}</strong><p>{description}</p><span>En desarrollo</span>
      </article>)}</div>
    </section>
  </main>
}
