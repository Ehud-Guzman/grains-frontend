import { Component } from 'react'
import { captureException } from '../utils/sentry'
import { isChunkLoadError, reloadForNewVersion } from '../utils/chunkReload'

// A deploy mid-session makes the old hashed lazy chunks 404, which surfaces here as a
// dynamic-import failure. One automatic reload picks up the new bundle (see chunkReload.js).

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error)) {
      if (reloadForNewVersion()) return
      // Reload already tried moments ago: show the update prompt below, not a bug report.
      return
    }
    // Chunk-load errors are deploy-timing noise (handled above by reload),
    // not real bugs — don't spend Sentry quota on them.
    captureException(error, { contexts: { react: { componentStack: info.componentStack } } })
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (isChunkLoadError(this.state.error)) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-cream p-6">
            <div className="max-w-md w-full text-center">
              <p className="text-4xl mb-4">🔄</p>
              <h1 className="text-xl font-semibold text-earth-900 mb-2">We just updated the shop</h1>
              <p className="text-earth-500 text-sm mb-6">Reload to get the latest version. Your cart is saved.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        )
      }

      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-6">
          <div className="max-w-md w-full text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-xl font-semibold text-earth-900 mb-2">Something went wrong</h1>
            <p className="text-earth-500 text-sm mb-6">
              An unexpected error occurred. Please refresh the page.
              If the problem persists, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
