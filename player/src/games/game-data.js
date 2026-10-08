export const GAME_TYPES = [
  { value: 'memory', label: 'Memoria de conceptos', hint: 'Concepto | Definición, uno por línea' },
  { value: 'classification', label: 'Clasificación', hint: 'Elemento | Categoría, uno por línea' },
  { value: 'sequence', label: 'Ordenar procesos', hint: 'Un paso por línea, en el orden correcto' },
  { value: 'decision', label: 'Cartas de decisión', hint: 'Una respuesta por línea; marca la correcta con * al inicio' },
]

const cleanLines = (source) => String(source || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

export function gameLines(content = {}) {
  if (content.gameType === 'memory') return (content.pairs || []).map((item) => `${item.term} | ${item.definition}`).join('\n')
  if (content.gameType === 'classification') return (content.items || []).map((item) => `${item.label} | ${item.category}`).join('\n')
  if (content.gameType === 'sequence') return (content.steps || []).join('\n')
  if (content.gameType === 'decision') return (content.options || []).map((option, i) => (i === content.correctIndex ? '*' : '') + option).join('\n')
  return ''
}

export function buildGameContent({ gameType, instructions, lines, prompt }) {
  const input = cleanLines(lines)
  const kind = GAME_TYPES.find((entry) => entry.value === gameType)?.value
  if (!kind) throw new Error('Selecciona uno de los cuatro tipos de juego interactivo.')
  if (input.length < 2 || input.length > 12) throw new Error('El juego necesita entre 2 y 12 elementos.')
  const base = { gameType: kind, instructions: String(instructions || '').trim() }
  if (kind === 'memory' || kind === 'classification') {
    const rows = input.map((line) => line.split('|').map((part) => part.trim()))
    if (rows.some((parts) => parts.length !== 2 || !parts[0] || !parts[1])) {
      throw new Error('Cada línea debe tener dos textos separados por el símbolo |.')
    }
    const unique = new Set(rows.map((parts) => parts[0].toLocaleLowerCase('es')))
    if (unique.size !== rows.length) throw new Error('Los conceptos o elementos del juego no pueden repetirse.')
    if (kind === 'memory') return { ...base, pairs: rows.map(([term, definition]) => ({ term, definition })) }
    if (new Set(rows.map(([, category]) => category.toLocaleLowerCase('es'))).size < 2) {
      throw new Error('La clasificación necesita por lo menos dos categorías diferentes.')
    }
    return { ...base, items: rows.map(([label, category]) => ({ label, category })) }
  }
  if (kind === 'sequence') {
    if (new Set(input.map((line) => line.toLocaleLowerCase('es'))).size !== input.length) {
      throw new Error('Los pasos del proceso no deben repetirse.')
    }
    return { ...base, steps: input }
  }
  const normalized = input.map((line) => line.replace(/^\*/, '').trim())
  const correctIndex = input.findIndex((line) => line.startsWith('*'))
  if (!String(prompt || '').trim() || normalized.some((text) => !text) || input.filter((line) => line.startsWith('*')).length !== 1) {
    throw new Error('Escribe un escenario y marca exactamente una respuesta correcta con *.')
  }
  return { ...base, prompt: String(prompt).trim(), options: normalized, correctIndex }
}

export function gameIsPlayable(content = {}) {
  const t = content.gameType
  if (t === 'memory') return Array.isArray(content.pairs) && content.pairs.length >= 2
  if (t === 'classification') return Array.isArray(content.items) && content.items.length >= 2
  if (t === 'sequence') return Array.isArray(content.steps) && content.steps.length >= 2
  if (t === 'decision') return Array.isArray(content.options) && content.options.length >= 2 && Number.isInteger(content.correctIndex) && content.correctIndex >= 0 && content.correctIndex < content.options.length
  return false
}

export const DEMO_GAMES = [
  {
    id: 'memory', title: 'Memoria de conceptos', gameType: 'memory',
    instructions: 'Relaciona cada concepto con su definición. Ejemplo de práctica, no evaluado.',
    pairs: [
      { term: 'Procedimiento', definition: 'Describe una secuencia definida de actividades.' },
      { term: 'Registro', definition: 'Conserva evidencia de una actividad realizada.' },
      { term: 'Mejora continua', definition: 'Busca resultados mejores mediante revisión y acciones.' },
    ],
  },
  {
    id: 'classification', title: 'Clasificación', gameType: 'classification',
    instructions: 'Ubica cada ejemplo en su categoría correcta.',
    items: [
      { label: 'Instrucción de trabajo', category: 'Documento' },
      { label: 'Acta de inspección', category: 'Registro' },
      { label: 'Formato diligenciado', category: 'Registro' },
      { label: 'Procedimiento aprobado', category: 'Documento' },
    ],
  },
  {
    id: 'sequence', title: 'Ordenar procesos', gameType: 'sequence',
    instructions: 'Organiza un ciclo genérico de mejora y comprueba el orden.',
    steps: ['Identificar la situación', 'Analizar las causas', 'Implementar una acción', 'Comprobar el resultado'],
  },
  {
    id: 'decision', title: 'Cartas de decisión', gameType: 'decision',
    instructions: 'Elige la acción adecuada ante esta situación ilustrativa.',
    prompt: 'Detectas información incorrecta en un registro que aún no se ha aprobado. ¿Qué deberías hacer?',
    options: ['Ignorar el error para terminar antes', 'Solicitar la corrección y seguir el procedimiento vigente', 'Eliminar toda la información sin dejar evidencia'],
    correctIndex: 1,
  },
]
