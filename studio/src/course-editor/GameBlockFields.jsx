import React from 'react'
import { GAME_TYPES } from '../../../player/src/games/game-data.js'

const EXAMPLES = {
  memory: 'Procedimiento | Describe una secuencia de actividades.\nRegistro | Conserva evidencia documental.',
  classification: 'Instructivo | Documento\nActa diligenciada | Registro\nFormato sin diligenciar | Documento',
  sequence: 'Identificar el problema\nAnalizar la causa\nAplicar una acción\nVerificar el resultado',
  decision: '*Solicitar corrección siguiendo el procedimiento\nIgnorar la situación\nEliminar el registro sin evidencia',
}

export default function GameBlockFields({ form, setForm }) {
  const selected = GAME_TYPES.find((item) => item.value === form.gameType) || GAME_TYPES[0]
  return <div className="game-builder-grid game-config-editor">
    <label>Dinámica interactiva
      <select value={selected.value} onChange={(event) => setForm((current) => ({ ...current, gameType: event.target.value, gameLines: '', gamePrompt: '' }))}>
        {GAME_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <small className="helper-text">Esta configuración se guardará dentro del bloque del curso; no requiere otra base de datos.</small>
    </label>
    <label>Instrucciones para el colaborador
      <textarea rows="3" value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Explica qué debe hacer y qué aprenderá." />
    </label>
    {selected.value === 'decision' && <label>Escenario o situación que debe resolver
      <textarea rows="3" value={form.gamePrompt} onChange={(event) => setForm((current) => ({ ...current, gamePrompt: event.target.value }))} placeholder="Ante esta situación, ¿qué harías?" />
    </label>}
    <label>Elementos del juego
      <textarea rows="6" spellCheck={false} value={form.gameLines}
        onChange={(event) => setForm((current) => ({ ...current, gameLines: event.target.value }))}
        placeholder={EXAMPLES[selected.value]} />
      <small className="helper-text">{selected.hint}. Usa de 2 a 12 elementos. En una carta de decisión, una sola alternativa debe comenzar por *.</small>
    </label>
  </div>
}
