import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Menu, X, User, LogOut, Package, UserCircle,
  ChevronDown, ShoppingBag, MapPin, Search, Phone, Clock,
  Truck, Layers, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useShopInfo } from '../../context/AppSettingsContext'

// ── Category config ──────────────────────────────────────────────────────────
// Update labels/routes to match your actual product categories.
const GRAIN_CATEGORIES = [
  { label: 'Maize',            to: '/shop?category=Maize',   icon: '🌽' },
  { label: 'Beans',            to: '/shop?category=Beans',   icon: '🫘' },
  { label: 'Rice',             to: '/shop?category=Rice',    icon: '🍚' },
  { label: 'Wheat',            to: '/shop?category=Wheat',   icon: '🌾' },
  { label: 'Sorghum',          to: '/shop?category=Sorghum', icon: '🌾' },
  { label: 'Lentils',          to: '/shop?category=Lentils', icon: '🟤' },
  { label: 'Millet',           to: '/shop?category=Millet',  icon: '🌾' },
  { label: 'Bulk / Wholesale', to: '/shop?packaging=Bulk',   icon: '📦', highlight: true },
]

// ── SearchBar ────────────────────────────────────────────────────────────────
function SearchBar({ onSearch, autoFocus = false }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
    onSearch?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search maize, beans, rice..."
        className="flex-1 min-w-0 bg-earth-800 text-cream placeholder-earth-500 text-sm font-body
          rounded-l-xl px-4 py-2.5 border border-earth-700 border-r-0
          focus:outline-none focus:border-brand-500 transition-colors"
      />
      <button
        type="submit"
        className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-r-xl
          transition-colors flex-shrink-0"
        aria-label="Search"
      >
        <Search size={16} />
      </button>
    </form>
  )
}

