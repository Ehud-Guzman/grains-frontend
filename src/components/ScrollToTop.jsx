import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
      document.body?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pathname, search])

  return null
}
