export async function exitBrowserFullscreen() {
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement
  if (!fullscreenElement) return
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
  } catch {}
}

export async function runViewerNavigation({ action, navigationBusyRef, close }) {
  if (!action || navigationBusyRef.current) return
  navigationBusyRef.current = true
  close()
  window.requestAnimationFrame(() => {
    action()
    window.setTimeout(() => { navigationBusyRef.current = false }, 250)
  })
}
