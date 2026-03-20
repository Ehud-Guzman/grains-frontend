import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, LogOut, Menu, X,
  Layers, TrendingUp, UserCog, Shield, Settings2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { SHOP_INFO } from '../../utils/constants'

const NAV_ITEMS = [
  {
    group: 'Operations',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard',   roles: ['staff','supervisor','admin','superadmin'] },
      { to: '/admin/orders',    icon: ShoppingCart,    label: 'Orders',       roles: ['staff','supervisor','admin','superadmin'] },
      { to: '/admin/stock',     icon: Layers,          label: 'Stock',        roles: ['staff','supervisor','admin','superadmin'] },
    ]
  },
  {
    group: 'Management',
    items: [
      { to: '/admin/products',  icon: Package,         label: 'Products',     roles: ['admin','superadmin'] },
      { to: '/admin/customers', icon: Users,           label: 'Customers',    roles: ['supervisor','admin','superadmin'] },
      { to: '/admin/reports',   icon: TrendingUp,      label: 'Reports',      roles: ['supervisor','admin','superadmin'] },
    ]
  },
  {
    group: 'System',
    items: [
      { to: '/admin/settings',  icon: Settings2,       label: 'Settings',     roles: ['admin','superadmin'] },
      { to: '/admin/logs',      icon: Shield,          label: 'Activity Log', roles: ['superadmin'] },
      { to: '/admin/users',     icon: UserCog,         label: 'User Mgmt',    roles: ['superadmin'] },
    ]
  },
]

const ROLE_COLORS = {
  superadmin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  admin:      'bg-brand-500/20 text-brand-300 border border-brand-500/30',
  supervisor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  staff:      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-admin-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden border border-admin-700 shadow-sm">
            <img
              src="/Vittorios-logo.jpeg"
              alt="Vittorios"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-black font-admin font-semibold text-sm leading-tight tracking-wide">
              Vittorios
            </p>
            <p className="text-admin-500 text-xs leading-tight">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {NAV_ITEMS.map(group => {
          const visible = group.items.filter(i => i.roles.includes(user?.role))
          if (visible.length === 0) return null
          return (
            <div key={group.group}>
              <p className="text-admin-600 text-xs font-admin font-semibold uppercase tracking-widest px-3 mb-1.5">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {visible.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-admin font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-sm shadow-brand-900/40'
                          : 'text-admin-400 hover:text-orange-500 hover:bg-admin-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={16}
                          className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-admin-500 group-hover:text-admin-300'}`}
                        />
                        <span>{item.label}</span>
                        {/* SA badge for superadmin-only items */}
                        {item.roles.length === 1 && item.roles[0] === 'superadmin' && (
                          <span className="ml-auto text-xs bg-admin-800 text-admin-500 px-1.5 py-0.5 rounded font-normal">
                            SA
                          </span>
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

      {/* ── User + Logout ─────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-admin-800/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold font-admin">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-black text-sm font-admin font-medium leading-tight truncate">{user?.name}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-admin font-medium mt-0.5 capitalize ${ROLE_COLORS[user?.role] || ROLE_COLORS.staff}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-admin font-medium
            text-admin-500 hover:text-red-400 hover:bg-admin-800 w-full transition-all duration-150 group"
        >
          <LogOut size={16} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-admin-50 font-admin overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-admin-950 flex-shrink-0 border-r border-admin-800/40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-60 bg-admin-950 z-50 lg:hidden flex flex-col border-r border-admin-800/40">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-admin-100 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="lg:hidden p-2 rounded-lg hover:bg-admin-100 text-admin-600 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Shop name (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-1 h-4 bg-brand-500 rounded-full" />
            <p className="text-admin-500 text-sm font-admin">{SHOP_INFO.name}</p>
          </div>

          {/* Right — user info */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-admin-100">
              <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold font-admin">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-admin font-medium text-admin-800 leading-tight">
                  {user?.name?.split(' ')[0]}
                </p>
                <p className="text-xs font-admin text-admin-400 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-admin-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}