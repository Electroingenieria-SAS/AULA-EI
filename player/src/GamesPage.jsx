import React from 'react'
import { BrainCircuit, Gamepad2, Layers3, ListOrdered, Search, Shapes, Sparkles } from 'lucide-react'

const GAMES = [
  ['Memoria de conceptos', BrainCircuit, 'Une conceptos y definiciones configuradas por el creador.'],
  ['Clasificación', Shapes, 'Clasifica residuos, riesgos, señales o procesos.'],
  ['Ordenar pasos', ListOrdered, 'Ordena procedimientos y protocolos.'],
  ['Búsqueda visual', Search, 'Encuentra riesgos o elementos dentro de una imagen.'],
  ['Mini RPG', Gamepad2, 'Recorre zonas y completa misiones de capacitación.'],
  ['Cartas de decisión', Layers3, 'Resuelve casos prácticos y recibe retroalimentación.'],
]

export default function GamesPage() {
  return <main className="learner-games-page">
    <section className="games-original-hero">
      <div>
        <span><Sparkles size={15}/> Biblioteca didáctica</span>
        <h1>Juegos EI</h1>
        <p>Plantillas interactivas para convertir contenidos de capacitación en experiencias más dinámicas sin salir de Aula EI.</p>
      </div>
      <div className="games-hero-metric"><strong>{GAMES.length}</strong><span>Plantillas disponibles</span></div>
    </section>

    <section className="games-section-heading">
      <span>BIBLIOTECA INTERACTIVA</span>
      <h2>Explora las dinámicas disponibles</h2>
      <p>La navegación lateral permanece fija; solo cambia esta área de trabajo.</p>
    </section>

    <div className="games-grid">
      {GAMES.map(([name, Icon, description], index)=><article key={name} style={{'--game-delay': index * 55 + 'ms'}}>
        <div><Icon size={28}/></div>
        <h3>{name}</h3>
        <p>{description}</p>
        <span>Plantilla disponible</span>
      </article>)}
    </div>
  </main>
}
