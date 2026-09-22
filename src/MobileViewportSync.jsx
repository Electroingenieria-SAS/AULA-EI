import { useEffect } from 'react'

export default function MobileViewportSync() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const compactQuery = window.matchMedia('(max-width: 900px)')
    const coarseQuery = window.matchMedia('(pointer: coarse)')

    const sync = () => {
      const viewport = window.visualViewport
      const height = Math.round(viewport?.height || window.innerHeight || 0)
      const width = Math.round(viewport?.width || window.innerWidth || 0)
      const offsetTop = Math.round(viewport?.offsetTop || 0)
      const keyboard = Math.max(0, Math.round((window.innerHeight || height) - height - offsetTop))
      const mobile = compactQuery.matches || coarseQuery.matches

      root.style.setProperty('--mobile-vh', height + 'px')
      root.style.setProperty('--mobile-vw', width + 'px')
      root.style.setProperty('--mobile-offset-top', offsetTop + 'px')
      root.style.setProperty('--mobile-keyboard-height', keyboard + 'px')

      body.classList.toggle('aula-mobile-runtime', mobile)
      body.classList.toggle('aula-mobile-keyboard-open', mobile && keyboard > 110)
    }

    sync()
    window.addEventListener('resize', sync, { passive: true })
    window.addEventListener('orientationchange', sync, { passive: true })
    window.visualViewport?.addEventListener('resize', sync, { passive: true })
    window.visualViewport?.addEventListener('scroll', sync, { passive: true })
    compactQuery.addEventListener?.('change', sync)
    coarseQuery.addEventListener?.('change', sync)

    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      compactQuery.removeEventListener?.('change', sync)
      coarseQuery.removeEventListener?.('change', sync)
      body.classList.remove('aula-mobile-runtime', 'aula-mobile-keyboard-open')
      root.style.removeProperty('--mobile-vh')
      root.style.removeProperty('--mobile-vw')
      root.style.removeProperty('--mobile-offset-top')
      root.style.removeProperty('--mobile-keyboard-height')
    }
  }, [])

  return null
}

export function mobileHaptic(duration = 8) {
  if (!document.body.classList.contains('aula-mobile-runtime')) return
  if (typeof navigator.vibrate !== 'function') return
  try { navigator.vibrate(Math.max(1, Math.min(18, Number(duration) || 8))) } catch {}
}
