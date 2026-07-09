import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/analytics'

// Sibling to ScrollToTop.jsx — same "listen on every navigation" shape,
// separate file to keep scroll behavior and analytics independently testable.
export default function RouteTracker() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    trackPageView(pathname + search)
  }, [pathname, search])

  return null
}
