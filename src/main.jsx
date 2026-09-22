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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
