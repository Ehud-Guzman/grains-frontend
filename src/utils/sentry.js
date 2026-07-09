import * as Sentry from '@sentry/react'

// Mirrors backend/src/app.js's Sentry setup: production-only, no default PII,
// same scrub list (cookies, auth headers, request bodies, user reduced to id).
const DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!DSN || !import.meta.env.PROD) return

  Sentry.init({
    dsn: DSN,
    // Error tracking only — no performance tracing, no session replay.
    // Leaving `integrations` at its default still keeps the global
    // window.onerror / unhandledrejection handlers and breadcrumbs.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.authorization
          delete event.request.headers.Cookie
          delete event.request.headers.cookie
        }
      }
      if (event.user) {
        event.user = { id: event.user.id }
      }
      return event
    },
  })
}

export function captureException(error, extra) {
  if (!DSN) return
  Sentry.captureException(error, extra)
}
