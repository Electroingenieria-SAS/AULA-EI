export function prepareCanvaPages(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 40).filter((entry) => entry && Number.isInteger(entry.page) && entry.page > 0)
    .map((entry) => ({
      page: entry.page,
      title: String(entry.title || 'Diapositiva ' + entry.page).slice(0, 140),
      explanation: String(entry.explanation || '').slice(0, 5000),
      takeaway: String(entry.takeaway || '').slice(0, 700),
    })).filter((entry) => entry.explanation.trim())
}

export function prepareCanvaQuestions(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 40).filter((entry) => entry && Number.isInteger(entry.page) && entry.page > 0)
    .map((entry) => ({
      page: entry.page,
      prompt: String(entry.prompt || '').slice(0, 400),
      options: Array.isArray(entry.options) ? entry.options.slice(0, 4).map((v) => String(v || '').slice(0, 250)) : [],
      correctIndex: Number(entry.correctIndex),
      kind: String(entry.kind || 'Comprensión').slice(0, 55),
      difficulty: String(entry.difficulty || 'Comprensión').slice(0, 35),
      sourceExcerpt: String(entry.sourceExcerpt || '').slice(0, 500),
      missingOptions: Array.isArray(entry.options) && entry.options.some(v => !String(v || '').trim()),
      optionStrategy: String(entry.optionStrategy || 'source').slice(0, 35),
      reviewRequired: true,
      selected: false,
    })).filter((entry) => entry.prompt.trim() && entry.options.length === 4 && entry.options[entry.correctIndex]?.trim() && Number.isInteger(entry.correctIndex) && entry.correctIndex >= 0 && entry.correctIndex < 4)
}
