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

export default function ExperienceLayer() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('premium-reveal-in')
        observer.unobserve(entry.target)
      })
    }, { threshold: .06, rootMargin: '0px 0px -4% 0px' })

    let revealOrder = 0
    const scan = (root = document) => {
      const nodes = []
      if (root.matches?.(REVEAL)) nodes.push(root)
      if (root.querySelectorAll) nodes.push(...root.querySelectorAll(REVEAL))
      nodes.forEach((element) => {
        if (element.dataset.premiumReveal === '1') return
        element.dataset.premiumReveal = '1'
        element.dataset.revealOrder = String((revealOrder % 4) + 1)
        revealOrder += 1
        element.classList.add('premium-reveal')
        observer.observe(element)
      })
    }

    scan()
    const pendingRoots = new Set()
    let scanFrame = 0
    const flushScans = () => {
      scanFrame = 0
      pendingRoots.forEach((node) => scan(node))
      pendingRoots.clear()
    }
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) pendingRoots.add(node)
      }))
      if (pendingRoots.size && !scanFrame) scanFrame = requestAnimationFrame(flushScans)
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (scanFrame) cancelAnimationFrame(scanFrame)
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])

  return null
}
