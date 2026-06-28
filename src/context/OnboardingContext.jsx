import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { authService } from '../services/auth.service'

const OnboardingContext = createContext(null)

const STORAGE_KEYS = {
  checklist: {
    customer:   'onboarding_customer_checklist_v1',
    admin:      'onboarding_admin_checklist_v1',
    superadmin: 'onboarding_superadmin_checklist_v1',
  },
  tips:       'onboarding_contextual_tips_v1',
  milestones: 'onboarding_guest_milestones_v1',
}

const CHECKLIST_DEFINITIONS = {
  public: [
    { id: 'home',   label: 'Explore the home page',   helper: 'Start with featured categories and quick shop actions.',              href: '/',         cta: 'Home'     },
    { id: 'shop',   label: 'Browse the catalogue',    helper: 'Search, filter, and compare products before ordering.',               href: '/shop',     cta: 'Shop'     },
    { id: 'track',  label: 'Try order tracking',      helper: 'Returning customers can follow an order in seconds.',                  href: '/track',    cta: 'Track'    },
    { id: 'signin', label: 'Create an account',       helper: 'Signing in makes repeat orders and profile management easier.',        href: '/register', cta: 'Register' },
  ],
  customer: [
    { id: 'dashboard',   label: 'Open your dashboard',      helper: 'Use it as your home base for orders and quick actions.',               href: '/dashboard', cta: 'Dashboard' },
    { id: 'browse',      label: 'Browse the catalogue',     helper: 'Explore products and compare options before ordering.',                href: '/shop',      cta: 'Shop'      },
    { id: 'first_order', label: 'Place your first order',   helper: 'Finish checkout once to unlock your full order history.',              href: '/cart',      cta: 'Checkout'  },
    { id: 'track',       label: 'Visit order tracking',     helper: 'You can follow progress without opening every order.',                 href: '/track',     cta: 'Track'     },
    { id: 'profile',     label: 'Review your profile',      helper: 'Keep your details ready for smoother repeat orders.',                  href: '/profile',   cta: 'Profile'   },
  ],
  admin: [
    { id: 'dashboard', label: 'Review the dashboard',    helper: 'Start with the live numbers and recent activity.',             href: '/admin/dashboard',        cta: 'Open'     },
    { id: 'orders',    label: 'Open the orders queue',   helper: 'Handle pending approvals and urgent work first.',              href: '/admin/orders?status=pending', cta: 'Orders' },
    { id: 'stock',     label: 'Check low stock',         helper: 'Catch shortages before they slow fulfillment.',               href: '/admin/stock',            cta: 'Stock'    },
    { id: 'reports',   label: 'Visit reports',           helper: 'Use sales and stock trends to guide decisions.',              href: '/admin/reports',          cta: 'Reports'  },
    { id: 'settings',  label: 'Review settings',         helper: 'Confirm operational rules like delivery and payments.',       href: '/admin/settings',         cta: 'Settings' },
  ],
  superadmin: [
    { id: 'dashboard', label: 'Review the platform dashboard', helper: 'System-wide stats, branches, and live audit trail.',                           href: '/admin/dashboard', cta: 'Open'     },
    { id: 'branches',  label: 'Open branch management',        helper: 'Create branches, assign staff, and configure each location.',                  href: '/admin/branches',  cta: 'Branches' },
    { id: 'users',     label: 'Review user accounts',          helper: 'Manage staff roles, permissions, and passwords across branches.',               href: '/admin/users',     cta: 'Users'    },
    { id: 'logs',      label: 'Check the activity log',        helper: 'Full audit trail of every action across all branches.',                        href: '/admin/logs',      cta: 'Logs'     },
  ],
}

