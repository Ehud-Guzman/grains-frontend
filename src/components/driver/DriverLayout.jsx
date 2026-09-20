import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Truck, List, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'

const NAV = [
  { to: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/driver/orders',    icon: List,            label: 'My Orders'  },
]

export default function DriverLayout() {
  const { user, logout } = useAuth()
  const shopInfo = useShopInfo()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-admin-50 flex flex-col">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Top bar — pt-safe/px-safe keep it clear of the notch and rounded
          corners in landscape, since index.html opts into viewport-fit=cover. */}
      <header className="bg-brand-800 text-white px-4 py-3 pt-safe px-safe flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Truck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-admin font-bold leading-tight">{shopInfo?.name || 'Driver Portal'}</p>
            <p className="text-xs text-white/60 leading-tight">Delivery Dashboard</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-admin font-medium transition-colors
                ${isActive ? 'bg-brand-500 text-white' : 'text-white/80 hover:bg-brand-700 hover:text-white'}`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg">
            <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.[0]}</span>
            </div>
            <span className="text-xs font-admin text-white/90">{user?.name}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-white/80 hover:text-white
              hover:bg-brand-700 rounded-lg text-sm font-admin transition-colors">
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile tab bar — replaces the previous hamburger dropdown. Drivers work
          one-handed in the field, usually mid-delivery, so the two destinations
          need to be permanently visible and thumb-reachable rather than one tap
          behind a menu. Hidden from sm up, where the header nav takes over. */}
      <nav aria-label="Driver navigation"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-800
          border-t border-brand-700 pb-safe px-safe">
        <div className="flex items-stretch">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2
                min-h-[56px] text-[11px] font-admin font-medium transition-colors
                ${isActive ? 'text-white' : 'text-white/60'}`
              }>
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-10 h-6 rounded-full
                    transition-colors ${isActive ? 'bg-brand-500' : ''}`}>
                    <Icon size={17} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content — pb-24 clears the fixed tab bar; sm:pb-6 restores normal
          spacing once the header nav is back in use. */}
      <main id="main" className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6 max-w-4xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
