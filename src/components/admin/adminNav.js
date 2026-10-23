import {
  LayoutDashboard, ShoppingCart, Package, Users, Layers, TrendingUp, UserCog, Shield,
  Settings2, GitBranch, Archive, Truck, ClipboardList, Tag, Megaphone, FileCheck,
  AlertTriangle, Send, Gauge,
} from 'lucide-react'

// One source of truth for the admin navigation: what each role sees, the page title for a
// URL, and which roles get the alerts bell. Plain data + pure functions so the sidebar,
// the topbar and the tests all agree.
//
// Business roles (staff, supervisor, admin) see items whose `roles` include theirs, or
// that they hold `permission` for. Superadmin is an oversight role: it gets its own menu,
// with the business pages listed as view-only (the API refuses its writes on them).

export const BUSINESS_NAV = [
  {
    group: 'Operations',
    items: [
      { to: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard', roles: ['staff', 'supervisor', 'admin'] },
      { to: '/admin/orders',       icon: ShoppingCart,    label: 'Orders',    roles: ['staff', 'supervisor', 'admin'], badge: 'pending' },
      { to: '/admin/stock',        icon: Layers,          label: 'Stock',     roles: ['staff', 'supervisor', 'admin'], end: true, badge: 'lowStock' },
      { to: '/admin/stock/intake', icon: ClipboardList,   label: 'Intake',    roles: ['supervisor', 'admin'] },
      { to: '/admin/alerts',       icon: AlertTriangle,   label: 'Alerts',    roles: ['supervisor', 'admin'] },
    ],
  },
  {
    group: 'Management',
    items: [
      { to: '/admin/products',   icon: Package,    label: 'Products',   roles: ['admin'] },
      { to: '/admin/drivers',    icon: Truck,      label: 'Drivers',    roles: ['supervisor', 'admin'] },
      { to: '/admin/customers',  icon: Users,      label: 'Customers',  roles: ['supervisor', 'admin'] },
      { to: '/admin/reports',    icon: TrendingUp, label: 'Reports',    roles: ['supervisor', 'admin'] },
    ],
  },
  {
    group: 'Marketing',
    items: [
      { to: '/admin/coupons',    icon: Tag,        label: 'Coupons',    roles: ['supervisor', 'admin'] },
      { to: '/admin/promotions', icon: Megaphone,  label: 'Promotions', roles: ['admin'] },
      { to: '/admin/broadcast',  icon: Send,       label: 'Broadcast',  roles: ['admin'] },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/admin/settings', icon: Settings2, label: 'Settings',  roles: ['admin'] },
      { to: '/admin/etims',    icon: FileCheck, label: 'KRA eTIMS', permission: 'manage_etims' },
    ],
  },
]

export const SUPERADMIN_NAV = [
  {
    group: 'Platform',
    items: [
      { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/control-center', icon: Gauge,           label: 'Control Center', badge: 'attention' },
      { to: '/admin/branches',       icon: GitBranch,       label: 'Branches' },
    ],
  },
  {
    group: 'Observe (View Only)',
    items: [
      { to: '/admin/orders',       icon: ShoppingCart,  label: 'Orders',    viewOnly: true },
      { to: '/admin/products',     icon: Package,       label: 'Products',  viewOnly: true },
      { to: '/admin/stock',        icon: Layers,        label: 'Stock',     viewOnly: true, end: true },
      { to: '/admin/stock/intake', icon: ClipboardList, label: 'Intake',    viewOnly: true },
      { to: '/admin/customers',    icon: Users,         label: 'Customers', viewOnly: true },
      { to: '/admin/reports',      icon: TrendingUp,    label: 'Reports',   viewOnly: true },
      { to: '/admin/alerts',       icon: AlertTriangle, label: 'Alerts',    viewOnly: true },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/admin/users',    icon: UserCog,   label: 'User Management' },
      { to: '/admin/logs',     icon: Shield,    label: 'Activity Log' },
      { to: '/admin/backups',  icon: Archive,   label: 'Backups' },
      { to: '/admin/etims',    icon: FileCheck, label: 'KRA eTIMS' },
      { to: '/admin/settings', icon: Settings2, label: 'Settings' },
    ],
  },
]

// The groups (with empty ones dropped) this user should see.
export const navGroupsFor = (user) => {
  if (user?.role === 'superadmin') return SUPERADMIN_NAV
  return BUSINESS_NAV
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.roles?.includes(user?.role) ||
        (item.permission && user?.customPermissions?.includes(item.permission))
      ),
    }))
    .filter(group => group.items.length > 0)
}

// Pages that are not menu items but still deserve a real title in the topbar.
const EXTRA_TITLES = {
  '/admin/products/new': 'New Product',
  '/admin/orders/': 'Order Details',
}

// The title for a URL: the longest matching nav path wins, so /admin/stock/intake is
// "Intake" rather than "Stock". Falls back to "Admin" for anything unknown.
export const titleForPath = (pathname = '') => {
  for (const [prefix, title] of Object.entries(EXTRA_TITLES)) {
    if (pathname.startsWith(prefix)) return title
  }
  const all = [...BUSINESS_NAV, ...SUPERADMIN_NAV].flatMap(g => g.items)
  let best = null
  for (const item of all) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      if (!best || item.to.length > best.to.length) best = item
    }
  }
  if (best) return best.label
  return 'Admin'
}

// Roles with a business order queue to watch (the bell's pending-orders row).
export const SEES_ORDER_QUEUE = ['staff', 'supervisor', 'admin']
// Roles allowed to read stock levels (/admin/stock/low is supervisor+).
export const SEES_STOCK_LEVELS = ['supervisor', 'admin']
// Roles allowed to read dashboard KPIs and reports (/admin/reports/kpis is supervisor+).
export const SEES_KPIS = ['supervisor', 'admin']

// Compact breadcrumb root shown above the page title on phones.
export const sectionLabelFor = (user) => (user?.role === 'superadmin' ? 'Platform' : 'Admin')

// "Good morning" / "Good afternoon" / "Good evening" for the topbar and the dashboard header.
export const getGreeting = (date = new Date()) => {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
