import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '../studio/src/styles.css'
import '../player/src/styles.css'
import '../player/src/experience.css'
import '../certificate/src/styles.css'
import '../certificate/src/experience.css'
import './auth.css'
import './global-experience.css'
import './mobile.css'
import './mobile-app.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('sw.js', window.location.origin + import.meta.env.BASE_URL).href
    navigator.serviceWorker.register(workerUrl, { scope: import.meta.env.BASE_URL })
      .catch((error) => console.warn('Aula EI PWA: no fue posible registrar el service worker.', error))
  }, { once: true })
}
