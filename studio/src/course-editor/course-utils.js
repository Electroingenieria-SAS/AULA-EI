export function statusLabel(status) {
  if (status === 'published') return 'Publicada'
  if (status === 'archived') return 'Archivada'
  return 'Borrador'
}

export function clampScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 80
  return Math.max(1, Math.min(100, Math.round(number)))
}

export function exampleForType(type) {
  const examples = {
    text: 'Conceptos clave',
    video: 'Video de introducción',
    presentation: 'Presentación del proceso',
    image: 'Infografía de seguridad',
    audio: 'Cápsula de audio',
    file: 'Manual descargable',
    link: 'Recurso de consulta',
    game: 'Actividad de práctica',
    validation: 'Verificación rápida',
  }
  return examples[type] || 'Contenido de la fase'
}
