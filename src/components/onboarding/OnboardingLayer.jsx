import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, LifeBuoy, CheckCircle2, ShoppingCart, Lightbulb, Package, Search, CreditCard, MapPin, Star, Compass } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'

// ─── HelpCenter ─────────────────────────────────────────────────────────────

const HOW_TO_BUY_STEPS = [
  { icon: Search,      title: 'Browse the catalogue',    body: 'Go to Shop and use filters (category, weight, price) to narrow down products.',                            href: '/shop',      cta: 'Shop now'    },
  { icon: ShoppingCart,title: 'Add items to your cart',  body: 'Pick a quantity and tap "Add to Cart". You can keep browsing — your cart saves automatically.',            href: '/shop',      cta: null          },
  { icon: CreditCard,  title: 'Checkout',                body: 'Review your cart, confirm your delivery address, and place the order.',                                    href: '/cart',      cta: 'Go to cart'  },
  { icon: MapPin,      title: 'Track your order',        body: 'Use Order Tracking to follow your delivery in real time — no account required.',                           href: '/track',     cta: 'Track order' },
  { icon: Package,     title: 'Receive & reorder',       body: 'Once delivered, your order history lets you reorder the same items in one click.',                         href: '/dashboard', cta: null          },
]

const TIPS = [
  { icon: Star,        title: 'Bulk orders save more',         body: 'Larger quantities often qualify for better rates. Check the product page for tiered pricing.'                    },
  { icon: Search,      title: 'Use filters to save time',      body: 'Filter by grain type, weight, or price range — especially useful when the catalogue is large.'                   },
  { icon: Package,     title: 'Check stock before ordering',   body: 'Product pages show real-time availability. If something is low-stock it will be marked.'                         },
  { icon: MapPin,      title: 'Track without an account',      body: 'Got an order number? You can track any delivery from the Track page — no sign-in needed.'                        },
  { icon: Lightbulb,   title: 'Create an account for history', body: 'Signed-in customers get full order history, saved addresses, and one-tap reorders.'                              },
  { icon: Compass,     title: 'Check your progress',           body: 'The "Get Started" tab here tracks which key areas of the app you have already visited.'                          },
]

function HelpCenter() {
  const { helpCenterOpen, openHelpCenter, closeHelpCenter, currentExperience, getChecklist } = useOnboarding()
  const [tab, setTab] = useState('start')

  const items     = getChecklist(currentExperience)
  const doneCount = items.filter(item => item.done).length
  const progress  = items.length ? Math.round((doneCount / items.length) * 100) : 0

  const tabs = [
    { id: 'start', label: 'Get Started' },
    { id: 'buy',   label: 'How to Buy'  },
    { id: 'tips',  label: 'Tips'        },
  ]

  return createPortal(
    <>
      {/* FAB */}
      <button
        onClick={openHelpCenter}
        className="fixed bottom-5 right-5 z-[110] inline-flex items-center gap-2 rounded-full border border-brand-300 bg-white px-4 py-3 text-sm font-body font-semibold text-brand-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:bg-brand-50"
      >
        <LifeBuoy size={16} />
        Help
      </button>

      {helpCenterOpen && (
        <div className="fixed inset-0 z-[140] flex justify-end">
          {/* Backdrop */}
          <button onClick={closeHelpCenter} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Panel */}
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-earth-200 bg-white text-earth-900 shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="relative p-6">

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.2em] text-brand-700">
                    <LifeBuoy size={12} />
                    Help Center
                  </div>
                  <h3 className="font-display text-3xl font-bold text-earth-900 mt-4 mb-2">How can we help?</h3>
                  <p className="text-sm font-body leading-relaxed text-earth-500">
                    Guides, tips, and your onboarding progress — all in one place.
                  </p>
                </div>
                <button
                  onClick={closeHelpCenter}
                  className="rounded-full border border-earth-200 bg-earth-50 p-2 text-earth-400 transition-colors hover:bg-earth-100 hover:text-earth-700"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 rounded-2xl border border-earth-200 bg-earth-50 p-1 mb-6">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 rounded-xl py-2 text-xs font-body font-semibold transition-all ${
                      tab === t.id ? 'bg-brand-700 text-white shadow-sm' : 'text-earth-500 hover:text-earth-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Get Started ── */}
              {tab === 'start' && (
                <>
                  <div className="rounded-[1.5rem] border border-brand-200 bg-brand-50 p-5 mb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-earth-400">Your Progress</p>
                        <p className="font-display text-2xl font-bold capitalize text-earth-900 mt-2">{currentExperience}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl font-bold text-brand-700">{progress}%</p>
                        <p className="text-xs font-body text-earth-400">{doneCount} of {items.length} done</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-brand-100 mt-4 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="rounded-[1.35rem] border border-earth-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.done ? 'bg-green-500 text-white' : 'bg-earth-100 text-earth-400'}`}>
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-semibold text-earth-800">{item.label}</p>
                            <p className="text-xs font-body text-earth-400 mt-1">{item.helper}</p>
                          </div>
                          {!item.done && item.href && (
                            <Link
                              to={item.href}
                              onClick={closeHelpCenter}
                              className="flex-shrink-0 text-xs font-body font-semibold text-brand-600 hover:text-brand-700"
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

              {/* ── How to Buy ── */}
              {tab === 'buy' && (
                <div className="space-y-3">
                  {HOW_TO_BUY_STEPS.map((step, i) => {
                    const Icon = step.icon
                    return (
                      <div key={i} className="rounded-[1.35rem] border border-earth-200 bg-white p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-body font-bold uppercase tracking-widest text-earth-400">Step {i + 1}</span>
                            </div>
                            <p className="text-sm font-body font-semibold text-earth-800">{step.title}</p>
                            <p className="text-xs font-body text-earth-500 mt-1 leading-relaxed">{step.body}</p>
                          </div>
                          {step.href && step.cta && (
                            <Link
                              to={step.href}
                              onClick={closeHelpCenter}
                              className="flex-shrink-0 text-xs font-body font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap"
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

              {/* ── Tips ── */}
              {tab === 'tips' && (
                <div className="space-y-3">
                  {TIPS.map((tip, i) => {
                    const Icon = tip.icon
                    return (
                      <div key={i} className="rounded-[1.35rem] border border-earth-200 bg-white p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-semibold text-earth-800">{tip.title}</p>
                            <p className="text-xs font-body text-earth-500 mt-1 leading-relaxed">{tip.body}</p>
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

// ─── Root export ────────────────────────────────────────────────────────────

export default function OnboardingLayer() {
  return <HelpCenter />
}
