import { GAME_TYPES, gameIsPlayable } from './game-data.js'

const flattenText = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()

const finiteText = (value, max = 220) => flattenText(value).slice(0, max)
const keyText = (value) => String(value || '').trim().toLocaleLowerCase('es')

/**
 * Use only content_blocks marked completed for this user and authored
 * learning material. Never access exam question banks or synthesize facts.
 */
export function collectCompletedCourseContent(course, completedIds = new Set()) {
  const completed = completedIds instanceof Set ? completedIds : new Set(completedIds)
  const phases = [...(course?.phases || [])]
    .filter((phase) => phase && phase.status !== 'draft')
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((phase) => ({
      id: phase.id,
      title: finiteText(phase.title, 100),
      blocks: [...(phase.blocks || [])]
        .filter((block) => block?.id && block.status !== 'draft' && completed.has(block.id))
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    }))
  return phases.filter((phase) => phase.blocks.length > 0)
}

const buildStudyPairs = (phases) => {
  const unique = new Set()
  const pairs = []
  for (const phase of phases) for (const block of phase.blocks) {
    if (!['text', 'image', 'video', 'presentation', 'audio', 'file', 'link'].includes(block.type)) continue
    const term = finiteText(block.title, 90)
    const definition = finiteText(block.description, 240)
    if (!term || definition.length < 18 || keyText(term) === keyText(definition) || unique.has(keyText(term))) continue
    unique.add(keyText(term))
    pairs.push({ term, definition })
  }
  return pairs
}

const buildPhaseItems = (phases) => {
  const seen = new Set()
  return phases.flatMap((phase) => phase.blocks
    .filter((block) => ['text', 'image', 'video', 'presentation', 'audio', 'file', 'link'].includes(block.type))
    .map((block) => ({ label: finiteText(block.title, 85), category: phase.title }))
    .filter(({ label }) => {
      if (!label || seen.has(keyText(label))) return false
      seen.add(keyText(label))
      return true
    }))
}

function fromAuthoredBlocks(phases, bucket) {
  for (const phase of phases) for (const block of phase.blocks) {
    if (block.type !== 'game' || !gameIsPlayable(block.content)) continue
    const gameType = block.content.gameType
    if (!bucket.has(gameType)) bucket.set(gameType, [])
    bucket.get(gameType).push({
      id: 'authored-' + block.id,
      title: finiteText(block.title, 110) || 'Repaso de contenido',
      source: 'authored',
      sourceLabel: 'Preparado por el equipo de formación',
      content: block.content,
    })
  }
}

