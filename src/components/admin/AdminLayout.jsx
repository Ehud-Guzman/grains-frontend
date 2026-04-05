import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Users, LogOut,
  Menu, X, Layers, TrendingUp, UserCog, Shield, Settings2,
  Bell, ChevronRight, GitBranch, Eye, Archive,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import api from '../../services/api'

// ── NAV DEFINITIONS ───────────────────────────────────────────────────────────
// Business staff/admin nav
const BUSINESS_NAV = [
  {
    group: 'Operations',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard',    roles: ['staff','supervisor','admin'] },
      { to: '/admin/orders',    icon: ShoppingCart,    label: 'Orders',        roles: ['staff','supervisor','admin'] },
      { to: '/admin/stock',     icon: Layers,          label: 'Stock',         roles: ['staff','supervisor','admin'] },
    ]
  },
  {
    group: 'Management',
    items: [
      { to: '/admin/products',  icon: Package,         label: 'Products',      roles: ['admin'] },
      { to: '/admin/customers', icon: Users,           label: 'Customers',     roles: ['supervisor','admin'] },
      { to: '/admin/reports',   icon: TrendingUp,      label: 'Reports',       roles: ['supervisor','admin'] },
    ]
  },
  {
    group: 'System',
    items: [
      { to: '/admin/settings',  icon: Settings2,       label: 'Settings',      roles: ['admin'] },
    ]
  },
]

// Superadmin-only nav — platform control
const SUPERADMIN_NAV = [
  {
    group: 'Platform',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Control Center' },
      { to: '/admin/branches',  icon: GitBranch,       label: 'Branches'       },
    ]
  },
  {
    group: 'Observe (View Only)',
    items: [
      { to: '/admin/orders',    icon: ShoppingCart,    label: 'Orders',    viewOnly: true },
      { to: '/admin/products',  icon: Package,         label: 'Products',  viewOnly: true },
      { to: '/admin/stock',     icon: Layers,          label: 'Stock',     viewOnly: true },
      { to: '/admin/customers', icon: Users,           label: 'Customers', viewOnly: true },
      { to: '/admin/reports',   icon: TrendingUp,      label: 'Reports',   viewOnly: true },
    ]
  },
  {
    group: 'System',
    items: [
      { to: '/admin/users',     icon: UserCog,         label: 'User Management' },
      { to: '/admin/logs',      icon: Shield,          label: 'Activity Log'    },
      { to: '/admin/backups',   icon: Archive,         label: 'Backups'         },
      { to: '/admin/settings',  icon: Settings2,       label: 'Settings'        },
    ]
  },
]

// Used by page title map (same for all roles)
const NAV_ITEMS = BUSINESS_NAV

const ROLE_COLORS = {
  superadmin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  admin:      'bg-brand-500/20 text-brand-300 border border-brand-500/30',
  supervisor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  staff:      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
}

