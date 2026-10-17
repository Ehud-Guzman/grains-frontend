import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, Eye, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Modal from '../ui/Modal'
import AlertsBell from './AlertsBell'
import useAdminAlerts from './useAdminAlerts'
import { navGroupsFor, titleForPath, sectionLabelFor } from './adminNav'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SIDEBAR_BG = '#0F172A'
const COLLAPSE_KEY = 'admin.sidebarCollapsed'

const ROLE_COLORS = {
  superadmin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  admin:      'bg-brand-500/20 text-brand-300 border border-brand-500/30',
  supervisor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  staff:      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Browser storage can be unavailable (private windows, blocked site data) — the sidebar
// must still work, just without remembering its width.
const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}
const writeCollapsed = (value) => {
  try { localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0') } catch { /* not remembered */ }
}

// Which count (if any) an item carries, and in what colour.
const badgeFor = (item, alerts) => {
  if (item.badge === 'pending') return { count: alerts.pending, tone: 'amber' }
  if (item.badge === 'lowStock') return { count: alerts.lowStock, tone: 'red' }
  if (item.badge === 'attention') {
    return { count: alerts.attention.urgent + alerts.attention.soon, tone: alerts.attention.urgent > 0 ? 'red' : 'amber' }
  }
  return { count: 0, tone: 'amber' }
}

function Avatar({ user, size = 'w-8 h-8', ring = 'border-2 border-admin-100' }) {
  return (
    <div className={`${size} bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0
      overflow-hidden ${ring}`}>
      {user?.avatarURL ? (
        <img src={user.avatarURL} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white text-xs font-bold font-admin">{user?.name?.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

// ── NAV ITEM ──────────────────────────────────────────────────────────────────
function NavItem({ item, alerts, collapsed, onNavigate }) {
  const { count, tone } = badgeFor(item, alerts)
  const showBadge = count > 0 && !item.viewOnly
  const badgeCls = tone === 'red' ? 'bg-red-500' : 'bg-amber-500'
  const text = count > 99 ? '99+' : count

  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `relative flex items-center rounded-xl text-sm font-admin font-medium transition-all duration-150 group
        min-h-[44px] ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${
          isActive
            ? 'bg-white/[.11] text-white ring-1 ring-inset ring-white/[.08]'
            : 'text-slate-400 hover:text-white hover:bg-white/[.07]'
        }`
      }>
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-brand-400" />}
          <span className="relative flex-shrink-0">
            <item.icon size={17} className={`transition-colors ${isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
            {showBadge && collapsed && (
              <span aria-hidden="true" className={`absolute -top-1.5 -right-2 ${badgeCls} text-white text-[9px] font-bold
                min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 leading-none`}>
                {text}
              </span>
            )}
          </span>
          {collapsed ? (
            <span className="sr-only">{item.label}{showBadge ? `, ${count} need attention` : ''}</span>
          ) : (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {showBadge && (
                <span className={`${badgeCls} text-white text-xs font-bold min-w-[20px] h-5 rounded-full
                  flex items-center justify-center px-1.5 leading-none`}>
                  <span aria-hidden="true">{text}</span>
                  <span className="sr-only">{count} need attention</span>
                </span>
              )}
              {item.viewOnly && <Eye size={11} aria-label="View only" className="text-white/25 flex-shrink-0" />}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
// Declared at module level, not inside AdminLayout: a component defined inside another
// gets a new identity on every render, so React remounted the whole sidebar (and reset its
// scroll position) each time the alert counts refreshed.
function Sidebar({ user, branch, groups, alerts, collapsed, onNavigate, onLogout, onToggleCollapsed }) {
  const isSuper = user?.role === 'superadmin'
  const subtitle = isSuper ? 'Platform Control' : (branch?.name || 'Admin Panel')

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: SIDEBAR_BG }}>
      {/* Logo */}
      <div className={`py-4 border-b border-slate-700/70 flex-shrink-0 ${collapsed ? 'px-3' : 'px-5'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700/80 shadow-sm">
            <img src="/Vittorios-logo.jpeg" alt="Vittorios" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-admin font-semibold text-sm leading-tight">Vittorios</p>
              <p className={`text-xs leading-tight font-admin truncate ${isSuper ? 'text-red-400/70' : 'text-white/40'}`}>
                {subtitle}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Admin" className={`flex-1 py-3 overflow-y-auto ${collapsed ? 'px-2 space-y-3' : 'px-3 space-y-4'}`}>
        {groups.map(group => (
          <div key={group.group}>
            {collapsed ? (
              <div aria-hidden="true" className="mx-3 mb-2 border-t border-slate-700/60 first:hidden" />
            ) : (
              <p className="text-slate-500 text-[10px] font-admin font-semibold uppercase tracking-widest px-3 mb-1.5">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} item={item} alerts={alerts} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + controls */}
      <div className={`pb-4 pt-3 border-t border-slate-700/70 flex-shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        {onToggleCollapsed && (
          <button type="button" onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex items-center rounded-xl text-sm font-admin font-medium text-slate-500
              hover:text-white hover:bg-white/[.07] w-full min-h-[40px] mb-2 transition-colors
              ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        )}

        <div className={`flex items-center rounded-xl mb-1 bg-slate-800/60 ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}
          title={collapsed ? `${user?.name} (${user?.role})` : undefined}>
          <Avatar user={user} ring="border border-white/10" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-admin font-medium leading-tight truncate">{user?.name}</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-admin font-medium mt-0.5 capitalize
                ${ROLE_COLORS[user?.role] || ROLE_COLORS.staff}`}>
                {user?.role}
              </span>
            </div>
          )}
        </div>

        <button type="button" onClick={onLogout} title={collapsed ? 'Sign out' : undefined}
          className={`flex items-center rounded-xl text-sm font-admin font-medium text-slate-500 hover:text-red-400
            hover:bg-red-500/10 w-full min-h-[44px] transition-all duration-150 group mt-1
            ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
          <LogOut size={16} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
          {collapsed ? <span className="sr-only">Sign out</span> : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}

// ── LAYOUT ────────────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, logout, currentBranch } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const alerts = useAdminAlerts(user?.role)

  const groups = navGroupsFor(user)
  const pageTitle = titleForPath(location.pathname)

  // <main> is the scroll container, so the window-level scroll reset never reaches it:
  // opening a page from halfway down another used to land you halfway down the new one.
  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleCollapsed = () => {
    writeCollapsed(!collapsed)
    setCollapsed(!collapsed)
  }

  const sidebarProps = { user, branch: currentBranch, groups, alerts, onLogout: handleLogout }

  return (
    <div className="flex h-screen bg-admin-50 font-admin overflow-hidden">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 border-r border-white/5 transition-[width] duration-200
        ${collapsed ? 'w-[4.5rem]' : 'w-60'}`} style={{ backgroundColor: SIDEBAR_BG }}>
        <Sidebar {...sidebarProps} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer — the shared Modal gives it a focus trap, Escape, scroll lock and
          focus restore; choosing a page closes it. */}
      {drawerOpen && (
        <Modal onClose={() => setDrawerOpen(false)} label="Navigation menu" placement="left"
          backdropClassName="bg-black/80 backdrop-blur-sm lg:hidden"
          panelClassName="w-64 max-w-[85vw] border-r border-white/10 shadow-2xl pt-safe pb-safe pl-safe">
          <div className="flex-1 min-h-0 relative" style={{ backgroundColor: SIDEBAR_BG, animation: 'slideInLeft 0.22s ease-out' }}>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu"
              className="absolute top-3 right-3 z-10 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                rounded-xl text-slate-400 hover:text-white hover:bg-white/10">
              <X size={18} />
            </button>
            <Sidebar {...sidebarProps} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </Modal>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-admin-100 px-3 sm:px-4 lg:px-6 flex-shrink-0 flex items-center gap-2 sm:gap-3 h-14 lg:h-16">
          <button type="button" onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu" aria-haspopup="dialog"
            className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center
              rounded-xl hover:bg-admin-100 text-admin-600 transition-colors flex-shrink-0">
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-1 h-8 bg-brand-600 rounded-full flex-shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <p className="text-[11px] text-admin-400 font-admin leading-tight truncate">
                {sectionLabelFor(user)}
                {user?.role !== 'superadmin' && currentBranch?.name ? ` · ${currentBranch.name}` : ''}
              </p>
              <p className="text-base font-admin font-bold text-admin-900 leading-tight truncate">{pageTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <AlertsBell role={user?.role} alerts={alerts} />
            <div className="w-px h-6 bg-admin-100 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden md:block">
                <p className="text-xs text-admin-400 font-admin leading-tight">{getGreeting()}</p>
                <p className="text-sm font-admin font-semibold text-admin-800 leading-tight">{user?.name?.split(' ')[0]}</p>
              </div>
              <Avatar user={user} />
            </div>
          </div>
        </header>

        <main id="main" ref={mainRef} className="flex-1 overflow-y-auto bg-brand-50 pb-20 sm:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
