import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Truck, List, LogOut, Menu, X, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import api from '../../services/api'

const NAV = [
  { to: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/driver/orders',    icon: List,            label: 'My Orders'  },
]

export default function DriverLayout() {
  const { user, logout } = useAuth()
  const shopInfo = useShopInfo()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout', { refreshToken })
    } catch {}
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-admin-50 flex flex-col">

      {/* Top bar */}
      <header className="bg-earth-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Truck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-admin font-bold leading-tight">{shopInfo?.shopName || 'Driver Portal'}</p>
            <p className="text-xs text-earth-400 leading-tight">Delivery Dashboard</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-admin font-medium transition-colors
                ${isActive ? 'bg-brand-500 text-white' : 'text-earth-300 hover:bg-earth-800 hover:text-white'}`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-earth-800 rounded-lg">
            <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.[0]}</span>
            </div>
            <span className="text-xs font-admin text-earth-200">{user?.name}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-earth-300 hover:text-white
              hover:bg-earth-800 rounded-lg text-sm font-admin transition-colors">
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
          <button className="sm:hidden p-2 rounded-lg hover:bg-earth-800" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="sm:hidden bg-earth-800 border-b border-earth-700 px-4 py-2 flex flex-col gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-admin font-medium
                ${isActive ? 'bg-brand-500 text-white' : 'text-earth-300'}`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
