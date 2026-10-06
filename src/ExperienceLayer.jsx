import { useEffect } from 'react'

const REVEAL = [
  '.home-section-heading',
  '.catalog-workspace-header',
  '.games-section-heading',
  '.courses-overview',
  '.courses-library',
  '.assignment-intro',
  '.assignment-stats',
  '.panel-card',
  '.users-overview',
  '.certificates-overview',
  '.authoring-section',
  '.publish-actions-card',
  '.course-library-card',
  '.pending-certificate-card',
  '.compliance-metrics article',
  '.compliance-overview-grid',
  '.course-metrics-grid article',
  '.user-metrics-grid article',
  '.certificate-metrics-grid article',
  '.studio-navigation-shell',
].join(',')

function markVisibleElements(root = document) {
  if (!root?.querySelectorAll) return
  root.querySelectorAll(REVEAL).forEach((element) => {
    element.classList.add('premium-reveal', 'premium-reveal-in')
  })
}

export default function ExperienceLayer() {
  useEffect(() => {
    // Los reveals son decorativos: nunca deben vigilar cada mutación del DOM.
    // Se aplican una vez y al cambiar de ruta; las vistas dinámicas permanecen
    // visibles por defecto en lugar de mantener vigilancia continua del DOM.
    let frame = 0
    const scan = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        markVisibleElements()
      })
    }

    scan()
    window.addEventListener('hashchange', scan)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', scan)
    }
  }, [])

  return null
}
