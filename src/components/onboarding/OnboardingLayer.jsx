import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Compass, Sparkles, ArrowRight, X, LifeBuoy, CheckCircle2 } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'

function useTargetRect(targetId, enabled) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!enabled || !targetId) return

    const update = () => {
      const element = document.querySelector(`[data-tour="${targetId}"]`)
      if (!element) {
        setRect(null)
        return
      }

      const bounds = element.getBoundingClientRect()
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    const interval = window.setInterval(update, 250)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.clearInterval(interval)
    }
  }, [targetId, enabled])

  return rect
}

function WelcomeModal() {
  const { welcomeTour, tours, startTour, dismissWelcome } = useOnboarding()

  if (!welcomeTour) return null

  const config = tours[welcomeTour]?.welcome
  if (!config) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-[#05070c]/58 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#101826] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative p-8 sm:p-10">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-1.5 text-xs font-body font-semibold uppercase tracking-[0.22em] text-brand-200">
              <Sparkles size={13} />
              {config.eyebrow}
            </div>
            <button
              onClick={() => dismissWelcome(welcomeTour)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-w-lg">
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-white mb-4">
              {config.title}
            </h2>
            <p className="text-sm sm:text-base font-body leading-relaxed text-white/70 mb-8">
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
      </div>
    </div>,
    document.body
  )
}

function TourOverlay() {
  const { activeTour, currentStep, tours, nextStep, prevStep, skipTour } = useOnboarding()
  const definition = activeTour ? tours[activeTour] : null
  const step = definition?.steps?.[currentStep]
  const rect = useTargetRect(step?.target, !!step)

  useEffect(() => {
    if (!step?.target) return

    let attempts = 0
    const maxAttempts = 12

    const ensureVisible = () => {
      const element = document.querySelector(`[data-tour="${step.target}"]`)
      if (!element) {
        attempts += 1
        if (attempts < maxAttempts) {
          window.setTimeout(ensureVisible, 160)
        }
        return
      }

      const bounds = element.getBoundingClientRect()
      const margin = 96
      const isAboveViewport = bounds.top < margin
      const isBelowViewport = bounds.bottom > window.innerHeight - margin

      if (isAboveViewport || isBelowViewport) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }
    }

    const timer = window.setTimeout(ensureVisible, 120)
    return () => window.clearTimeout(timer)
  }, [step?.target, activeTour, currentStep])

  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const tooltipWidth = 360
    const margin = 24
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = rect.top + rect.height + 20
    let left = rect.left

    if (left + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - tooltipWidth - margin
    }
    if (left < margin) left = margin

    if (top > viewportHeight - 240) {
      top = Math.max(margin, rect.top - 220)
    }

    return { top, left, transform: 'none' }
  }, [rect])

  if (!step) return null

  return createPortal(
    <div className="fixed inset-0 z-[130] pointer-events-none">
      <div className="absolute inset-0 bg-[#05070c]/48 backdrop-blur-[1.5px]" />

      {rect && (
        <div
          className="absolute rounded-[1.4rem] border border-brand-300/60 bg-white/5 shadow-[0_0_0_9999px_rgba(5,7,12,0.08)] transition-all duration-300"
          style={{
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 0 0 9999px rgba(5,7,12,0.18)',
          }}
        />
      )}

      <div
        className="absolute w-[min(92vw,360px)] rounded-[1.75rem] border border-white/10 bg-[#101826] text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.2em] text-brand-200">
              <Compass size={12} />
              Step {currentStep + 1} of {definition.steps.length}
            </div>
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
      </div>
    </div>,
    document.body
  )
}

function HelpCenter() {
  const {
    helpCenterOpen,
    openHelpCenter,
    closeHelpCenter,
    currentExperience,
    getChecklist,
    startTour,
  } = useOnboarding()

  const items = getChecklist(currentExperience)
  const doneCount = items.filter(item => item.done).length

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
          <button
            onClick={closeHelpCenter}
            className="absolute inset-0 bg-[#05070c]/55 backdrop-blur-sm"
          />

          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0f1725] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 pointer-events-none opacity-70">
              <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="absolute bottom-10 left-0 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
            </div>

            <div className="relative p-6">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-brand-200">
                    <Sparkles size={12} />
                    Help Center
                  </div>
                  <h3 className="font-display text-3xl font-bold text-white mt-4 mb-2">
                    Replay tours and keep moving
                  </h3>
                  <p className="text-sm font-body leading-relaxed text-white/70">
                    Your onboarding progress is saved for signed-in users, so you can pick back up from any device.
                  </p>
                </div>

                <button
                  onClick={closeHelpCenter}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

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
                    <p className="font-display text-3xl font-bold text-white">
                      {items.length ? Math.round((doneCount / items.length) * 100) : 0}%
                    </p>
                    <p className="text-xs font-body text-white/50">
                      progress
                    </p>
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
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.done ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold text-white">
                          {item.label}
                        </p>
                        <p className="text-xs font-body text-white/55 mt-1">
                          {item.helper}
                        </p>
                      </div>
                      {!item.done && item.href && (
                        <Link
                          to={item.href}
                          onClick={closeHelpCenter}
                          className="text-xs font-body font-semibold text-brand-300 hover:text-brand-200"
                        >
                          {item.cta || 'Open'}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}

function MilestoneNudges() {
  const { nudges, dismissNudge } = useOnboarding()

  if (!nudges.length) return null

  return createPortal(
    <div className="fixed bottom-24 left-4 z-[145] flex w-[min(92vw,360px)] flex-col gap-3">
      {nudges.map(nudge => (
        <div
          key={nudge.id}
          className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101826] text-white shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-70">
            <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-brand-500/15 blur-3xl" />
          </div>

          <div className="relative p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-brand-200">
                <Sparkles size={12} />
                Milestone
              </div>
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
        </div>
      ))}
    </div>,
    document.body
  )
}

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
