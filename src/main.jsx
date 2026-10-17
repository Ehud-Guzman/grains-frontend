import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSentry } from './utils/sentry'
import { initAnalytics } from './utils/analytics'
import { reloadForNewVersion } from './utils/chunkReload'

// Both are no-ops in dev / when their env var is unset — see the two modules.
initSentry()
initAnalytics()

// Vite fires this when a lazy chunk or its CSS fails to load, usually because a deploy replaced it.
// Reload straight away (before the error boundary ever shows) instead of leaving a broken page.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
