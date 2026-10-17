import { useState } from 'react'
import { Download, Share } from 'lucide-react'
import useInstallPrompt from '../../hooks/useInstallPrompt'

// Renders nothing unless installing is actually possible here: already installed, or a browser that
// offers no way to (desktop Firefox, in-app browsers), shows no button rather than a dead one.
export default function InstallAppButton({ className = '' }) {
  const { canPrompt, showIosSteps, install } = useInstallPrompt()
  const [showSteps, setShowSteps] = useState(false)

  if (!canPrompt && !showIosSteps) return null

  const base = `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-body font-semibold transition-all min-h-[40px] ${className}`

  return (
    <div>
      <button type="button" onClick={() => (canPrompt ? install() : setShowSteps(s => !s))}
        className={`${base} bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100`}>
        <Download size={14} aria-hidden="true" /> Install the app
      </button>
      {showSteps && (
        <p className="mt-2 max-w-xs text-xs font-body text-earth-600 leading-relaxed" role="status">
          Tap the <Share size={12} className="inline -mt-0.5" aria-label="Share" /> Share button in Safari,
          then choose <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  )
}
