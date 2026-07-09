import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSentry } from './utils/sentry'
import { initAnalytics } from './utils/analytics'

// Both are no-ops in dev / when their env var is unset — see the two modules.
initSentry()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
