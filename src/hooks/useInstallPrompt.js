import { useEffect, useState, useCallback } from 'react'

// "Install the app" support. The PWA itself (manifest + Workbox worker) is already there; what was
// missing is a way to offer it. Chrome and Edge hand us a one-shot install prompt; iOS Safari has no
// prompt at all, so the best we can do there is show the Share -> Add to Home Screen steps.
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

export const isIosSafari = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Other iOS browsers (Chrome, Firefox) cannot add to the home screen the same way.
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return ios && safari
}

export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => { setDeferred(null); setInstalled(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return 'unavailable'
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null) // the browser only allows one prompt per event
    return outcome
  }, [deferred])

  return {
    installed,
    canPrompt: !!deferred && !installed,
    showIosSteps: !installed && !deferred && isIosSafari(),
    install,
  }
}
