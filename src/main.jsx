import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import { installRuntimeDiagnostics } from './runtime-diagnostics.js'
import { installReleaseMonitor } from './release-monitor.js'
import './release-monitor.css'
import '../studio/src/styles/core.css'
import '../studio/src/styles/users.css'
import '../studio/src/styles/certificates.css'
import '../studio/src/styles/courses.css'
import '../studio/src/styles/compliance.css'
import '../studio/src/styles/legal.css'
import '../player/src/styles/core.css'
import '../player/src/styles/course.css'
import '../player/src/styles/catalog.css'
import '../player/src/styles/shell.css'
import '../player/src/styles/modules.css'
import '../player/src/styles/learning.css'
import '../player/src/styles/study.css'
import '../player/src/styles/notifications.css'
import '../player/src/styles/privacy.css'
import '../player/src/experience.css'
import '../certificate/src/styles.css'
import '../certificate/src/experience.css'
import './auth.css'
import './legal/legal.css'
import './global-experience.css'
import './responsive-foundation.css'
import './responsive-controls.css'

installRuntimeDiagnostics()
const RELEASE_ID = __AULA_EI_RELEASE__
installReleaseMonitor({ release: RELEASE_ID, base: import.meta.env.BASE_URL })

const mobileStyleQuery = window.matchMedia('(max-width: 900px)')
let mobileStylesPromise = null

function loadMobileStyles() {
  if (mobileStylesPromise) return mobileStylesPromise
  mobileStylesPromise = (async () => {
    await import('./mobile.css')
    await import('./mobile-app.css')
  })()
  return mobileStylesPromise
}

async function bootstrap() {
  // En móvil cargamos la capa responsive antes del primer render para evitar FOUC.
  if (mobileStyleQuery.matches) await loadMobileStyles()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  )

  // Mantiene responsive real si una ventana de escritorio se reduce después.
  mobileStyleQuery.addEventListener?.('change', (event) => {
    if (event.matches) void loadMobileStyles()
  })
}

void bootstrap()


// A release monitor detects newer server builds without interrupting an exam
// or an administrator who is editing a form. The SW remains network-first.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('sw.js?v=' + encodeURIComponent(RELEASE_ID),
      window.location.origin + import.meta.env.BASE_URL).href

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Do not lose form input on an automatic reload: ask only when a newer
      // version.json has actually reached the currently served origin.
      window.dispatchEvent(new Event('aula-ei-worker-updated'))
    })

    navigator.serviceWorker.register(workerUrl, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Aula EI PWA: no fue posible actualizar el service worker.', error))
  }, { once: true })
}
