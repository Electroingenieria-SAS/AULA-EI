import { useEffect } from 'react'

const INTERACTIVE = 'button,a,[role="button"],input,select,textarea,label,.home-course-card,.catalog-course-card,.games-grid article,.course-library-card,.pending-certificate-card,.user-identity-button,.certificate-person-button,.image-learning-canvas,.studio-navigation-button,.compliance-tabs button,.certificate-view-switch button'
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
  '.users-directory',
  '.certificates-overview',
  '.certificates-workspace',
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

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const dot = finePointer ? document.createElement('i') : null
    const ring = finePointer ? document.createElement('i') : null

    if (dot && ring) {
      dot.id = 'aula-pointer-dot'
      ring.id = 'aula-pointer-ring'
      dot.setAttribute('aria-hidden', 'true')
      ring.setAttribute('aria-hidden', 'true')
      document.body.append(dot, ring)
    }

    let targetX = -80
    let targetY = -80
    let ringX = -80
    let ringY = -80
    let dotX = -80
    let dotY = -80
    let frame = 0

    const draw = () => {
      if (!dot || !ring) return
      ringX += (targetX - ringX) * .18
      ringY += (targetY - ringY) * .18
      dotX += (targetX - dotX) * .46
      dotY += (targetY - dotY) * .46
      ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)'
      dot.style.transform = 'translate3d(' + dotX + 'px,' + dotY + 'px,0) translate(-50%,-50%)'
      const remaining = Math.abs(targetX-ringX)+Math.abs(targetY-ringY)+Math.abs(targetX-dotX)+Math.abs(targetY-dotY)
      frame = remaining > .35 ? requestAnimationFrame(draw) : 0
    }

    const onMove = (event) => {
      if (!dot || !ring || event.pointerType === 'touch') return
      targetX = event.clientX
      targetY = event.clientY
      document.body.classList.add('aula-pointer-visible')
      if (!frame) frame = requestAnimationFrame(draw)
    }

    const onOver = (event) => {
      if (!dot || !ring) return
      document.body.classList.toggle('aula-interactive-hover', Boolean(event.target.closest?.(INTERACTIVE)))
    }

    const onDown = (event) => {
      if (!event.target.closest?.(INTERACTIVE)) return
      document.body.classList.add('aula-pointer-down')
      const burst = document.createElement('i')
      burst.className = 'aula-click-burst'
      burst.setAttribute('aria-hidden', 'true')
      burst.style.left = event.clientX + 'px'
      burst.style.top = event.clientY + 'px'
      document.body.appendChild(burst)
      setTimeout(() => burst.remove(), 620)
    }

    const onUp = () => document.body.classList.remove('aula-pointer-down')
    const onOut = (event) => {
      if (!event.relatedTarget) document.body.classList.remove('aula-pointer-visible')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    window.addEventListener('pointerout', onOut, { passive: true })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('premium-reveal-in')
        observer.unobserve(entry.target)
      })
    }, { threshold: .08, rootMargin: '0px 0px -6% 0px' })

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
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scan(node)
      }))
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('pointerout', onOut)
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      mutations.disconnect()
      dot?.remove()
      ring?.remove()
      document.body.classList.remove('aula-pointer-visible','aula-interactive-hover','aula-pointer-down')
    }
  }, [])

  return null
}
