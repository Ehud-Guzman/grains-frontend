import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// ── Shared Modal ──────────────────────────────────────────────────────────────
// Replaces the 23 hand-rolled `fixed inset-0 bg-black/60 …` overlays that all
// re-implemented the backdrop but none of the accessibility. Before this
// component existed: 3 of 23 overlays had role="dialog", 0 trapped focus, and
// the entire codebase contained 2 `.focus()` calls — so a keyboard user could
// Tab straight out of an open modal into the page behind it, and focus was
// never returned to the control that opened it.
//
// What it handles so callers don't have to:
//   • Portal to document.body (escapes any `overflow: hidden` / transform
//     ancestor that would clip a fixed-position panel — e.g. inside .page-enter)
//   • role="dialog" + aria-modal + aria-label/labelledby
//   • Focus moves into the panel on open, Escape closes, Tab/Shift+Tab cycle
//   • Focus is restored to the previously-focused element on close
//   • Body scroll locked while open (previously only CataloguePage did this),
//     with the pre-existing overflow value restored rather than blanked
//
// Migration is deliberately low-friction: this renders the backdrop and the
// panel box only. Keep your existing header/body markup as `children` and pass
// `panelClassName` for the width/rounding you already had.

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  onClose,
  children,
  /** Accessible name. Should match the visible heading text. */
  label,
  /** Or point at a visible heading's id for a stronger association. */
  labelledBy,
  describedBy,
  /** Panel box classes — width, rounding, border, max-height go here. */
  panelClassName = 'bg-white w-full sm:max-w-sm rounded-2xl shadow-2xl border border-earth-100',
  /** Backdrop classes — override for a darker/lighter scrim. */
  backdropClassName = 'bg-black/60 backdrop-blur-sm',
  /**
   * Panel placement.
   *  'center' (default) | 'top' | 'bottom' (mobile bottom-sheet) |
   *  'right' | 'left' (full-height drawers/side sheets)
   */
  placement = 'center',
  /** Clicking the backdrop dismisses. Set false for destructive confirms. */
  dismissOnBackdrop = true,
  /** Escape dismisses. Set false for irreversible in-flight operations. */
  dismissOnEscape = true,
  /** Element to focus first instead of the panel's first focusable child. */
  initialFocusRef,
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)

  // Lock scroll + remember/restore focus. Read the existing inline overflow
  // value rather than assuming '' — another overlay (or the mobile filter
  // drawer) may already have locked it, and blanking it would unlock early.
  useEffect(() => {
    previouslyFocused.current = document.activeElement
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prevOverflow
      const el = previouslyFocused.current
      // Guard: the trigger may have unmounted (e.g. a row deleted by the modal).
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus()
    }
  }, [])

  // Move focus into the panel. `requestAnimationFrame` because the portal has
  // not necessarily painted at effect time; without it the first Tab can jump
  // back to the document.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current
        || panelRef.current?.querySelector(FOCUSABLE_SELECTOR)
        || panelRef.current
      target?.focus?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [initialFocusRef])

  // Focus trap + Escape handling. Kept as a stable callback so the listener
  // below is registered once per open rather than on every render.
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && dismissOnEscape) {
      e.stopPropagation()
      onClose?.()
      return
    }
    if (e.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return
    // No visibility filter here on purpose. `offsetParent` (the usual trick) is
    // null both in jsdom and in real browsers for elements inside a
    // `position: fixed` subtree, which would silently break the trap for any
    // modal with a fixed-position ancestor. FOCUSABLE_SELECTOR already excludes
    // disabled controls and `tabindex="-1"`, which is the case that matters.
    const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) {
      e.preventDefault()
      panel.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [dismissOnEscape, onClose])

  // The trap listens on `document` rather than via a React onKeyDown prop on the
  // panel. Two reasons: Escape still closes the dialog even if focus has somehow
  // landed outside it, and a focus trap is a global concern — attaching it to a
  // non-interactive container element is a false positive for the a11y rules.
  // Capture phase so the handler runs before any element inside the dialog can
  // swallow the event.
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  if (typeof document === 'undefined') return null

  const isSideSheet = placement === 'right' || placement === 'left'

  const containerClass = {
    top: 'items-start pt-6',
    bottom: 'items-end sm:items-center',
    right: 'items-stretch justify-end p-0',
    left: 'items-stretch justify-start p-0',
    center: 'items-center',
  }[placement] || 'items-center'

  // Only impose a default max-height when the caller hasn't specified one —
  // otherwise the two `max-h-*` utilities collide and Tailwind's stylesheet
  // ordering (not the class-attribute order) decides the winner.
  const callerSetsMaxHeight = /(^|\s)max-h-/.test(panelClassName)
  const baseClass = isSideSheet
    ? 'h-full'
    : callerSetsMaxHeight ? '' : 'max-h-[92vh]'

  return createPortal(
    // The backdrop is a presentational scrim: `role="presentation"` keeps it out
    // of the accessibility tree, and mouse-to-dismiss is a convenience layered on
    // top of the Escape handler (so no keyboard path depends on this existing).
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex justify-center ${isSideSheet ? '' : 'sm:p-4'} ${containerClass} ${backdropClassName}`}
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': label })}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        tabIndex={-1}
        className={`${panelClassName} ${baseClass} flex flex-col outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Convenience header for the common icon + title + close-button pattern that
 * every modal in the app reimplemented. Pair with `labelledBy={titleId}` on the
 * parent Modal so the dialog's accessible name comes from the visible heading.
 */
export function ModalHeader({ title, subtitle, icon: Icon, onClose, titleId, tone = 'brand' }) {
  const toneClass = tone === 'admin'
    ? 'bg-admin-100 text-admin-700'
    : 'bg-brand-50 text-brand-600'
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-earth-100 flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClass}`}>
            <Icon size={15} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h3 id={titleId} className="font-display font-semibold text-earth-900 truncate">{title}</h3>
          {subtitle && <p className="text-earth-400 text-xs font-body truncate">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 -m-1 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-700 transition-colors flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

