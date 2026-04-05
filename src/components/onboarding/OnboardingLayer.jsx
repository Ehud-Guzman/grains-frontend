import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Compass, Sparkles, ArrowRight, X, LifeBuoy, CheckCircle2, ShoppingCart, Lightbulb, Package, Search, CreditCard, MapPin, Star } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'

// ─── Shared primitives ──────────────────────────────────────────────────────

/**
 * Structural wrapper for dark-themed overlay cards.
 * Each consumer can place its own glow divs inside `children` as needed.
 */
function DarkShell({ className = '', children }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101826] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${className}`}>
      {children}
    </div>
  )
}

/** Eyebrow badge used consistently across tour overlays and panels. */
function TourBadge({ icon: Icon = Sparkles, children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.2em] text-brand-200">
      <Icon size={12} />
      {children}
    </div>
  )
}

// ─── useTargetRect ──────────────────────────────────────────────────────────
/**
 * Tracks the bounding rect of `[data-tour="${targetId}"]`.
 *
 * Strategy:
 *  - If the element already exists, measure it immediately and attach a
 *    ResizeObserver to track size/position changes.
 *  - If the element doesn't exist yet (e.g. the tour just navigated to a new
 *    page), a MutationObserver watches for it to appear, then hands off to
 *    ResizeObserver once it does.
 *  - scroll/resize events keep the rect in sync during scrolling.
 *
 * Replaces a 250 ms setInterval — no constant polling.
 */
function useTargetRect(targetId, enabled) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!enabled || !targetId) {
      setRect(null)
      return
    }

    let ro = null
    let mo = null

    const measure = () => {
      const el = document.querySelector(`[data-tour="${targetId}"]`)
      if (!el) return
      const b = el.getBoundingClientRect()
      // Element is display:none (hidden on this breakpoint) — treat as not found
      if (b.width === 0 && b.height === 0) {
        setRect(null)
        return
      }
      setRect({ top: b.top, left: b.left, width: b.width, height: b.height })
    }

    const connect = () => {
      const el = document.querySelector(`[data-tour="${targetId}"]`)
      if (!el) return false
      measure()
      ro = new ResizeObserver(measure)
      ro.observe(el)
      return true
    }

    if (!connect()) {
      // Element not in DOM yet — watch for it
      mo = new MutationObserver(() => {
        if (connect()) mo.disconnect()
      })
      mo.observe(document.body, { childList: true, subtree: true })
    }

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true, capture: true })

    return () => {
      ro?.disconnect()
      mo?.disconnect()
      setRect(null)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, { capture: true })
    }
  }, [targetId, enabled])

  return rect
}

// ─── WelcomeModal ───────────────────────────────────────────────────────────

function WelcomeModal() {
  const { welcomeTour, tours, startTour, dismissWelcome } = useOnboarding()

  if (!welcomeTour) return null
  const config = tours[welcomeTour]?.welcome
  if (!config) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#05070c]/58 backdrop-blur-none sm:backdrop-blur-[2px]" />
      <DarkShell className="relative w-full max-w-xl my-auto max-h-[90vh] overflow-y-auto">
        {/* Glows */}
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative p-8 sm:p-10">
          <div className="flex items-start justify-between gap-4 mb-8">
            <TourBadge>{config.eyebrow}</TourBadge>
            <button
              onClick={() => dismissWelcome(welcomeTour)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-w-lg mb-8">
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-white mb-4">
              {config.title}
            </h2>
            <p className="text-sm sm:text-base font-body leading-relaxed text-white/70">
              {config.body}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => startTour(welcomeTour)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3.5 font-body font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
            >
              <Compass size={17} />
              {config.cta}
            </button>
            <button
              onClick={() => dismissWelcome(welcomeTour)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-body font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DarkShell>
    </div>,
    document.body
  )
}

// ─── TourOverlay ────────────────────────────────────────────────────────────

function TourOverlay() {
  const { activeTour, currentStep, tours, nextStep, prevStep, skipTour } = useOnboarding()
  const definition = activeTour ? tours[activeTour] : null
  const step = definition?.steps?.[currentStep]
  const rect = useTargetRect(step?.target, !!step)

  // Scroll the target element into view when the step changes.
  // Uses a `cancelled` flag to prevent stale async callbacks from firing
  // after the effect has been cleaned up.
  useEffect(() => {
    if (!step?.target) return

    let cancelled = false
    let attempts = 0

    const ensureVisible = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) {
        if (++attempts < 12) window.setTimeout(ensureVisible, 160)
        return
      }
      const bounds = el.getBoundingClientRect()
      const isMobile = window.innerWidth < 640
      const vh = window.innerHeight
      const topMargin = 72

      if (isMobile) {
        const targetCenterY = bounds.top + bounds.height / 2
        const tooltipInLower = targetCenterY > vh * 0.5
        // When tooltip goes top, keep target in lower half (below ~200px); when tooltip goes bottom, keep target in upper ~55%
        const reservedTop = tooltipInLower ? 200 : topMargin
        const reservedBottom = tooltipInLower ? 80 : 320
        if (bounds.top < reservedTop || bounds.bottom > vh - reservedBottom) {
          el.scrollIntoView({ behavior: 'smooth', block: tooltipInLower ? 'end' : 'start', inline: 'nearest' })
        }
      } else {
        const reservedBottom = 96
        if (bounds.top < topMargin || bounds.bottom > vh - reservedBottom) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }
      }
    }

    const timer = window.setTimeout(ensureVisible, 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [step?.target, activeTour, currentStep])

  const tooltipStyle = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 16

    if (!rect) {
      // No spotlight target (element hidden on this breakpoint) — pin to bottom on mobile, centre on desktop
      if (vw < 640) {
        const tipW = Math.min(vw * 0.92, 360)
        return { bottom: margin, left: (vw - tipW) / 2, top: 'auto', transform: 'none' }
      }
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    // On mobile: pin to top or bottom depending on where the target is,
    // so the tooltip never overlaps the spotlit element.
    if (vw < 640) {
      const tipW = Math.min(vw * 0.92, 360)
      const targetCenterY = rect.top + rect.height / 2
      // If target is in the lower half of the screen, tooltip goes to the top
      if (targetCenterY > vh * 0.5) {
        return { top: margin, left: (vw - tipW) / 2, bottom: 'auto', transform: 'none' }
      }
      return { bottom: margin, left: (vw - tipW) / 2, top: 'auto', transform: 'none' }
    }

    const tooltipWidth = 360
    const tooltipHeight = 260
    const spaceBelow = vh - (rect.top + rect.height)
    const spaceAbove = rect.top

    let top
    if (spaceBelow >= tooltipHeight + 20) {
      top = rect.top + rect.height + 16        // below target
    } else if (spaceAbove >= tooltipHeight + 20) {
      top = rect.top - tooltipHeight - 16      // above target
    } else {
      // Not enough room above or below — align to whichever side has more space
      top = spaceBelow >= spaceAbove
        ? Math.min(rect.top + rect.height + 16, vh - tooltipHeight - margin)
        : Math.max(margin, rect.top - tooltipHeight - 16)
    }

    let left = rect.left
    if (left + tooltipWidth > vw - margin) left = vw - tooltipWidth - margin
    if (left < margin) left = margin

    return { top, left, transform: 'none' }
  }, [rect])

  if (!step) return null

  return createPortal(
    <div className="fixed inset-0 z-[130] pointer-events-none">
      <div className="absolute inset-0 bg-[#05070c]/48 backdrop-blur-none sm:backdrop-blur-[1.5px]" />

      {/* Spotlight cutout — only the inline boxShadow is used; no duplicate className shadow */}
      {rect && (
        <div
          className="absolute rounded-[1.4rem] border border-brand-300/60 bg-white/5 transition-all duration-300"
          style={{
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 0 0 9999px rgba(5,7,12,0.18)',
          }}
        />
      )}

      <DarkShell
        className="absolute w-[min(92vw,360px)] pointer-events-auto"
        style={tooltipStyle}
      >
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <TourBadge icon={Compass}>
              Step {currentStep + 1} of {definition.steps.length}
            </TourBadge>
            <button
              onClick={skipTour}
              className="text-xs font-body font-semibold text-white/55 transition-colors hover:text-white"
            >
              Skip tour
            </button>
          </div>

          <h3 className="font-display text-2xl font-bold text-white mb-3">
            {step.title}
          </h3>
          <p className="text-sm font-body leading-relaxed text-white/72 mb-6">
            {step.body}
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-body font-semibold text-white/80 transition-all hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-body font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
            >
              {currentStep === definition.steps.length - 1 ? 'Finish Tour' : 'Next'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </DarkShell>
    </div>,
    document.body
  )
}

// ─── HelpCenter ─────────────────────────────────────────────────────────────

const HOW_TO_BUY_STEPS = [
  {
    icon: Search,
    title: 'Browse the catalogue',
    body: 'Go to Shop and use filters (category, weight, price) to narrow down products.',
    href: '/shop',
    cta: 'Shop now',
  },
  {
    icon: ShoppingCart,
    title: 'Add items to your cart',
    body: 'Pick a quantity and tap "Add to Cart". You can keep browsing — your cart saves automatically.',
    href: '/shop',
    cta: null,
  },
  {
    icon: CreditCard,
    title: 'Checkout',
    body: 'Review your cart, confirm your delivery address, and place the order.',
    href: '/cart',
    cta: 'Go to cart',
  },
  {
    icon: MapPin,
    title: 'Track your order',
    body: 'Use Order Tracking to follow your delivery in real time — no account required.',
    href: '/track',
    cta: 'Track order',
  },
  {
    icon: Package,
    title: 'Receive & reorder',
    body: 'Once delivered, your order history lets you reorder the same items in one click.',
    href: '/dashboard',
    cta: null,
  },
]

const TIPS = [
  {
    icon: Star,
    title: 'Bulk orders save more',
    body: 'Larger quantities often qualify for better rates. Check the product page for tiered pricing.',
  },
  {
    icon: Search,
    title: 'Use filters to save time',
    body: 'Filter by grain type, weight, or price range — especially useful when the catalogue is large.',
  },
  {
    icon: Package,
    title: 'Check stock before ordering',
    body: 'Product pages show real-time availability. If something is low-stock it will be marked.',
  },
  {
    icon: MapPin,
    title: 'Track without an account',
    body: 'Got an order number? You can track any delivery from the Track page — no sign-in needed.',
  },
  {
    icon: Lightbulb,
    title: 'Create an account for history',
    body: 'Signed-in customers get full order history, saved addresses, and one-tap reorders.',
  },
  {
    icon: Compass,
    title: 'Replay the guided tour',
    body: 'New to the platform? Head to "Get Started" and hit Replay Tour to walk through key features.',
  },
]

function HelpCenter() {
  const {
    helpCenterOpen,
    openHelpCenter,
    closeHelpCenter,
    currentExperience,
    getChecklist,
    startTour,
  } = useOnboarding()

  const [tab, setTab] = useState('start')

  const items = getChecklist(currentExperience)
  const doneCount = items.filter(item => item.done).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0

  const tabs = [
    { id: 'start', label: 'Get Started' },
    { id: 'buy', label: 'How to Buy' },
    { id: 'tips', label: 'Tips' },
  ]

  return createPortal(
    <>
      <button
        onClick={openHelpCenter}
        className="fixed bottom-5 right-5 z-[110] inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101826] px-4 py-3 text-sm font-body font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#152033]"
      >
        <LifeBuoy size={16} />
        Help
      </button>

      {helpCenterOpen && (
        <div className="fixed inset-0 z-[140] flex justify-end">
          {/* Backdrop */}
          <button
            onClick={closeHelpCenter}
            className="absolute inset-0 bg-[#05070c]/55 backdrop-blur-none sm:backdrop-blur-sm"
          />

          {/* Panel */}
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0f1725] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 pointer-events-none opacity-70">
              <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="absolute bottom-10 left-0 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
            </div>

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <TourBadge>Help Center</TourBadge>
                  <h3 className="font-display text-3xl font-bold text-white mt-4 mb-2">
                    How can we help?
                  </h3>
                  <p className="text-sm font-body leading-relaxed text-white/70">
                    Guides, tips, and your onboarding progress — all in one place.
                  </p>
                </div>
                <button
                  onClick={closeHelpCenter}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 mb-6">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 rounded-xl py-2 text-xs font-body font-semibold transition-all ${
                      tab === t.id
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Get Started tab ── */}
              {tab === 'start' && (
                <>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 mb-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-white/45">
                          Current Experience
                        </p>
                        <p className="font-display text-2xl font-bold capitalize text-white mt-2">
                          {currentExperience}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl font-bold text-white">{progress}%</p>
                        <p className="text-xs font-body text-white/50">progress</p>
                      </div>
                    </div>
                    <button
                      onClick={() => startTour(currentExperience, { force: true })}
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-body font-semibold text-white transition-all hover:bg-brand-600"
                    >
                      <Compass size={15} />
                      Replay Tour
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.done ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-semibold text-white">{item.label}</p>
                            <p className="text-xs font-body text-white/55 mt-1">{item.helper}</p>
                          </div>
                          {!item.done && item.href && (
                            <Link
                              to={item.href}
                              onClick={closeHelpCenter}
                              className="flex-shrink-0 text-xs font-body font-semibold text-brand-300 hover:text-brand-200"
                            >
                              {item.cta || 'Open'}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── How to Buy tab ── */}
              {tab === 'buy' && (
                <div className="space-y-3">
                  {HOW_TO_BUY_STEPS.map((step, i) => {
                    const Icon = step.icon
                    return (
                      <div key={i} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-body font-bold uppercase tracking-widest text-white/30">Step {i + 1}</span>
                            </div>
                            <p className="text-sm font-body font-semibold text-white">{step.title}</p>
                            <p className="text-xs font-body text-white/55 mt-1 leading-relaxed">{step.body}</p>
                          </div>
                          {step.href && step.cta && (
                            <Link
                              to={step.href}
                              onClick={closeHelpCenter}
                              className="flex-shrink-0 text-xs font-body font-semibold text-brand-300 hover:text-brand-200 whitespace-nowrap"
                            >
                              {step.cta}
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Tips tab ── */}
              {tab === 'tips' && (
                <div className="space-y-3">
                  {TIPS.map((tip, i) => {
                    const Icon = tip.icon
                    return (
                      <div key={i} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300">
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-semibold text-white">{tip.title}</p>
                            <p className="text-xs font-body text-white/55 mt-1 leading-relaxed">{tip.body}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}

// ─── MilestoneNudges ────────────────────────────────────────────────────────

function MilestoneNudges() {
  const { nudges, dismissNudge } = useOnboarding()

  if (!nudges.length) return null

  return createPortal(
    <div className="fixed bottom-24 left-4 z-[145] flex w-[min(92vw,360px)] flex-col gap-3">
      {nudges.map(nudge => (
        <DarkShell key={nudge.id}>
          <div className="absolute inset-0 pointer-events-none opacity-70">
            <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-brand-500/15 blur-3xl" />
          </div>

          <div className="relative p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <TourBadge>Milestone</TourBadge>
              <button
                onClick={() => dismissNudge(nudge.id)}
                className="rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <h4 className="font-display text-xl font-bold text-white mb-1.5">
              {nudge.title}
            </h4>
            <p className="text-sm font-body leading-relaxed text-white/72">
              {nudge.body}
            </p>
          </div>
        </DarkShell>
      ))}
    </div>,
    document.body
  )
}

// ─── Root export ────────────────────────────────────────────────────────────

export default function OnboardingLayer() {
  return (
    <>
      <WelcomeModal />
      <TourOverlay />
      <HelpCenter />
      <MilestoneNudges />
    </>
  )
}