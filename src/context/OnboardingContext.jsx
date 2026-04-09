import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { authService } from '../services/auth.service'

const OnboardingContext = createContext(null)

const STORAGE_KEYS = {
  public: 'onboarding_public_v1_done',
  customer: 'onboarding_customer_v1_done',
  admin: 'onboarding_admin_v1_done',
  superadmin: 'onboarding_superadmin_v1_done',
  checklist: {
    customer: 'onboarding_customer_checklist_v1',
    admin: 'onboarding_admin_checklist_v1',
    superadmin: 'onboarding_superadmin_checklist_v1',
  },
  tips: 'onboarding_contextual_tips_v1',
  milestones: 'onboarding_guest_milestones_v1',
}

const CHECKLIST_DEFINITIONS = {
  public: [
    {
      id: 'home',
      label: 'Explore the home page',
      helper: 'Start with featured categories and quick shop actions.',
      href: '/',
      cta: 'Home',
    },
    {
      id: 'shop',
      label: 'Browse the catalogue',
      helper: 'Search, filter, and compare products before ordering.',
      href: '/shop',
      cta: 'Shop',
    },
    {
      id: 'track',
      label: 'Try order tracking',
      helper: 'Returning customers can follow an order in seconds.',
      href: '/track',
      cta: 'Track',
    },
    {
      id: 'signin',
      label: 'Create an account',
      helper: 'Signing in makes repeat orders and profile management easier.',
      href: '/register',
      cta: 'Register',
    },
  ],
  customer: [
    {
      id: 'dashboard',
      label: 'Open your dashboard',
      helper: 'Use it as your home base for orders and quick actions.',
      href: '/dashboard',
      cta: 'Dashboard',
    },
    {
      id: 'browse',
      label: 'Browse the catalogue',
      helper: 'Explore products and compare options before ordering.',
      href: '/shop',
      cta: 'Shop',
    },
    {
      id: 'first_order',
      label: 'Place your first order',
      helper: 'Finish checkout once to unlock your full order history.',
      href: '/cart',
      cta: 'Checkout',
    },
    {
      id: 'track',
      label: 'Visit order tracking',
      helper: 'You can follow progress without opening every order.',
      href: '/track',
      cta: 'Track',
    },
    {
      id: 'profile',
      label: 'Review your profile',
      helper: 'Keep your details ready for smoother repeat orders.',
      href: '/profile',
      cta: 'Profile',
    },
  ],
  admin: [
    {
      id: 'dashboard',
      label: 'Review the dashboard',
      helper: 'Start with the live numbers and recent activity.',
      href: '/admin/dashboard',
      cta: 'Open',
    },
    {
      id: 'orders',
      label: 'Open the orders queue',
      helper: 'Handle pending approvals and urgent work first.',
      href: '/admin/orders?status=pending',
      cta: 'Orders',
    },
    {
      id: 'stock',
      label: 'Check low stock',
      helper: 'Catch shortages before they slow fulfillment.',
      href: '/admin/stock',
      cta: 'Stock',
    },
    {
      id: 'reports',
      label: 'Visit reports',
      helper: 'Use sales and stock trends to guide decisions.',
      href: '/admin/reports',
      cta: 'Reports',
    },
    {
      id: 'settings',
      label: 'Review settings',
      helper: 'Confirm operational rules like delivery and payments.',
      href: '/admin/settings',
      cta: 'Settings',
    },
  ],
  superadmin: [
    {
      id: 'dashboard',
      label: 'Review the platform dashboard',
      helper: 'System-wide stats, branches, and live audit trail.',
      href: '/admin/dashboard',
      cta: 'Open',
    },
    {
      id: 'branches',
      label: 'Open branch management',
      helper: 'Create branches, assign staff, and configure each location.',
      href: '/admin/branches',
      cta: 'Branches',
    },
    {
      id: 'users',
      label: 'Review user accounts',
      helper: 'Manage staff roles, permissions, and passwords across branches.',
      href: '/admin/users',
      cta: 'Users',
    },
    {
      id: 'logs',
      label: 'Check the activity log',
      helper: 'Full audit trail of every action across all branches.',
      href: '/admin/logs',
      cta: 'Logs',
    },
  ],
}

