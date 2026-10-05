import { useEffect } from 'react'

export default function MobileViewportSync() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const compactQuery = window.matchMedia('(max-width: 900px)')
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const last = {
      height: null,
      width: null,
      offsetTop: null,
      keyboard: null,
      mobile: null,
      keyboardOpen: null,
      narrow: null,
      tablet: null,
      landscape: null,
    }
    let frame = 0

    const setVar = (key, value, cacheKey) => {
      if (last[cacheKey] === value) return
      last[cacheKey] = value
      root.style.setProperty(key, value + 'px')
    }

    const setClass = (name, value, cacheKey) => {
      if (last[cacheKey] === value) return
      last[cacheKey] = value
      body.classList.toggle(name, value)
    }

    const runSync = () => {
      frame = 0
      const viewport = window.visualViewport
      const height = Math.round(viewport?.height || window.innerHeight || 0)
      const width = Math.round(viewport?.width || window.innerWidth || 0)
      const offsetTop = Math.round(viewport?.offsetTop || 0)
      const keyboard = Math.max(0, Math.round((window.innerHeight || height) - height - offsetTop))
      const mobile = compactQuery.matches || coarseQuery.matches
      const keyboardOpen = mobile && keyboard > 110
      const narrow = mobile && width <= 380
      const tablet = mobile && width >= 600
      const landscape = mobile && width > height

      setVar('--mobile-vh', height, 'height')
      setVar('--mobile-vw', width, 'width')
      setVar('--mobile-offset-top', offsetTop, 'offsetTop')
      setVar('--mobile-keyboard-height', keyboard, 'keyboard')

      setClass('aula-mobile-runtime', mobile, 'mobile')
      setClass('aula-mobile-keyboard-open', keyboardOpen, 'keyboardOpen')
      setClass('aula-mobile-narrow', narrow, 'narrow')
      setClass('aula-mobile-tablet', tablet, 'tablet')
      setClass('aula-mobile-landscape', landscape, 'landscape')
    }

    const sync = () => {
      if (frame) return
      frame = requestAnimationFrame(runSync)
    }

    runSync()
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
      if (frame) cancelAnimationFrame(frame)
      body.classList.remove(
        'aula-mobile-runtime',
        'aula-mobile-keyboard-open',
        'aula-mobile-narrow',
        'aula-mobile-tablet',
        'aula-mobile-landscape',
      )
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
