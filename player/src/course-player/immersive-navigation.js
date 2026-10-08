export async function exitBrowserFullscreen() {
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement
  if (!fullscreenElement) return
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
  } catch {}
}

// Navigating a course slide must not unmount the fullscreen viewer.
export async function runViewerNavigation({ action, navigationBusyRef }) {
  if (!action || navigationBusyRef.current) return
  navigationBusyRef.current = true
  try {
    await action()
  } finally {
    navigationBusyRef.current = false
  }
}