export function generateCourseReviewGames(course, completedIds = new Set()) {
  const phases = collectCompletedCourseContent(course, completedIds)
  const bucket = new Map(GAME_TYPES.map((type) => [type.value, []]))
  fromAuthoredBlocks(phases, bucket)

  const pairs = buildStudyPairs(phases)
  if (pairs.length >= 2) for (let start = 0; start < pairs.length; start += 5) {
    const selection = [...pairs.slice(start, start + 5)]
    if (selection.length < 2) {
      selection.unshift(...pairs.slice(0, Math.min(2 - selection.length, pairs.length)))
    }
    bucket.get('memory').push({
      id: 'memory-' + start,
      title: 'Conceptos y descripciones de tu capacitación',
      source: 'generated',
      sourceLabel: 'Generado a partir de descripciones ya estudiadas',
      content: {
        gameType: 'memory',
        instructions: 'Relaciona cada tema con la descripción publicada en tu capacitación.',
        pairs: selection,
      },
    })
  }

  const classified = buildPhaseItems(phases)
  const categories = new Set(classified.map((entry) => keyText(entry.category)))
  if (classified.length >= 2 && categories.size >= 2) {
    for (let start = 0; start < classified.length; start += 6) {
      let selection = classified.slice(start, start + 6)
      if (new Set(selection.map((entry) => keyText(entry.category))).size < 2) {
        const other = classified.find((entry) => keyText(entry.category) !== keyText(selection[0]?.category))
        if (other) selection = [other, ...selection.filter((entry) => entry.label !== other.label)].slice(0, 6)
      }
      bucket.get('classification').push({
        id: 'classification-' + start,
        title: 'Ubica los contenidos en su fase',
        source: 'generated',
        sourceLabel: 'Generado desde las fases reales del curso',
        content: {
          gameType: 'classification',
          instructions: 'Identifica en qué fase de tu capacitación se encuentra cada contenido.',
          items: selection,
        },
      })
    }
  }

  for (const phase of phases) {
    const steps = phase.blocks
      .filter((block) => ['text', 'image', 'video', 'presentation', 'audio', 'file', 'link'].includes(block.type))
      .map((block) => finiteText(block.title, 110))
      .filter(Boolean)
    if (steps.length >= 3 && new Set(steps.map(keyText)).size === steps.length) {
      bucket.get('sequence').push({
        id: 'sequence-' + phase.id,
        title: 'Orden de estudio: ' + phase.title,
        source: 'generated',
        sourceLabel: 'Basado en el orden de los contenidos publicados',
        content: {
          gameType: 'sequence',
          instructions: 'Recuerda el orden en que estudiaste estos contenidos. Este orden es formativo, no un procedimiento operativo.',
          steps: steps.slice(0, 12),
        },
      })
    }
  }

  // When no authored decisions exist, practice exact published descriptions.
  // The alternatives are real texts from other completed contents, never
  // inferred facts or answers retrieved from the final examination.
  const distinctPairs = pairs.filter((entry, i) =>
    pairs.findIndex((other) => keyText(other.definition) === keyText(entry.definition)) === i)
  if (distinctPairs.length >= 3) {
    distinctPairs.slice(0, 12).forEach((pair, position) => {
      const distractors = distinctPairs.filter((entry) => entry !== pair)
        .slice(position + 1).concat(distinctPairs.filter((entry) => entry !== pair).slice(0, position + 1))
        .slice(0, 2)
      if (distractors.length < 2) return
      const options = [pair.definition, ...distractors.map((entry) => entry.definition)]
      const shift = position % options.length
      const rotated = [...options.slice(shift), ...options.slice(0, shift)]
      bucket.get('decision').push({
        id: 'description-' + position,
        title: 'La descripción correcta',
        source: 'generated',
        sourceLabel: 'Opciones extraídas de descripciones oficiales ya estudiadas',
        content: {
          gameType: 'decision',
          instructions: 'Identifica la descripción textual publicada para el tema. No es una pregunta del examen.',
          prompt: '¿Qué descripción aparece en la capacitación para «' + pair.term + '»?',
          options: rotated,
          correctIndex: rotated.indexOf(pair.definition),
        },
      })
    })
  }

  for (const phase of phases) for (const block of phase.blocks) {
    if (block.type !== 'validation') continue
    const content = block.content || {}
    const choices = Array.isArray(content.options) ? content.options.map((option) => finiteText(option, 220)) : []
    const correctIndex = Number(content.correctIndex)
    if (!finiteText(content.prompt) || choices.length < 2 || choices.some((option) => !option)
      || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) continue
    bucket.get('decision').push({
      id: 'decision-' + block.id,
      title: finiteText(block.title, 105) || 'Decisión sobre lo estudiado',
      source: 'generated',
      sourceLabel: 'Tomado de una validación completada, nunca del examen final',
      content: {
        gameType: 'decision',
        instructions: 'Repasa una pregunta de validación que ya completaste.',
        prompt: finiteText(content.prompt, 450),
        options: choices,
        correctIndex,
      },
    })
  }

  return GAME_TYPES.map(({ value, label }) => ({
    type: value,
    label,
    rounds: bucket.get(value).filter((round) => gameIsPlayable(round.content)),
  }))
}