const TOUR_DEFINITIONS = {
  public: {
    route: '/',
    welcome: {
      eyebrow: 'First Visit',
      title: 'A quick tour of the shop',
      body: 'We will show you how to browse products, search the catalogue, track an order, and sign in when you are ready.',
      cta: 'Start Tour',
    },
    steps: [
      {
        route: '/',
        target: 'public-home-hero',
        title: 'This is your storefront',
        body: 'Start here for featured products, categories, and a quick sense of what is available right now.',
      },
      {
        route: '/',
        target: 'public-shop-cta',
        title: 'Jump straight into shopping',
        body: 'Use this action to open the full catalogue and start exploring products by type, price, or stock.',
      },
      {
        route: '/shop',
        target: 'public-shop-search',
        title: 'Search and filter with speed',
        body: 'Use the search bar, filters, and layout controls to narrow the catalogue quickly and find what you need.',
      },
      {
        route: '/shop',
        target: 'public-track-link',
        title: 'Tracking stays easy',
        body: 'The track page helps returning customers follow an order without digging through messages or receipts.',
      },
      {
        route: '/shop',
        target: 'public-signin-link',
        title: 'Sign in when you are ready',
        body: 'Create an account or sign in later to manage orders, profile details, and future checkouts more easily.',
      },
    ],
  },
  customer: {
    route: '/dashboard',
    welcome: {
      eyebrow: 'Welcome Aboard',
      title: 'A quick tour of your customer space',
      body: 'We will show you where to place orders, track deliveries, and manage your profile so your first visit feels effortless.',
      cta: 'Start Tour',
    },
    steps: [
      {
        target: 'customer-hero',
        title: 'Your dashboard starts here',
        body: 'This top section gives you a quick snapshot of your account and how many orders you have placed.',
      },
      {
        target: 'customer-orders-area',
        title: 'Your order activity appears here',
        body: 'This section becomes your command post for active orders, history, and quick next actions.',
      },
      {
        target: 'customer-browse-link',
        title: 'Browse products anytime',
        body: 'Use this shortcut to jump back into the shop and place another order whenever you need stock.',
      },
      {
        target: 'customer-track-link',
        title: 'Track with confidence',
        body: 'This opens your tracking flow so you can follow order progress without digging through the app.',
      },
      {
        target: 'customer-profile-link',
        title: 'Your profile stays close',
        body: 'Update your details, addresses, and account info from here whenever something changes.',
      },
    ],
  },
  admin: {
    route: '/admin/dashboard',
    welcome: {
      eyebrow: 'Control Center',
      title: 'A quick tour of your admin workspace',
      body: 'We will walk through the places your team will use most often so new staff can get productive quickly.',
      cta: 'Start Tour',
    },
    steps: [
      {
        target: 'admin-dashboard-header',
        title: 'This is your operations hub',
        body: 'The dashboard keeps the most important business signals in one place so you can decide what needs attention first.',
      },
      {
        target: 'admin-kpis',
        title: 'Watch the live numbers',
        body: 'These KPI cards surface orders, pending work, revenue, and low-stock pressure at a glance.',
      },
      {
        target: 'admin-recent-orders',
        title: 'Recent orders are one click away',
        body: 'Use this panel to open fresh orders quickly and keep the team moving without hunting through the full list.',
      },
      {
        target: 'admin-low-stock',
        title: 'Low stock gets surfaced early',
        body: 'This panel helps you catch product shortages before they disrupt approvals, packing, or delivery.',
      },
    ],
  },
  superadmin: {
    route: '/admin/dashboard',
    welcome: {
      eyebrow: 'Superadmin',
      title: 'Platform Control Center',
      body: 'We will walk you through the system-wide dashboard — platform stats, branch management, system controls, and the audit log.',
      cta: 'Start Tour',
    },
    steps: [
      {
        target: 'superadmin-header',
        title: 'Platform Control Center',
        body: 'This is your system-wide command post. Every branch, staff account, and transaction across the platform flows through here.',
      },
      {
        target: 'superadmin-platform-stats',
        title: 'Platform-wide stats',
        body: 'Active branches, staff headcount, all-time orders, and system revenue — all updated live every 60 seconds.',
      },
      {
        target: 'superadmin-branches',
        title: 'Branch overview',
        body: 'See all branches at a glance. Check active status, default branch, and jump directly into management.',
      },
      {
        target: 'superadmin-system-controls',
        title: 'System controls',
        body: 'Quick access to branch setup, user accounts, the full audit log, backups, and global settings — the tools only you can reach.',
      },
      {
        target: 'superadmin-activity',
        title: 'System-wide activity log',
        body: 'Every action across all branches is captured here. Use it to audit behaviour, investigate issues, and stay in control.',
      },
    ],
  },
}

