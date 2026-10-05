import { useEffect } from 'react'

function detectIOS() {
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const touchMac = platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || touchMac
}

function detectIOSSafari(isIOS) {
  if (!isIOS) return false
  const ua = navigator.userAgent || ''
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
}

export default function MobileViewportSync() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const compactQuery = window.matchMedia('(max-width: 900px)')
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const isIOS = detectIOS()
    const isIOSSafari = detectIOSSafari(isIOS)

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
      ios: null,
      iosSafari: null,
      standalone: null,
    }

    let frame = 0
    let orientationTimer = 0
    let orientationSettleTimer = 0

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
      const offsetTop = Math.max(0, Math.round(viewport?.offsetTop || 0))
      const layoutHeight = Math.round(window.innerHeight || height)
      const keyboard = Math.max(0, layoutHeight - height - offsetTop)
      const mobile = compactQuery.matches || coarseQuery.matches
      const keyboardOpen = mobile && keyboard > (isIOS ? 80 : 110)
      const narrow = mobile && width <= 380
      const tablet = mobile && width >= 600
      const landscape = mobile && width > height
      const standalone = Boolean(standaloneQuery.matches || navigator.standalone === true)

      setVar('--mobile-vh', height, 'height')
      setVar('--mobile-vw', width, 'width')
      setVar('--mobile-offset-top', offsetTop, 'offsetTop')
      setVar('--mobile-keyboard-height', keyboard, 'keyboard')

      setClass('aula-mobile-runtime', mobile, 'mobile')
      setClass('aula-mobile-keyboard-open', keyboardOpen, 'keyboardOpen')
      setClass('aula-mobile-narrow', narrow, 'narrow')
      setClass('aula-mobile-tablet', tablet, 'tablet')
      setClass('aula-mobile-landscape', landscape, 'landscape')
      setClass('aula-ios-runtime', mobile && isIOS, 'ios')
      setClass('aula-ios-safari', mobile && isIOSSafari, 'iosSafari')
      setClass('aula-mobile-standalone', mobile && standalone, 'standalone')
    }

    const sync = () => {
      if (frame) return
      frame = requestAnimationFrame(runSync)
    }

    const onOrientationChange = () => {
      sync()
      clearTimeout(orientationTimer)
      clearTimeout(orientationSettleTimer)
      orientationTimer = window.setTimeout(sync, 120)
      orientationSettleTimer = window.setTimeout(sync, 420)
    }

    const onFocusChange = () => {
      sync()
      window.setTimeout(sync, 80)
      window.setTimeout(sync, 260)
    }

    runSync()
    window.addEventListener('resize', sync, { passive: true })
    window.addEventListener('orientationchange', onOrientationChange, { passive: true })
    window.addEventListener('focusin', onFocusChange, { passive: true })
    window.addEventListener('focusout', onFocusChange, { passive: true })
    window.visualViewport?.addEventListener('resize', sync, { passive: true })
    window.visualViewport?.addEventListener('scroll', sync, { passive: true })
    compactQuery.addEventListener?.('change', sync)
    coarseQuery.addEventListener?.('change', sync)
    standaloneQuery.addEventListener?.('change', sync)

    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', onOrientationChange)
      window.removeEventListener('focusin', onFocusChange)
      window.removeEventListener('focusout', onFocusChange)
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      compactQuery.removeEventListener?.('change', sync)
      coarseQuery.removeEventListener?.('change', sync)
      standaloneQuery.removeEventListener?.('change', sync)
      if (frame) cancelAnimationFrame(frame)
      clearTimeout(orientationTimer)
      clearTimeout(orientationSettleTimer)
      body.classList.remove(
        'aula-mobile-runtime',
        'aula-mobile-keyboard-open',
        'aula-mobile-narrow',
        'aula-mobile-tablet',
        'aula-mobile-landscape',
        'aula-ios-runtime',
        'aula-ios-safari',
        'aula-mobile-standalone',
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
