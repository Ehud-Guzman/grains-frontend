import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, Eye, ChevronsLeft, ChevronsRight, HelpCircle, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Modal from '../ui/Modal'
import AlertsBell from './AlertsBell'
import useAdminAlerts from './useAdminAlerts'
import { navGroupsFor, titleForPath, sectionLabelFor, getGreeting } from './adminNav'
import { safeStorage } from '../../utils/safeStorage'
import ThemeSwitch from './ThemeSwitch'
import { useApplyAdminTheme } from './adminTheme'
// Dark-mode styles ship with the admin chunk only; they do nothing until `html.dark` is set.
import '../../styles/admin-dark.css'
import '../../styles/admin-dark.generated.css'

// Loaded on first open: most sessions never ask for help, so it stays out of the admin bundle.
const AssistantPanel = lazy(() => import('./AssistantPanel'))
const CommandPalette = lazy(() => import('./CommandPalette'))

// The shortcut hint follows the platform: ⌘K on a Mac, Ctrl K elsewhere.
const SHORTCUT_HINT = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || '') ? '⌘K' : 'Ctrl K'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// Sidebar surface = tailwind `shell-950`; kept as a literal because the drawer paints it inline.
const SIDEBAR_BG = '#0E2218'
const COLLAPSE_KEY = 'admin.sidebarCollapsed'

const ROLE_COLORS = {
  superadmin: 'bg-rose-400/15 text-rose-200 border border-rose-300/25',
  admin:      'bg-brand-400/15 text-brand-200 border border-brand-300/25',
  supervisor: 'bg-violet-400/15 text-violet-200 border border-violet-300/25',
  staff:      'bg-sky-400/15 text-sky-200 border border-sky-300/25',
}