const DEFAULT_NUDGE_BODY = 'You just unlocked another part of the onboarding journey.'

const MILESTONE_CONFIG = {
  'public:home': {
    title: 'Welcome to the storefront',
    body: 'You have started the public onboarding flow. The help center stays available if you want a guided replay later.',
  },
  'customer:dashboard': {
    title: 'Dashboard unlocked',
    body: 'Your dashboard is now part of your saved onboarding progress, even if you switch devices.',
  },
  'customer:first_order': {
    title: 'First order milestone reached',
    body: 'Nice work. Returning customers usually track the order next or update profile details for faster repeat checkout.',
  },
  'customer-profile-complete': {
    title: 'Profile looks ready',
    body: 'Saved profile details make repeat orders much smoother.',
  },
  'admin:dashboard': {
    title: 'Admin workspace activated',
    body: 'The dashboard visit has been saved as a completed onboarding step for this account.',
  },
  'admin:orders': {
    title: 'Orders queue discovered',
    body: 'This is the fastest place to build confidence with approvals, triage, and customer follow-up.',
  },
  'admin-first-approval': {
    title: 'First approval completed',
    body: 'That first approval milestone is now saved. Your help center can guide the rest of the operations flow whenever needed.',
  },
  'superadmin:dashboard': {
    title: 'Platform dashboard activated',
    body: 'Your system-wide view is now part of your onboarding progress.',
  },
  'superadmin:branches': {
    title: 'Branch management discovered',
    body: 'From here you can create branches, assign staff, and configure each location independently.',
  },
  'superadmin:users': {
    title: 'User accounts reviewed',
    body: 'Staff roles and permissions across all branches are managed from the users page.',
  },
  'superadmin:logs': {
    title: 'Audit log checked',
    body: 'The activity log is your source of truth for everything happening across the platform.',
  },
}