function readStoredMap(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function roleToExperience(user) {
  if (!user) return 'public'
  if (user.role === 'customer')   return 'customer'
  if (user.role === 'superadmin') return 'superadmin'
  return 'admin'
}

function onboardingPayload({ role, checklistProgress, dismissedTips, milestones, helpCenterOpenedCount }) {
  const roleChecklist = role === 'customer'
    ? checklistProgress.customer
    : role === 'superadmin'
    ? checklistProgress.superadmin
    : checklistProgress.admin

  return {
    checklistProgress:   roleChecklist || {},
    dismissedTips:       Object.keys(dismissedTips || {}).filter(k => dismissedTips[k]),
    milestones,
    helpCenterOpenedCount,
  }
}

export function OnboardingProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const [checklistProgress, setChecklistProgress] = useState(() => ({
    customer:   readStoredMap(STORAGE_KEYS.checklist.customer),
    admin:      readStoredMap(STORAGE_KEYS.checklist.admin),
    superadmin: readStoredMap(STORAGE_KEYS.checklist.superadmin),
  }))
  const [dismissedTips, setDismissedTips] = useState(() => readStoredMap(STORAGE_KEYS.tips))
  const [milestones, setMilestones] = useState(() => {
    const stored = readStoredMap(STORAGE_KEYS.milestones)
    return Array.isArray(stored.items) ? stored.items : []
  })
  const [helpCenterOpen, setHelpCenterOpen]         = useState(false)
  const [helpCenterOpenedCount, setHelpCenterOpenedCount] = useState(0)
  const [remoteReady, setRemoteReady]               = useState(false)

  const syncTimeoutRef          = useRef(null)
  const lastSyncedPayloadRef    = useRef('')

  // ── Persist to localStorage ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.checklist.customer,   JSON.stringify(checklistProgress.customer   || {}))
    localStorage.setItem(STORAGE_KEYS.checklist.admin,      JSON.stringify(checklistProgress.admin      || {}))
    localStorage.setItem(STORAGE_KEYS.checklist.superadmin, JSON.stringify(checklistProgress.superadmin || {}))
  }, [checklistProgress])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tips, JSON.stringify(dismissedTips))
  }, [dismissedTips])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.milestones, JSON.stringify({ items: milestones }))
  }, [milestones])

  // ── Remote load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.role) {
      setRemoteReady(true)
      return
    }

    let cancelled = false
    setRemoteReady(false)

    authService.getOnboarding()
      .then(res => {
        if (cancelled) return
        const data = res.data.data?.onboarding || {}
        const role = roleToExperience(user)
        const checklistForRole = data.checklistProgress || {}

        setChecklistProgress(current => ({
          customer:   role === 'customer'   ? checklistForRole : current.customer,
          admin:      role === 'admin'      ? checklistForRole : current.admin,
          superadmin: role === 'superadmin' ? checklistForRole : current.superadmin,
        }))
        setDismissedTips((data.dismissedTips || []).reduce((acc, id) => { acc[id] = true; return acc }, {}))
        setMilestones(data.milestones || [])
        setHelpCenterOpenedCount(data.helpCenterOpenedCount || 0)

        lastSyncedPayloadRef.current = JSON.stringify(onboardingPayload({
          role,
          checklistProgress: {
            customer:   role === 'customer'   ? checklistForRole : {},
            admin:      role === 'admin'      ? checklistForRole : {},
            superadmin: role === 'superadmin' ? checklistForRole : {},
          },
          dismissedTips: (data.dismissedTips || []).reduce((acc, id) => { acc[id] = true; return acc }, {}),
          milestones:    data.milestones || [],
          helpCenterOpenedCount: data.helpCenterOpenedCount || 0,
        }))
        setRemoteReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setRemoteReady(true)
      })

    return () => { cancelled = true }
  }, [isAuthenticated, user?.id, user?.role])

  // ── Remote sync (debounced) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.role || !remoteReady) return

    const payload = onboardingPayload({
      role: roleToExperience(user),
      checklistProgress,
      dismissedTips,
      milestones,
      helpCenterOpenedCount,
    })
    const payloadString = JSON.stringify(payload)
    if (payloadString === lastSyncedPayloadRef.current) return

    window.clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = window.setTimeout(async () => {
      try {
        await authService.updateOnboarding(payload)
        lastSyncedPayloadRef.current = payloadString
      } catch {}
    }, 450)

    return () => window.clearTimeout(syncTimeoutRef.current)
  }, [isAuthenticated, user?.role, remoteReady, checklistProgress, dismissedTips, milestones, helpCenterOpenedCount])

  // ── Milestone tracking (no popup — just records the ID) ─────────────────
  const markMilestone = useCallback((milestoneId) => {
    if (!milestoneId) return false
    let created = false
    setMilestones(current => {
      if (current.includes(milestoneId)) return current
      created = true
      return [...current, milestoneId]
    })
    return created
  }, [])

  // ── Checklist ────────────────────────────────────────────────────────────
  const markChecklistItem = useCallback((tourName, itemId) => {
    if (!tourName || !itemId) return false
    let changed = false
    setChecklistProgress(current => {
      const tourState = current[tourName] || {}
      if (tourState[itemId]) return current
      changed = true
      return { ...current, [tourName]: { ...tourState, [itemId]: true } }
    })
    if (changed) markMilestone(`${tourName}:${itemId}`)
    return changed
  }, [markMilestone])

  // Mark checklist items automatically based on the current route
  useEffect(() => {
    if (!remoteReady) return

    if (!isAuthenticated) {
      if (location.pathname === '/')         markChecklistItem('public', 'home')
      if (location.pathname === '/shop')     markChecklistItem('public', 'shop')
      if (location.pathname === '/track')    markChecklistItem('public', 'track')
      if (location.pathname === '/login' || location.pathname === '/register') markChecklistItem('public', 'signin')
      return
    }

    if (user?.role === 'customer') {
      if (location.pathname === '/dashboard') markChecklistItem('customer', 'dashboard')
      if (location.pathname === '/shop')      markChecklistItem('customer', 'browse')
      if (location.pathname === '/track')     markChecklistItem('customer', 'track')
      if (location.pathname === '/profile')   markChecklistItem('customer', 'profile')
      return
    }

    if (user?.role === 'superadmin') {
      if (location.pathname === '/admin/dashboard') markChecklistItem('superadmin', 'dashboard')
      if (location.pathname === '/admin/branches')  markChecklistItem('superadmin', 'branches')
      if (location.pathname === '/admin/users')     markChecklistItem('superadmin', 'users')
      if (location.pathname === '/admin/logs')      markChecklistItem('superadmin', 'logs')
      return
    }

    if (location.pathname === '/admin/dashboard') markChecklistItem('admin', 'dashboard')
    if (location.pathname === '/admin/orders')    markChecklistItem('admin', 'orders')
    if (location.pathname === '/admin/stock')     markChecklistItem('admin', 'stock')
    if (location.pathname === '/admin/reports')   markChecklistItem('admin', 'reports')
    if (location.pathname === '/admin/settings')  markChecklistItem('admin', 'settings')
  }, [isAuthenticated, user?.role, location.pathname, remoteReady, markChecklistItem])

  const getChecklist = useCallback((tourName) => {
    return (CHECKLIST_DEFINITIONS[tourName] || []).map(item => ({
      ...item,
      done: Boolean(checklistProgress[tourName]?.[item.id]),
    }))
  }, [checklistProgress])

  const dismissTip = useCallback((tipId) => {
    if (!tipId) return
    setDismissedTips(current => {
      if (current[tipId]) return current
      return { ...current, [tipId]: true }
    })
  }, [])

  const openHelpCenter = useCallback(() => {
    setHelpCenterOpen(true)
    setHelpCenterOpenedCount(c => c + 1)
  }, [])

  const closeHelpCenter = useCallback(() => setHelpCenterOpen(false), [])

  const currentExperience = roleToExperience(user && isAuthenticated ? user : null)

  const value = useMemo(() => ({
    helpCenterOpen,
    dismissedTips,
    markChecklistItem,
    getChecklist,
    checklistDefinitions: CHECKLIST_DEFINITIONS,
    markMilestone,
    milestones,
    openHelpCenter,
    closeHelpCenter,
    helpCenterOpenedCount,
    currentExperience,
  }), [
    helpCenterOpen,
    dismissedTips,
    markChecklistItem,
    getChecklist,
    markMilestone,
    milestones,
    openHelpCenter,
    closeHelpCenter,
    helpCenterOpenedCount,
    currentExperience,
  ])

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}