// Browser storage can be unavailable (private windows, blocked site data) — the sidebar
// must still work, just without remembering its width.
const readCollapsed = () => safeStorage.get(COLLAPSE_KEY) === '1'
const writeCollapsed = (value) => { safeStorage.set(COLLAPSE_KEY, value ? '1' : '0') }

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
    <div className={`${size} bg-shell-600 rounded-full flex items-center justify-center flex-shrink-0
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
        `relative flex items-center rounded-lg text-[13.5px] font-admin font-medium transition-colors duration-150 group
        min-h-[42px] ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${
          isActive
            ? 'bg-shell-700/70 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]'
            : 'text-shell-200/70 hover:text-white hover:bg-white/[.06]'
        }`
      }>
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute -left-2 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-400" />}
          <span className="relative flex-shrink-0">
            <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.9} className={`transition-colors ${isActive ? 'text-brand-300' : 'text-shell-300/70 group-hover:text-shell-100'}`} />
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
              {item.viewOnly && <Eye size={12} aria-label="View only" className="text-shell-300/50 flex-shrink-0" />}
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
      {/* Brand */}
      <div className={`h-16 flex items-center border-b border-white/[.07] flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'}`}>
        <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-white/15 shadow-sm">
          <img src="/Vittorios-logo-96.jpeg" width="96" height="96" alt="Vittorios" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="min-w-0 pr-8 lg:pr-0">
            <p className="text-white font-admin font-semibold text-[15px] leading-tight tracking-tight">Vittorios</p>
            <p className="flex items-center gap-1.5 text-[11px] leading-tight font-admin truncate mt-0.5 text-shell-200/70">
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSuper ? 'bg-rose-300' : 'bg-emerald-400'}`} />
              <span className="truncate">{subtitle}</span>
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Admin"
        className={`flex-1 py-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.14)_transparent]
          ${collapsed ? 'px-2 space-y-3' : 'px-3 space-y-5'}`}>
        {groups.map(group => (
          <div key={group.group}>
            {collapsed ? (
              <div aria-hidden="true" className="mx-3 mb-2 border-t border-white/[.07] first:hidden" />
            ) : (
              <p className="text-shell-300/60 text-[10.5px] font-admin font-semibold uppercase tracking-[.14em] px-3 mb-1.5">
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
      <div className={`pb-3 pt-3 border-t border-white/[.07] flex-shrink-0 space-y-1.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className={`flex items-center rounded-xl bg-white/[.05] ring-1 ring-inset ring-white/[.06]
          ${collapsed ? 'justify-center p-2' : 'gap-2.5 pl-2.5 pr-1.5 py-2'}`}
          title={collapsed ? `${user?.name} (${user?.role})` : undefined}>
          <Avatar user={user} ring="border border-white/15" />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-admin font-medium leading-tight truncate">{user?.name}</p>
                <span className={`inline-block text-[10.5px] px-1.5 py-px rounded-full font-admin font-medium mt-1 capitalize
                  ${ROLE_COLORS[user?.role] || ROLE_COLORS.staff}`}>
                  {user?.role}
                </span>
              </div>
              <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out"
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-shell-300/70
                  hover:text-rose-300 hover:bg-rose-400/10 transition-colors flex-shrink-0">
                <LogOut size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out"
            className="flex items-center justify-center rounded-lg text-shell-300/70 hover:text-rose-300 hover:bg-rose-400/10
              w-full min-h-[40px] transition-colors">
            <LogOut size={16} aria-hidden="true" />
          </button>
        )}

        {/* Expanded desktop: theme and collapse share one row, which buys back a row of nav height on short
            screens. Collapsed: they stack in the narrow rail. The drawer has no collapse, so the theme switch
            keeps its words there. */}
        <div className={collapsed ? 'space-y-1.5' : 'flex items-center gap-1.5'}>
          <ThemeSwitch collapsed={collapsed} compact={Boolean(onToggleCollapsed)} />
          {onToggleCollapsed && (
            <button type="button" onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`hidden lg:flex items-center justify-center rounded-lg text-shell-300/60
                hover:text-white hover:bg-white/[.06] min-h-[36px] transition-colors
                ${collapsed ? 'w-full' : 'w-9 flex-shrink-0'}`}>
              {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            </button>
          )}
        </div>
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
  const [helpOpen, setHelpOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const alerts = useAdminAlerts(user?.role)
  useApplyAdminTheme()

  const groups = navGroupsFor(user)
  const pageTitle = titleForPath(location.pathname)

  // <main> is the scroll container, so the window-level scroll reset never reaches it:
  // opening a page from halfway down another used to land you halfway down the new one.
  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0)
  }, [location.pathname])

  // Ctrl/⌘ + K opens the jump-to palette from anywhere in the panel.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(open => !open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
    <div className="flex h-screen bg-canvas font-admin overflow-hidden">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 border-r border-black/20 transition-[width] duration-200
        ${collapsed ? 'w-[4.5rem]' : 'w-60'}`} style={{ backgroundColor: SIDEBAR_BG }}>
        <Sidebar {...sidebarProps} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer — the shared Modal gives it a focus trap, Escape, scroll lock and
          focus restore; choosing a page closes it. */}
      {drawerOpen && (
        <Modal onClose={() => setDrawerOpen(false)} label="Navigation menu" placement="left"
          backdropClassName="bg-shell-950/70 backdrop-blur-sm lg:hidden"
          panelClassName="w-64 max-w-[85vw] border-r border-white/10 shadow-2xl pt-safe pb-safe pl-safe">
          <div className="flex-1 min-h-0 relative" style={{ backgroundColor: SIDEBAR_BG, animation: 'slideInLeft 0.22s ease-out' }}>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu"
              className="absolute top-3 right-3 z-10 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                rounded-xl text-shell-200/70 hover:text-white hover:bg-white/10">
              <X size={18} />
            </button>
            <Sidebar {...sidebarProps} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </Modal>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-admin-200/70 px-3 sm:px-4 lg:px-6 flex-shrink-0 flex items-center gap-2 sm:gap-3 h-14 lg:h-16">
          <button type="button" onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu" aria-haspopup="dialog"
            className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center
              rounded-xl hover:bg-admin-100 text-admin-600 transition-colors flex-shrink-0">
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0">
              <p className="text-[11px] text-admin-500 font-admin font-medium leading-tight truncate">
                {sectionLabelFor(user)}
                {user?.role !== 'superadmin' && currentBranch?.name ? ` · ${currentBranch.name}` : ''}
              </p>
              <p className="text-base font-admin font-bold text-admin-900 leading-tight truncate">{pageTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* One button: an icon on phones, a search-field look with the shortcut from md up. */}
            <button type="button" onClick={() => setSearchOpen(true)}
              aria-label="Search pages and orders" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K"
              className="flex items-center justify-center gap-2 p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-admin-500
                hover:bg-admin-100 hover:text-admin-800 transition-colors
                md:h-10 md:min-h-0 md:min-w-0 md:pl-3 md:pr-2 md:mr-1 md:py-0 md:border md:border-admin-200 md:bg-admin-50
                md:hover:bg-surface md:hover:border-admin-300 text-sm font-admin">
              <Search size={19} className="md:w-[15px] md:h-[15px]" aria-hidden="true" />
              <span aria-hidden="true" className="hidden md:inline pr-6">Search…</span>
              <kbd aria-hidden="true" className="hidden md:inline text-[11px] font-medium border border-admin-200 bg-white rounded-md px-1.5 py-0.5">{SHORTCUT_HINT}</kbd>
            </button>
            <button type="button" onClick={() => setHelpOpen(true)}
              aria-label="Ask the help assistant" aria-haspopup="dialog"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl
                hover:bg-admin-100 text-admin-500 hover:text-admin-800 transition-colors">
              <HelpCircle size={19} />
            </button>
            <AlertsBell role={user?.role} alerts={alerts} />
            <div className="w-px h-6 bg-admin-100 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden md:block">
                <p className="text-xs text-admin-500 font-admin leading-tight">{getGreeting()}</p>
                <p className="text-sm font-admin font-semibold text-admin-800 leading-tight">{user?.name?.split(' ')[0]}</p>
              </div>
              <Avatar user={user} />
            </div>
          </div>
        </header>

        <main id="main" ref={mainRef} className="flex-1 overflow-y-auto bg-canvas pb-20 sm:pb-0">
          <Outlet />
        </main>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette user={user} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}

      {helpOpen && (
        <Suspense fallback={null}>
          <AssistantPanel userRole={user?.role} onClose={() => setHelpOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