// ── CategoriesDropdown ───────────────────────────────────────────────────────
function CategoriesDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-body
          font-medium transition-all ${
            open
              ? 'bg-brand-500 text-white'
              : 'text-earth-300 hover:text-cream hover:bg-earth-800'
          }`}
      >
        <Layers size={15} />
        Categories
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl
          shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-earth-100 overflow-hidden z-50
          animate-in fade-in slide-in-from-top-2 duration-150">

          <div className="px-4 py-2.5 bg-earth-50 border-b border-earth-100">
            <p className="text-[11px] font-body font-bold text-earth-400 uppercase tracking-widest">
              Shop by Category
            </p>
          </div>

          <div className="py-1.5">
            {GRAIN_CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                to={cat.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-body
                  hover:bg-brand-50 transition-colors ${
                    cat.highlight
                      ? 'text-brand-700 font-semibold border-t border-earth-100 mt-1'
                      : 'text-earth-700'
                  }`}
              >
                <span className="w-5 text-center flex-shrink-0 text-base">{cat.icon}</span>
                <span className="flex-1">{cat.label}</span>
                {cat.highlight && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5
                    rounded-md font-bold uppercase tracking-wide">
                    Quote
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="border-t border-earth-100 px-4 py-3">
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-sm font-body font-semibold
                text-brand-600 hover:text-brand-700 transition-colors"
            >
              View all products
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TopBar ───────────────────────────────────────────────────────────────────
// Scrolls away — not sticky. The main <header> below is the sticky element.
function TopBar({ shopInfo }) {
  return (
    <div className="bg-earth-900 border-b border-earth-800">
      <div className="container-page">
        <div className="flex items-center justify-between h-9 gap-4 text-xs font-body text-earth-400">

          {/* Delivery note */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Truck size={12} className="text-brand-400 flex-shrink-0" />
            <span className="hidden sm:block truncate">
              Free delivery on orders over KES 5,000 within Nairobi
            </span>
            <span className="sm:hidden truncate">Free delivery over KES 5,000</span>
          </div>

          {/* Phone + hours */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {shopInfo?.phone && (
              <a
                href={`tel:${shopInfo.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 hover:text-brand-400 transition-colors"
              >
                <Phone size={11} />
                <span className="hidden md:block">{shopInfo.phone}</span>
                <span className="md:hidden font-semibold text-earth-300">Call Us</span>
              </a>
            )}
            <div className="hidden sm:flex items-center gap-1.5">
              <Clock size={11} />
              <span>{shopInfo?.hours ?? 'Mon–Sat, 8am–6pm'}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount, openCart } = useCart()
  const shopInfo = useShopInfo()

  const [menuOpen, setMenuOpen]         = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen]     = useState(false)
  const [scrolled, setScrolled]         = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const menuRef  = useRef()

  // Close everything on route change
  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  // Scroll shadow
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const fn = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  // Avatar initials helper
  const initial = user?.name?.charAt(0).toUpperCase()

  const AvatarInner = ({ size = 'sm' }) =>
    user?.avatarURL ? (
      <img src={user.avatarURL} alt={user.name} className="w-full h-full object-cover" />
    ) : (
      <span className={`text-white font-bold font-body ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {initial}
      </span>
    )

  return (
    <>
      {/* ── Top info bar (scrolls away) ─────────────────────── */}
      <TopBar shopInfo={shopInfo} />

      {/* ── Main sticky header ──────────────────────────────── */}
      <header className={`bg-earth-900 text-cream sticky top-0 z-40 transition-shadow duration-300 ${
        scrolled ? 'shadow-2xl' : 'shadow-warm-lg'
      }`}>
        <div className="container-page">
          <div className="flex items-center gap-2 h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0 mr-1">
              <div className="w-11 h-11 flex-shrink-0">
                <img
                  src="/Vittorios-logo.jpeg"
                  alt={shopInfo.name}
                  className="w-full h-full object-cover rounded-xl border border-earth-700
                    group-hover:border-brand-500 transition-colors shadow-sm"
                />
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-bold text-cream leading-tight
                  group-hover:text-brand-300 transition-colors">
                  {shopInfo.name}
                </p>
                <p className="text-earth-500 text-xs leading-tight">{shopInfo.tagline}</p>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 flex-shrink-0">
              <CategoriesDropdown />

              <NavLink
                to="/shop"
                end
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                  }`
                }
              >
                Shop All
              </NavLink>

              <NavLink
                to="/track"
                data-tour="public-track-link"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                  }`
                }
              >
                Track Order
              </NavLink>
            </nav>

            {/* Desktop search — grows to fill available space */}
            <div className="hidden md:block flex-1 max-w-xs mx-3">
              <SearchBar />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0">

              {/* Search toggle (mobile only) */}
              <button
                onClick={() => setSearchOpen(o => !o)}
                className={`md:hidden p-2.5 rounded-xl transition-all ${
                  searchOpen
                    ? 'bg-earth-800 text-cream'
                    : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                }`}
                aria-label={searchOpen ? 'Close search' : 'Search'}
              >
                {searchOpen ? <X size={20} /> : <Search size={20} />}
              </button>

              {/* Cart — shows text label on sm+ screens */}
              <button
                onClick={() => openCart?.()}
                className="relative flex items-center gap-2 px-3 py-2 rounded-xl
                  text-earth-300 hover:text-cream hover:bg-earth-800 transition-all group"
                aria-label="Open cart"
              >
                <ShoppingCart size={20} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="hidden sm:block text-sm font-body font-medium">Cart</span>
                {itemCount > 0 && (
                  <>
                    {/* Mobile: floating badge */}
                    <span className="sm:hidden absolute -top-1 -right-1 bg-brand-500 text-white
                      text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center
                      font-bold leading-none px-1 border-2 border-earth-900">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                    {/* Desktop: inline pill */}
                    <span className="hidden sm:flex items-center justify-center bg-brand-500 text-white
                      text-xs min-w-[20px] h-5 rounded-full font-bold leading-none px-1">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  </>
                )}
              </button>

              {/* Sign In */}
              {!isAuthenticated && (
                <Link
                  to="/login"
                  data-tour="public-signin-link"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.97]"
                >
                  <User size={15} />
                  <span className="hidden sm:block">Sign In</span>
                </Link>
              )}

              {/* User dropdown (authenticated) */}
              {isAuthenticated && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl
                      transition-all ${
                        userMenuOpen
                          ? 'bg-earth-800 text-cream'
                          : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0
                      bg-brand-500 flex items-center justify-center border-2 border-earth-700 shadow-sm">
                      <AvatarInner size="sm" />
                    </div>
                    <span className="hidden sm:block text-sm font-body font-medium max-w-[80px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`hidden sm:block transition-transform duration-200 ${
                        userMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl
                      shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-earth-100
                      overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                      {/* User header */}
                      <div className="px-4 py-3.5 bg-gradient-to-br from-earth-900 to-earth-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-500
                            flex items-center justify-center border-2 border-earth-600 flex-shrink-0">
                            <AvatarInner size="md" />
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
                        {[
                          { to: '/dashboard', icon: Package,    label: 'My Orders',  sub: 'Track & manage orders'     },
                          { to: '/profile',   icon: UserCircle, label: 'My Profile', sub: 'Photo, addresses, password' },
                        ].map(item => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-earth-700
                              hover:bg-earth-50 font-body transition-colors group"
                          >
                            <div className="w-7 h-7 bg-earth-100 group-hover:bg-brand-100 rounded-lg
                              flex items-center justify-center transition-colors flex-shrink-0">
                              <item.icon size={14} className="text-earth-500 group-hover:text-brand-600 transition-colors" />
                            </div>
                            <div>
                              <p className="font-semibold leading-tight">{item.label}</p>
                              <p className="text-xs text-earth-400 mt-0.5">{item.sub}</p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-earth-100 py-1.5">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-red-600
                            hover:bg-red-50 w-full font-body transition-colors group"
                        >
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
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile search panel ──────────────────────────── */}
        {searchOpen && (
          <div className="md:hidden border-t border-earth-800 px-3 py-3">
            <SearchBar autoFocus onSearch={() => setSearchOpen(false)} />
          </div>
        )}

        {/* ── Mobile drawer ────────────────────────────────── */}
        {menuOpen && (
          <div className="md:hidden border-t border-earth-800">

            {/* Category grid */}
            <div className="px-3 pt-4 pb-2">
              <p className="text-[11px] font-body font-bold text-earth-500 uppercase tracking-widest px-1 mb-2">
                Shop by Category
              </p>
              <div className="grid grid-cols-2 gap-1">
                {GRAIN_CATEGORIES.map(cat => (
                  <Link
                    key={cat.label}
                    to={cat.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-body
                      transition-all ${
                        cat.highlight
                          ? 'bg-brand-500/15 text-brand-300 font-semibold col-span-2'
                          : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                      }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mx-3 my-2 border-t border-earth-800" />

            {/* Nav links */}
            <div className="px-3 pb-2 space-y-0.5">
              <NavLink to="/shop" end onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive ? 'bg-brand-500 text-white' : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <ShoppingBag size={16} className={isActive ? 'text-white' : 'text-earth-500'} />
                    Shop All Products
                  </>
                )}
              </NavLink>
              <NavLink to="/track" onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive ? 'bg-brand-500 text-white' : 'text-earth-300 hover:text-cream hover:bg-earth-800'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <MapPin size={16} className={isActive ? 'text-white' : 'text-earth-500'} />
                    Track Order
                  </>
                )}
              </NavLink>
            </div>

            {/* Authenticated account section */}
            {isAuthenticated && (
              <>
                <div className="mx-3 my-2 border-t border-earth-800" />
                <div className="mx-3 mb-2 px-4 py-3 bg-earth-800/60 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-500
                    flex items-center justify-center border-2 border-earth-600 flex-shrink-0">
                    <AvatarInner size="md" />
                  </div>
                  <div>
                    <p className="text-cream text-sm font-body font-semibold leading-tight">{user?.name}</p>
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

            {/* Sign in (unauthenticated) */}
            {!isAuthenticated && (
              <div className="px-3 pb-4 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-500
                    text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.98]">
                  <User size={16} />
                  Sign In / Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  )
}