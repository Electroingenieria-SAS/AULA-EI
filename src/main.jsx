import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import '../studio/src/styles/core.css'
import '../studio/src/styles/users.css'
import '../studio/src/styles/certificates.css'
import '../studio/src/styles/courses.css'
import '../studio/src/styles/compliance.css'
import '../player/src/styles/core.css'
import '../player/src/styles/course.css'
import '../player/src/styles/catalog.css'
import '../player/src/styles/shell.css'
import '../player/src/styles/modules.css'
import '../player/src/styles/notifications.css'
import '../player/src/experience.css'
import '../certificate/src/styles.css'
import '../certificate/src/experience.css'
import './auth.css'
import './global-experience.css'
import './responsive-foundation.css'
import './responsive-controls.css'

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


if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('sw.js?v=2', window.location.origin + import.meta.env.BASE_URL).href
    let refreshing = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || sessionStorage.getItem('aula-ei-pwa-refresh-v2') === '1') return
      refreshing = true
      sessionStorage.setItem('aula-ei-pwa-refresh-v2', '1')
      window.location.reload()
    })

    navigator.serviceWorker.register(workerUrl, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Aula EI PWA: no fue posible actualizar el service worker.', error))
  }, { once: true })
}
