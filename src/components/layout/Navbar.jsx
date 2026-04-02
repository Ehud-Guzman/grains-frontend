import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Menu, X, User, LogOut,
  Package, UserCircle, ChevronDown, Home, ShoppingBag, MapPin
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useShopInfo } from '../../context/AppSettingsContext'

const navLinks = [
  { to: '/',      label: 'Home',        icon: Home       },
  { to: '/shop',  label: 'Shop',        icon: ShoppingBag },
  { to: '/track', label: 'Track Order', icon: MapPin     },
]

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount, openCart } = useCart()
  const shopInfo = useShopInfo()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const menuRef   = useRef()

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); setUserMenuOpen(false) }, [location.pathname])

  // Scroll shadow effect
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <header className={`bg-earth-900 text-cream sticky top-0 z-40 transition-shadow duration-300 ${
        scrolled ? 'shadow-2xl' : 'shadow-warm-lg'
      }`}>
        <div className="container-page">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ─────────────────────────────────────────────── */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="w-10 h-10 flex-shrink-0 relative">
                <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                  className="w-full h-full object-cover rounded-xl border border-earth-700
                    group-hover:border-brand-500 transition-colors shadow-sm" />
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-bold text-cream text-sm leading-tight
                  group-hover:text-brand-300 transition-colors">
                  {shopInfo.name}
                </p>
                <p className="text-earth-500 text-xs leading-tight">{shopInfo.tagline}</p>
              </div>
            </Link>

            {/* ── Desktop nav ──────────────────────────────────────── */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'}
                  data-tour={link.to === '/track' ? 'public-track-link' : undefined}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                    }`
                  }>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* ── Right actions ─────────────────────────────────────── */}
            <div className="flex items-center gap-1">

              {/* Cart */}
              <button onClick={() => openCart?.()}
                className="relative p-2.5 rounded-xl text-earth-300 hover:text-cream
                  hover:bg-earth-800 transition-all group"
                aria-label="Open cart">
                <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white
                    text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center
                    font-bold leading-none px-1 border-2 border-earth-900 shadow-sm">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Sign In (mobile — always visible when logged out) */}
              {!isAuthenticated && (
                <Link to="/login"
                  data-tour="public-signin-link"
                  className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-600 transition-all
                    active:scale-[0.97]">
                  <User size={15} /> Sign In
                </Link>
              )}

              {/* Sign In (desktop) */}
              {!isAuthenticated && (
                <Link to="/login"
                  data-tour="public-signin-link"
                  className="hidden md:flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-600 transition-all
                    active:scale-[0.97]">
                  <User size={15} /> Sign In
                </Link>
              )}

              {/* User menu (authenticated) */}
              {isAuthenticated && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl
                      transition-all ${
                        userMenuOpen
                          ? 'bg-earth-800 text-cream'
                          : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                      }`}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0
                      bg-brand-500 flex items-center justify-center border-2
                      border-earth-700 shadow-sm">
                      {user?.avatarURL ? (
                        <img src={user.avatarURL} alt={user.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold font-body">
                          {user?.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-body font-medium max-w-[80px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14}
                      className={`hidden sm:block transition-transform duration-200 ${
                        userMenuOpen ? 'rotate-180' : ''
                      }`} />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl
                      shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-earth-100
                      overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                      {/* User header */}
                      <div className="px-4 py-3.5 bg-gradient-to-br from-earth-900 to-earth-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-500
                            flex items-center justify-center border-2 border-earth-600 flex-shrink-0">
                            {user?.avatarURL ? (
                              <img src={user.avatarURL} alt={user.name}
                                className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-sm font-bold font-body">
                                {user?.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-body font-semibold text-cream truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-earth-400 font-body mt-0.5">
                              Customer Account
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="py-1.5">
                        <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-earth-700
                            hover:bg-earth-50 font-body transition-colors group">
                          <div className="w-7 h-7 bg-earth-100 group-hover:bg-brand-100 rounded-lg
                            flex items-center justify-center transition-colors flex-shrink-0">
                            <Package size={14} className="text-earth-500 group-hover:text-brand-600
                              transition-colors" />
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">My Orders</p>
                            <p className="text-xs text-earth-400 mt-0.5">Track & manage orders</p>
                          </div>
                        </Link>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-earth-700
                            hover:bg-earth-50 font-body transition-colors group">
                          <div className="w-7 h-7 bg-earth-100 group-hover:bg-brand-100 rounded-lg
                            flex items-center justify-center transition-colors flex-shrink-0">
                            <UserCircle size={14} className="text-earth-500 group-hover:text-brand-600
                              transition-colors" />
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">My Profile</p>
                            <p className="text-xs text-earth-400 mt-0.5">Photo, addresses, password</p>
                          </div>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-earth-100 py-1.5">
                        <button onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-red-600
                            hover:bg-red-50 w-full font-body transition-colors group">
                          <div className="w-7 h-7 bg-red-50 group-hover:bg-red-100 rounded-lg
                            flex items-center justify-center transition-colors flex-shrink-0">
                            <LogOut size={14} className="text-red-500" />
                          </div>
                          <p className="font-semibold">Sign Out</p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className={`md:hidden p-2.5 rounded-xl transition-all ${
                  menuOpen
                    ? 'bg-earth-800 text-cream'
                    : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                }`}
                aria-label="Toggle menu">
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile nav drawer ───────────────────────────────────── */}
        {menuOpen && (
          <div className="md:hidden border-t border-earth-800">

            {/* Nav links */}
            <div className="px-3 pt-3 pb-2 space-y-0.5">
              {navLinks.map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body
                    font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500 text-white'
                        : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                    }`
                  }>
                  {({ isActive }) => (
                    <>
                      <link.icon size={16}
                        className={isActive ? 'text-white' : 'text-earth-500'} />
                      {link.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Account section — authenticated */}
            {isAuthenticated && (
              <>
                <div className="mx-3 my-2 border-t border-earth-800" />

                {/* User info strip */}
                <div className="mx-3 mb-2 px-4 py-3 bg-earth-800/60 rounded-xl
                  flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-500
                    flex items-center justify-center border-2 border-earth-600 flex-shrink-0">
                    {user?.avatarURL ? (
                      <img src={user.avatarURL} alt={user.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold font-body">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-cream text-sm font-body font-semibold leading-tight">
                      {user?.name}
                    </p>
                    <p className="text-earth-500 text-xs font-body mt-0.5">Customer Account</p>
                  </div>
                </div>

                <div className="px-3 pb-2 space-y-0.5">
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body
                      text-earth-300 hover:text-cream hover:bg-earth-800 transition-all">
                    <Package size={16} className="text-earth-500 flex-shrink-0" />
                    My Orders
                  </Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body
                      text-earth-300 hover:text-cream hover:bg-earth-800 transition-all">
                    <UserCircle size={16} className="text-earth-500 flex-shrink-0" />
                    My Profile
                  </Link>
                </div>

                {/* Logout */}
                <div className="mx-3 mb-4 mt-1">
                  <button onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3.5
                      rounded-xl text-sm font-body font-semibold text-red-400
                      border border-red-900/40 hover:bg-red-900/20 transition-all">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </>
            )}

            {/* Sign in — unauthenticated mobile */}
            {!isAuthenticated && (
              <div className="px-3 pb-4 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-500
                    text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.98]">
                  <User size={16} /> Sign In / Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  )
}
