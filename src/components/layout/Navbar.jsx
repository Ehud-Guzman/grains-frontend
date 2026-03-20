import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, Package, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { SHOP_INFO } from '../../utils/constants'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const navLinks = [
    { to: '/',      label: 'Home'        },
    { to: '/shop',  label: 'Shop'        },
    { to: '/track', label: 'Track Order' },
  ]

  return (
    <header className="bg-earth-900 text-cream sticky top-0 z-40 shadow-warm-lg">
      <div className="container-page">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 flex-shrink-0">
              <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                className="w-full h-full object-cover rounded-lg border border-earth-700" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-semibold text-cream text-sm leading-tight">Vittorios</p>
              <p className="text-earth-400 text-xs leading-tight">Grains & Cereals</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-earth-200 hover:text-cream hover:bg-earth-700'
                  }`
                }>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5">

            {/* Cart */}
            <button onClick={() => openCart?.()}
              className="relative p-2.5 rounded-lg text-earth-200 hover:text-cream
                hover:bg-earth-700 transition-colors"
              aria-label="Open cart">
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand-500 text-white text-xs
                  w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-earth-200
                    hover:text-cream hover:bg-earth-700 transition-colors">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-brand-500
                    flex items-center justify-center border border-earth-600">
                    {user?.avatarURL ? (
                      <img src={user.avatarURL} alt={user.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold font-body">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-body font-medium">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-warm-lg
                      border border-earth-100 overflow-hidden z-50">

                      {/* User info header */}
                      <div className="px-4 py-3 bg-earth-50 border-b border-earth-100">
                        <p className="text-sm font-body font-semibold text-earth-800 truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-earth-400 font-body capitalize mt-0.5">
                          {user?.role === 'customer' ? 'Customer account' : user?.role}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-700
                            hover:bg-earth-50 font-body transition-colors">
                          <Package size={15} className="text-earth-400" />
                          My Orders
                        </Link>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-700
                            hover:bg-earth-50 font-body transition-colors">
                          <UserCircle size={15} className="text-earth-400" />
                          My Profile
                        </Link>
                      </div>

                      <div className="border-t border-earth-100 py-1">
                        <button onClick={handleLogout}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600
                            hover:bg-red-50 w-full font-body transition-colors">
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white
                  rounded-xl text-sm font-body font-medium hover:bg-brand-600 transition-colors">
                <User size={15} /> Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2.5 rounded-lg text-earth-200 hover:text-cream
                hover:bg-earth-700 transition-colors">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-earth-700 py-3 space-y-1">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-sm font-body font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-earth-200 hover:text-cream hover:bg-earth-700'
                  }`
                }>
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-body text-earth-200
                    hover:text-cream hover:bg-earth-700 rounded-lg transition-colors">
                  <Package size={15} /> My Orders
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-body text-earth-200
                    hover:text-cream hover:bg-earth-700 rounded-lg transition-colors">
                  <UserCircle size={15} /> My Profile
                </Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-body font-medium text-brand-300
                  hover:text-cream">
                Sign In / Register
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}