// ── GREETING ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── PAGE TITLE MAP ─────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/branches':  'Branch Management',
  '/admin/orders':    'Orders',
  '/admin/stock':     'Stock',
  '/admin/products':  'Products',
  '/admin/customers': 'Customers',
  '/admin/reports':   'Reports',
  '/admin/settings':  'Settings',
  '/admin/logs':      'Activity Log',
  '/admin/users':     'User Management',
  '/admin/backups':   'Backups',
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const shopInfo = useShopInfo()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [pendingCount, setPendingCount]     = useState(0)
  const [lowStockCount, setLowStockCount]   = useState(0)
  const [notifOpen, setNotifOpen]           = useState(false)

  // Current page title
  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'Admin'

  // Fetch pending orders + low stock counts for notification bell
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [ordersRes, stockRes] = await Promise.all([
          api.get('/admin/orders?status=pending&limit=1'),
          api.get('/admin/stock/low'),
        ])
        setPendingCount(ordersRes.data?.pagination?.total || 0)
        setLowStockCount(stockRes.data?.data?.length || 0)
      } catch {}
    }

    // Only fetch for roles that can see orders
    if (['staff','supervisor','admin'].includes(user?.role)) {
      fetchCounts()
      const interval = setInterval(fetchCounts, 60000) // refresh every minute
      return () => clearInterval(interval)
    }
  }, [user?.role])

  const totalAlerts = pendingCount + lowStockCount

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // ── SIDEBAR ────────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0f1a' }}>

      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden
            border border-white/10 shadow-sm">
            <img src="/Vittorios-logo.jpeg" alt="Vittorios"
              className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-admin font-semibold text-sm leading-tight">
              Vittorios
            </p>
            <p className={`text-xs leading-tight font-admin ${
              user?.role === 'superadmin' ? 'text-red-400/70' : 'text-white/40'
            }`}>
              {user?.role === 'superadmin' ? '⚡ Platform Control' : 'Admin Panel'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {(user?.role === 'superadmin' ? SUPERADMIN_NAV : BUSINESS_NAV).map(group => {
          const items = user?.role === 'superadmin'
            ? group.items
            : group.items.filter(i => i.roles?.includes(user?.role))
          if (items.length === 0) return null
          return (
            <div key={group.group}>
              <p className="text-white/25 text-xs font-admin font-semibold uppercase
                tracking-widest px-3 mb-1.5">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavLink key={item.to} to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-admin
                      font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-white/50 hover:text-white hover:bg-white/8'
                      }`
                    }>
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} className={`flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                        }`} />
                        <span className="flex-1">{item.label}</span>
                        {item.to === '/admin/orders' && pendingCount > 0 && !item.viewOnly && (
                          <span className="bg-amber-500 text-white text-xs font-bold
                            min-w-[18px] h-[18px] rounded-full flex items-center justify-center
                            px-1 leading-none">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                        {item.viewOnly && (
                          <Eye size={11} className="text-white/25 flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1
          bg-white/5">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center
            flex-shrink-0 shadow-sm overflow-hidden border border-white/10">
            {user?.avatarURL ? (
              <img src={user.avatarURL} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold font-admin">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-admin font-medium leading-tight truncate">
              {user?.name}
            </p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-admin
              font-medium mt-0.5 capitalize ${ROLE_COLORS[user?.role] || ROLE_COLORS.staff}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-admin
            font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 w-full
            transition-all duration-150 group mt-1">
          <LogOut size={15} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-admin-50 font-admin overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-white/5"
        style={{ backgroundColor: '#0a0f1a' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 z-50 lg:hidden flex flex-col
            border-r border-white/10 shadow-2xl"
            style={{ backgroundColor: '#0a0f1a', animation: 'slideInLeft 0.22s ease-out' }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ──────────────────────────────────────────────── */}
        <header className="bg-white border-b border-admin-100 px-4 lg:px-6
          flex-shrink-0" style={{ minHeight: '60px' }}>

          {/* Mobile topbar — two rows */}
          <div className="lg:hidden">

            {/* Row 1 — hamburger + greeting + bell */}
            <div className="flex items-center gap-3 h-14">
              <button onClick={() => setSidebarOpen(s => !s)}
                className="p-2 rounded-xl hover:bg-admin-100 text-admin-600
                  transition-colors flex-shrink-0">
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Greeting */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-admin-400 font-admin leading-tight">
                  {getGreeting()},
                </p>
            <p className="text-sm font-admin font-bold text-admin-900 leading-tight truncate">
  {user?.name?.split(' ')[0]}
</p>
              </div>

              {/* Notification bell */}
              {['staff','supervisor','admin'].includes(user?.role) && (
                <div className="relative flex-shrink-0">
                  <button onClick={() => setNotifOpen(o => !o)}
                    className="relative p-2 rounded-xl hover:bg-admin-100 text-admin-500
                      hover:text-admin-800 transition-colors">
                    <Bell size={20} />
                    {totalAlerts > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white
                        text-xs font-bold min-w-[17px] h-[17px] rounded-full flex items-center
                        justify-center px-1 leading-none border-2 border-white">
                        {totalAlerts > 9 ? '9+' : totalAlerts}
                      </span>
                    )}
                  </button>

                  {/* Notification dropdown */}
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-30"
                        onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl
                        shadow-xl border border-admin-100 z-40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-admin-100 bg-admin-50">
                          <p className="text-sm font-admin font-bold text-admin-900">
                            Alerts
                          </p>
                        </div>
                        <div className="py-2">
                          {pendingCount > 0 && (
                            <button onClick={() => { navigate('/admin/orders?status=pending'); setNotifOpen(false) }}
                              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-amber-50
                                transition-colors group">
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center
                                justify-center flex-shrink-0">
                                <ShoppingCart size={14} className="text-amber-600" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-admin font-semibold text-admin-800">
                                  {pendingCount} Pending Order{pendingCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-admin-400 font-admin">
                                  Awaiting approval
                                </p>
                              </div>
                              <ChevronRight size={14} className="text-admin-300
                                group-hover:text-admin-600 transition-colors" />
                            </button>
                          )}
                          {lowStockCount > 0 && (
                            <button onClick={() => { navigate('/admin/stock?filter=low'); setNotifOpen(false) }}
                              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50
                                transition-colors group">
                              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center
                                justify-center flex-shrink-0">
                                <Layers size={14} className="text-red-600" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-admin font-semibold text-admin-800">
                                  {lowStockCount} Low Stock Item{lowStockCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-admin-400 font-admin">
                                  Below threshold
                                </p>
                              </div>
                              <ChevronRight size={14} className="text-admin-300
                                group-hover:text-admin-600 transition-colors" />
                            </button>
                          )}
                          {totalAlerts === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-admin-400 font-admin">
                                All clear — no alerts
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Avatar */}
              <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center
                flex-shrink-0 overflow-hidden border-2 border-admin-100">
                {user?.avatarURL ? (
                  <img src={user.avatarURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold font-admin">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2 — page title breadcrumb */}
            <div className="flex items-center gap-1.5 pb-2.5 -mt-1">
              <span className="text-xs text-admin-400 font-admin">Admin</span>
              <ChevronRight size={11} className="text-admin-300" />
              <span className="text-xs font-admin font-semibold text-admin-700">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Desktop topbar — single row */}
          <div className="hidden lg:flex items-center justify-between h-full py-3">
            {/* Left — page title */}
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-brand-500 rounded-full" />
              <div>
                <p className="text-base font-admin font-bold text-admin-900 leading-tight">
                  {pageTitle}
                </p>
                <p className="text-xs text-admin-400 font-admin leading-tight">
                  {shopInfo.name}
                </p>
              </div>
            </div>

            {/* Right — bell + user */}
            <div className="flex items-center gap-2">

              {/* Bell */}
              {['staff','supervisor','admin'].includes(user?.role) && (
                <div className="relative">
                  <button onClick={() => setNotifOpen(o => !o)}
                    className="relative p-2 rounded-xl hover:bg-admin-100 text-admin-400
                      hover:text-admin-700 transition-colors">
                    <Bell size={18} />
                    {totalAlerts > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white
                        text-xs font-bold min-w-[16px] h-[16px] rounded-full flex items-center
                        justify-center px-1 leading-none border-2 border-white">
                        {totalAlerts > 9 ? '9+' : totalAlerts}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl
                        shadow-xl border border-admin-100 z-40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-admin-100 bg-admin-50">
                          <p className="text-sm font-admin font-bold text-admin-900">Alerts</p>
                        </div>
                        <div className="py-2">
                          {pendingCount > 0 && (
                            <button onClick={() => { navigate('/admin/orders?status=pending'); setNotifOpen(false) }}
                              className="flex items-center gap-3 px-4 py-3 w-full
                                hover:bg-amber-50 transition-colors group">
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center
                                justify-center flex-shrink-0">
                                <ShoppingCart size={14} className="text-amber-600" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-admin font-semibold text-admin-800">
                                  {pendingCount} Pending Order{pendingCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-admin-400 font-admin">Awaiting approval</p>
                              </div>
                              <ChevronRight size={14} className="text-admin-300
                                group-hover:text-admin-600 transition-colors" />
                            </button>
                          )}
                          {lowStockCount > 0 && (
                            <button onClick={() => { navigate('/admin/stock?filter=low'); setNotifOpen(false) }}
                              className="flex items-center gap-3 px-4 py-3 w-full
                                hover:bg-red-50 transition-colors group">
                              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center
                                justify-center flex-shrink-0">
                                <Layers size={14} className="text-red-600" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-admin font-semibold text-admin-800">
                                  {lowStockCount} Low Stock Item{lowStockCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-admin-400 font-admin">Below threshold</p>
                              </div>
                              <ChevronRight size={14} className="text-admin-300
                                group-hover:text-admin-600 transition-colors" />
                            </button>
                          )}
                          {totalAlerts === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-admin-400 font-admin">
                                All clear — no alerts
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="w-px h-6 bg-admin-100 mx-1" />

              {/* Greeting + avatar */}
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden md:block">
                  <p className="text-xs text-admin-400 font-admin leading-tight">
                    {getGreeting()}
                  </p>
                  <p className="text-sm font-admin font-semibold text-admin-800 leading-tight">
                    {user?.name?.split(' ')[0]}
                  </p>
                </div>
                <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center
                  justify-center overflow-hidden border-2 border-admin-100 flex-shrink-0">
                  {user?.avatarURL ? (
                    <img src={user.avatarURL} alt={user.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold font-admin">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-admin-50">
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