function readStoredMap(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function readStoredBoolean(key) {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function roleToTourName(user) {
  if (!user) return 'public'
  if (user.role === 'customer') return 'customer'
  if (user.role === 'superadmin') return 'superadmin'
  return 'admin'
}

function onboardingPayload({
  role,
  checklistProgress,
  dismissedTips,
  toursCompleted,
  milestones,
  helpCenterOpenedCount,
}) {
  const roleChecklist = role === 'customer'
    ? checklistProgress.customer
    : role === 'superadmin'
    ? checklistProgress.superadmin
    : checklistProgress.admin

  return {
    checklistProgress: roleChecklist || {},
    dismissedTips: Object.keys(dismissedTips || {}).filter(key => dismissedTips[key]),
    toursCompleted: Object.keys(toursCompleted || {}).filter(key => toursCompleted[key] && key !== 'public'),
    milestones,
    helpCenterOpenedCount,
  }
}

export function OnboardingProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [activeTour, setActiveTour] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [welcomeTour, setWelcomeTour] = useState(null)
  const [checklistProgress, setChecklistProgress] = useState(() => ({
    customer: readStoredMap(STORAGE_KEYS.checklist.customer),
    admin: readStoredMap(STORAGE_KEYS.checklist.admin),
    superadmin: readStoredMap(STORAGE_KEYS.checklist.superadmin),
  }))
  const [dismissedTips, setDismissedTips] = useState(() => readStoredMap(STORAGE_KEYS.tips))
  const [toursCompleted, setToursCompleted] = useState(() => ({
    public: readStoredBoolean(STORAGE_KEYS.public),
    customer: readStoredBoolean(STORAGE_KEYS.customer),
    admin: readStoredBoolean(STORAGE_KEYS.admin),
    superadmin: readStoredBoolean(STORAGE_KEYS.superadmin),
  }))
  const [milestones, setMilestones] = useState(() => {
    const stored = readStoredMap(STORAGE_KEYS.milestones)
    return Array.isArray(stored.items) ? stored.items : []
  })
  const [helpCenterOpen, setHelpCenterOpen] = useState(false)
  const [helpCenterOpenedCount, setHelpCenterOpenedCount] = useState(0)
  const [nudgeQueue, setNudgeQueue] = useState([])
  const [remoteReady, setRemoteReady] = useState(false)

  const syncTimeoutRef = useRef(null)
  const lastSyncedPayloadRef = useRef('')
  const hasAnnouncedMilestonesRef = useRef(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.checklist.customer,   JSON.stringify(checklistProgress.customer   || {}))
    localStorage.setItem(STORAGE_KEYS.checklist.admin,      JSON.stringify(checklistProgress.admin      || {}))
    localStorage.setItem(STORAGE_KEYS.checklist.superadmin, JSON.stringify(checklistProgress.superadmin || {}))
  }, [checklistProgress])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tips, JSON.stringify(dismissedTips))
  }, [dismissedTips])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.public,      toursCompleted.public      ? 'true' : 'false')
    localStorage.setItem(STORAGE_KEYS.customer,    toursCompleted.customer    ? 'true' : 'false')
    localStorage.setItem(STORAGE_KEYS.admin,       toursCompleted.admin       ? 'true' : 'false')
    localStorage.setItem(STORAGE_KEYS.superadmin,  toursCompleted.superadmin  ? 'true' : 'false')
  }, [toursCompleted])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.milestones, JSON.stringify({ items: milestones }))
  }, [milestones])

  useEffect(() => {
    if (!isAuthenticated || !user?.role) {
      setRemoteReady(true)
      hasAnnouncedMilestonesRef.current = true
      return
    }

    let cancelled = false
    setRemoteReady(false)

    authService.getOnboarding()
      .then(res => {
        if (cancelled) return
        const data = res.data.data?.onboarding || {}
        const role = roleToTourName(user)
        const checklistForRole = data.checklistProgress || {}
        const nextChecklist = {
          customer:   role === 'customer'   ? checklistForRole : {},
          admin:      role === 'admin'      ? checklistForRole : {},
          superadmin: role === 'superadmin' ? checklistForRole : {},
        }

        setChecklistProgress(current => ({
          customer:   role === 'customer'   ? nextChecklist.customer   : current.customer,
          admin:      role === 'admin'      ? nextChecklist.admin      : current.admin,
          superadmin: role === 'superadmin' ? nextChecklist.superadmin : current.superadmin,
        }))
        setDismissedTips((data.dismissedTips || []).reduce((acc, tipId) => {
          acc[tipId] = true
          return acc
        }, {}))
        setToursCompleted(current => ({
          ...current,
          customer:   role === 'customer'   ? (data.toursCompleted || []).includes('customer')   : current.customer,
          admin:      role === 'admin'      ? (data.toursCompleted || []).includes('admin')      : current.admin,
          superadmin: role === 'superadmin' ? (data.toursCompleted || []).includes('superadmin') : current.superadmin,
        }))
        setMilestones(data.milestones || [])
        setHelpCenterOpenedCount(data.helpCenterOpenedCount || 0)

        lastSyncedPayloadRef.current = JSON.stringify(onboardingPayload({
          role,
          checklistProgress: {
            customer:   role === 'customer'   ? nextChecklist.customer   : {},
            admin:      role === 'admin'      ? nextChecklist.admin      : {},
            superadmin: role === 'superadmin' ? nextChecklist.superadmin : {},
          },
          dismissedTips: (data.dismissedTips || []).reduce((acc, tipId) => {
            acc[tipId] = true
            return acc
          }, {}),
          toursCompleted: {
            customer:   (data.toursCompleted || []).includes('customer'),
            admin:      (data.toursCompleted || []).includes('admin'),
            superadmin: (data.toursCompleted || []).includes('superadmin'),
          },
          milestones: data.milestones || [],
          helpCenterOpenedCount: data.helpCenterOpenedCount || 0,
        }))
        hasAnnouncedMilestonesRef.current = true
        setRemoteReady(true)
      })
      .catch(() => {
        if (cancelled) return
        hasAnnouncedMilestonesRef.current = true
        setRemoteReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, user?.role])

  useEffect(() => {
    if (!isAuthenticated || !user?.role || !remoteReady) return

    const payload = onboardingPayload({
      role: roleToTourName(user),
      checklistProgress,
      dismissedTips,
      toursCompleted,
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
  }, [
    isAuthenticated,
    user?.role,
    remoteReady,
    checklistProgress,
    dismissedTips,
    toursCompleted,
    milestones,
    helpCenterOpenedCount,
  ])

  const enqueueNudge = useCallback((id, title, body = DEFAULT_NUDGE_BODY) => {
    setNudgeQueue(current => {
      if (current.some(item => item.id === id)) return current
      return [...current, { id, title, body }]
    })
  }, [])

  const markMilestone = useCallback((milestoneId, config) => {
    if (!milestoneId) return false

    let created = false
    setMilestones(current => {
      if (current.includes(milestoneId)) return current
      created = true
      return [...current, milestoneId]
    })

    if (created && hasAnnouncedMilestonesRef.current) {
      const preset = config || MILESTONE_CONFIG[milestoneId] || {}
      enqueueNudge(
        milestoneId,
        preset.title || 'Milestone reached',
        preset.body || DEFAULT_NUDGE_BODY
      )
    }

    return created
  }, [enqueueNudge])

  const isTourDone = useCallback((tourName) => {
    return Boolean(toursCompleted[tourName])
  }, [toursCompleted])

  const markTourDone = useCallback((tourName, done = true) => {
    if (!tourName) return
    setToursCompleted(current => ({
      ...current,
      [tourName]: done,
    }))
  }, [])

  useEffect(() => {
    const tourName = !isAuthenticated ? 'public' : roleToTourName(user)
    const definition = TOUR_DEFINITIONS[tourName]
    if (!definition) return
    if (!remoteReady) return
    if (isTourDone(tourName)) return
    if (location.pathname !== definition.route) return
    if (welcomeTour || activeTour) return

    setWelcomeTour(tourName)
  }, [isAuthenticated, user, location.pathname, welcomeTour, activeTour, remoteReady, isTourDone])

  useEffect(() => {
    if (!activeTour) return
    const definition = TOUR_DEFINITIONS[activeTour]
    if (!definition) return
    const allowedRoutes = [...new Set([
      definition.route,
      ...(definition.steps || []).map(step => step.route || definition.route),
    ])]
    if (!allowedRoutes.includes(location.pathname)) {
      setActiveTour(null)
      setCurrentStep(0)
    }
  }, [activeTour, location.pathname])

  const markChecklistItem = useCallback((tourName, itemId) => {
    if (!tourName || !itemId) return false

    let changed = false
    setChecklistProgress(current => {
      const tourState = current[tourName] || {}
      if (tourState[itemId]) return current
      changed = true
      return {
        ...current,
        [tourName]: {
          ...tourState,
          [itemId]: true,
        },
      }
    })

    if (changed) {
      markMilestone(`${tourName}:${itemId}`)
    }

    return changed
  }, [markMilestone])

  useEffect(() => {
    if (!remoteReady) return

    if (!isAuthenticated) {
      if (location.pathname === '/') markChecklistItem('public', 'home')
      if (location.pathname === '/shop') markChecklistItem('public', 'shop')
      if (location.pathname === '/track') markChecklistItem('public', 'track')
      if (location.pathname === '/login' || location.pathname === '/register') markChecklistItem('public', 'signin')
      return
    }

    if (user?.role === 'customer') {
      if (location.pathname === '/dashboard') markChecklistItem('customer', 'dashboard')
      if (location.pathname === '/shop') markChecklistItem('customer', 'browse')
      if (location.pathname === '/track') markChecklistItem('customer', 'track')
      if (location.pathname === '/profile') markChecklistItem('customer', 'profile')
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
    if (location.pathname === '/admin/orders') markChecklistItem('admin', 'orders')
    if (location.pathname === '/admin/stock') markChecklistItem('admin', 'stock')
    if (location.pathname === '/admin/reports') markChecklistItem('admin', 'reports')
    if (location.pathname === '/admin/settings') markChecklistItem('admin', 'settings')
  }, [isAuthenticated, user?.role, location.pathname, remoteReady, markChecklistItem])

  const startTour = useCallback((tourName, options = {}) => {
    const definition = TOUR_DEFINITIONS[tourName]
    if (!definition) return
    const firstRoute = definition.steps?.[0]?.route || definition.route

    if (options.force) {
      markTourDone(tourName, false)
    }

    if (location.pathname !== firstRoute) {
      navigate(firstRoute)
    }

    setWelcomeTour(null)
    setCurrentStep(0)
    setActiveTour(tourName)
  }, [location.pathname, navigate, markTourDone])

  const finishTour = useCallback(() => {
    if (activeTour) {
      markTourDone(activeTour, true)
      markMilestone(`${activeTour}-tour-finished`, {
        title: 'Tour completed',
        body: 'That guided tour is now saved. You can replay it anytime from the help center.',
      })
    }
    setActiveTour(null)
    setCurrentStep(0)
    setWelcomeTour(null)
  }, [activeTour, markTourDone, markMilestone])

  const skipTour = useCallback(() => finishTour(), [finishTour])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    const definition = TOUR_DEFINITIONS[activeTour]
    if (currentStep >= definition.steps.length - 1) {
      finishTour()
      return
    }
    const nextIndex = currentStep + 1
    const nextRoute = definition.steps?.[nextIndex]?.route || definition.route
    setCurrentStep(nextIndex)
    if (nextRoute && location.pathname !== nextRoute) {
      navigate(nextRoute)
    }
  }, [activeTour, currentStep, finishTour, location.pathname, navigate])

  const prevStep = useCallback(() => {
    setCurrentStep(step => Math.max(0, step - 1))
  }, [])

  const dismissWelcome = useCallback((tourName) => {
    markTourDone(tourName, true)
    setWelcomeTour(null)
  }, [markTourDone])

  const dismissTip = useCallback((tipId) => {
    if (!tipId) return
    setDismissedTips(current => {
      if (current[tipId]) return current
      return {
        ...current,
        [tipId]: true,
      }
    })
  }, [])

  const getChecklist = useCallback((tourName) => {
    return (CHECKLIST_DEFINITIONS[tourName] || []).map(item => ({
      ...item,
      done: Boolean(checklistProgress[tourName]?.[item.id]),
    }))
  }, [checklistProgress])

  const openHelpCenter = useCallback(() => {
    setHelpCenterOpen(true)
    setHelpCenterOpenedCount(count => count + 1)
  }, [])

  const closeHelpCenter = useCallback(() => {
    setHelpCenterOpen(false)
  }, [])

  const dismissNudge = useCallback((id) => {
    setNudgeQueue(current => current.filter(item => item.id !== id))
  }, [])

  const currentExperience = !isAuthenticated ? 'public' : roleToTourName(user)

  const value = useMemo(() => ({
    activeTour,
    currentStep,
    welcomeTour,
    helpCenterOpen,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    dismissWelcome,
    dismissTip,
    dismissedTips,
    markChecklistItem,
    getChecklist,
    checklistDefinitions: CHECKLIST_DEFINITIONS,
    markMilestone,
    milestones,
    nudges: nudgeQueue,
    dismissNudge,
    openHelpCenter,
    closeHelpCenter,
    helpCenterOpenedCount,
    currentExperience,
    tours: TOUR_DEFINITIONS,
  }), [
    activeTour,
    currentStep,
    welcomeTour,
    helpCenterOpen,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    dismissWelcome,
    dismissTip,
    dismissedTips,
    markChecklistItem,
    getChecklist,
    markMilestone,
    milestones,
    nudgeQueue,
    dismissNudge,
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
