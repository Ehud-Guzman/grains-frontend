import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production this would go to Sentry / error tracking
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
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
