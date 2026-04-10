import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Menu, X, User, LogOut, Package, UserCircle,
  ChevronDown, ChevronLeft, ShoppingBag, MapPin, Search, Phone, Clock,
  Truck, ChevronRight, MessageCircle, LayoutGrid, Home,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useShopInfo, useCategories } from '../../context/AppSettingsContext'
import SearchAutocomplete from '../ui/SearchAutocomplete'

// ── Category icon map ─────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  maize: '🌽', corn: '🌽',
  beans: '🫘', legumes: '🫘', soya: '🫘', soybeans: '🫘',
  rice: '🍚',
  wheat: '🌾', flour: '🌾', sorghum: '🌾', millet: '🌾', barley: '🌾', oats: '🌾',
  lentils: '🟤', peas: '🟤', chickpeas: '🟤',
  nuts: '🥜', groundnuts: '🥜',
  cassava: '🥔', potato: '🥔',
  sesame: '🌰', sunflower: '🌻',
}

const getCategoryIcon = (name) =>
  CATEGORY_ICONS[name.toLowerCase().split(/[\s/]/)[0]] || '🌾'

const fmt = (n) => n >= 1000
  ? `KES ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  : `KES ${n}`

// ── NavSearchBar ──────────────────────────────────────────────────────────────
function NavSearchBar({ onClose, autoFocus = false, size = 'md' }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const handleSearch = (query) => {
    if (!query.trim()) return
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`)
    onClose?.()
  }

  return (
    <SearchAutocomplete
      value={q}
      onChange={setQ}
      onSearch={handleSearch}
      placeholder="Search maize, beans, rice, flour…"
      darkMode={false}
      autoFocus={autoFocus}
      className="w-full"
    />
  )
}

// ── AllCategoriesMenu — full dropdown with grid layout ────────────────────────
function AllCategoriesMenu({ categories }) {
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
    <div className="relative h-full flex items-center" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 h-full text-sm font-body font-semibold
          transition-colors ${
            open
              ? 'bg-brand-600 text-white'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
      >
        <LayoutGrid size={15} />
        <span>All Categories</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full w-72 bg-white border border-earth-200
          shadow-[0_16px_48px_rgba(0,0,0,0.10)] z-50 overflow-hidden
          animate-in fade-in slide-in-from-top-1 duration-150">

          {categories.length === 0 ? (
            <p className="px-4 py-4 text-sm text-earth-400 font-body">Loading…</p>
          ) : (
            <div className="py-1.5">
              {categories.map((cat, i) => (
                <Link
                  key={cat}
                  to={`/shop?category=${encodeURIComponent(cat)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-body
                    text-earth-700 hover:bg-brand-50 hover:text-brand-700 transition-colors group"
                >
                  <span className="w-6 text-center flex-shrink-0 text-lg leading-none">{getCategoryIcon(cat)}</span>
                  <span className="flex-1 font-medium">{cat}</span>
                  <ChevronRight size={13} className="text-earth-300 group-hover:text-brand-400 transition-colors" />
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-earth-100 px-4 py-3 bg-earth-50">
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-sm font-body font-semibold
                text-brand-600 hover:text-brand-700 transition-colors"
            >
              <span>Browse all products</span>
              <span className="flex items-center gap-1 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                View all <ChevronRight size={11} />
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CategoryStrip — scrollable quick-links with arrows + edge fades ──────────
function CategoryStrip({ categories }) {
  const scrollRef = useRef()
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [categories])

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div className="relative flex-1 flex items-stretch min-w-0 overflow-hidden">
      {/* Left fade + arrow */}
      <div className={`absolute left-0 top-0 bottom-0 z-10 flex items-center
        transition-opacity duration-200 pointer-events-none ${canLeft ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-10 h-full bg-gradient-to-r from-white to-transparent" />
      </div>
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6
            bg-white hover:bg-earth-100 text-earth-600 hover:text-earth-900
            rounded-full flex items-center justify-center shadow-sm transition-all
            border border-earth-200"
          aria-label="Scroll left"
        >
          <ChevronLeft size={13} />
        </button>
      )}

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map(cat => (
          <NavLink
            key={cat}
            to={`/shop?category=${encodeURIComponent(cat)}`}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 h-full text-sm font-body font-medium
              whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'text-brand-600 border-brand-500'
                  : 'text-earth-600 border-transparent hover:text-earth-900 hover:border-earth-400'
              }`
            }
          >
            <span className="text-sm leading-none">{getCategoryIcon(cat)}</span>
            {cat}
          </NavLink>
        ))}
      </div>

      {/* Right fade + arrow */}
      <div className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end
        transition-opacity duration-200 pointer-events-none ${canRight ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-10 h-full bg-gradient-to-l from-white to-transparent" />
      </div>
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6
            bg-white hover:bg-earth-100 text-earth-600 hover:text-earth-900
            rounded-full flex items-center justify-center shadow-sm transition-all
            border border-earth-200"
          aria-label="Scroll right"
        >
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({ shopInfo }) {
  return (
    <div className="bg-earth-50 border-b border-earth-200 hidden sm:block">
      <div className="container-page">
        <div className="flex items-center justify-between h-8 text-[11px] font-body text-earth-500">

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Truck size={11} className="text-brand-500 flex-shrink-0" />
              <span>Free delivery on orders over <span className="text-earth-800 font-semibold">KES 50,000</span></span>
            </div>
            {shopInfo?.location && (
              <div className="hidden lg:flex items-center gap-1.5">
                <MapPin size={10} className="text-earth-400" />
                <span>{shopInfo.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {shopInfo?.whatsapp && (
              <a
                href={`https://wa.me/${shopInfo.whatsapp.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
              >
                <MessageCircle size={11} />
                <span>WhatsApp</span>
              </a>
            )}
            {shopInfo?.phone && (
              <a
                href={`tel:${shopInfo.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"
              >
                <Phone size={10} />
                <span>{shopInfo.phone}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <Clock size={10} />
              <span>{shopInfo?.hours ?? 'Mon–Sat, 8am–6pm'}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount, subtotal, openCart } = useCart()
  const shopInfo   = useShopInfo()
  const categories = useCategories()

  const [menuOpen, setMenuOpen]         = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen]     = useState(false)
  const [scrolled, setScrolled]         = useState(false)

  const navigate  = useNavigate()
  const location  = useLocation()
  const menuRef   = useRef()
  const headerRef = useRef()

  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

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
      {/* ── Topbar ──────────────────────────────────────────────── */}
      <TopBar shopInfo={shopInfo} />

      {/* ── Sticky wrapper ──────────────────────────────────────── */}
      <div ref={headerRef} className={`sticky top-0 z-40 transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_24px_rgba(0,0,0,0.10)]' : ''
      }`}>

        {/* ── Row 1: Logo + Search + Cart/Account ─────────────── */}
        <div className="bg-white border-b border-earth-200">
          <div className="container-page">
            <div className="flex items-center gap-3 h-[68px]">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
                <div className="w-10 h-10 flex-shrink-0">
                  <img
                    src="/Vittorios-logo.jpeg"
                    alt={shopInfo.name}
                    className="w-full h-full object-cover rounded-lg border border-earth-200
                      group-hover:border-brand-400 transition-colors"
                  />
                </div>
                <div className="hidden lg:block">
                  <p className="font-display font-bold text-earth-900 text-[15px] leading-tight
                    group-hover:text-brand-600 transition-colors whitespace-nowrap">
                    {shopInfo.name}
                  </p>
                  <p className="text-earth-500 text-[10px] leading-tight font-body">{shopInfo.tagline}</p>
                </div>
              </Link>

              {/* ── Search — center dominant ── */}
              <div className="flex-1 hidden md:block">
                <NavSearchBar />
              </div>

              {/* ── Right actions ── */}
              <div className="flex items-center gap-1 ml-auto md:ml-0">

                {/* Mobile search */}
                <button
                  onClick={() => setSearchOpen(o => !o)}
                  className={`md:hidden p-2.5 rounded-lg transition-all ${
                    searchOpen ? 'bg-earth-100 text-earth-900' : 'text-earth-500 hover:text-earth-900 hover:bg-earth-100'
                  }`}
                  aria-label="Search"
                >
                  {searchOpen ? <X size={20} /> : <Search size={20} />}
                </button>

                {/* Account */}
                {!isAuthenticated ? (
                  <Link
                    to="/login"
                    data-tour="public-signin-link"
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-400
                      bg-brand-50 px-3 sm:px-4 py-2.5 text-brand-700
                      transition-all hover:border-brand-500 hover:bg-brand-100 active:scale-[0.98]"
                  >
                    <User size={16} />
                    <span className="text-sm font-body font-semibold leading-none whitespace-nowrap">
                      Sign In
                    </span>
                    <span className="hidden lg:inline text-[11px] font-body text-brand-500 leading-none whitespace-nowrap">
                      My Account
                    </span>
                  </Link>
                ) : (
                  <div className="relative hidden sm:block" ref={menuRef}>
                    <button
                      onClick={() => setUserMenuOpen(o => !o)}
                      className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all ${
                        userMenuOpen ? 'bg-earth-100 text-earth-900' : 'text-earth-600 hover:text-earth-900 hover:bg-earth-100'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-brand-500
                        flex items-center justify-center border border-earth-200">
                        <AvatarInner size="sm" />
                      </div>
                      <span className="text-[10px] font-body mt-0.5 leading-none max-w-[56px] truncate">
                        {user?.name?.split(' ')[0]}
                      </span>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl
                        shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-earth-200
                        overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                        <div className="px-4 py-3 bg-gradient-to-br from-brand-500 to-brand-600 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20
                            flex items-center justify-center border-2 border-white/30 flex-shrink-0">
                            <AvatarInner size="md" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-body font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-brand-100 font-body mt-0.5">Customer Account</p>
                          </div>
                        </div>

                        <div className="py-1">
                          {[
                            { to: '/dashboard', icon: Package,    label: 'My Orders',  sub: 'Track & manage' },
                            { to: '/profile',   icon: UserCircle, label: 'My Profile', sub: 'Settings & address' },
                          ].map(item => (
                            <Link key={item.to} to={item.to}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-earth-50
                                font-body transition-colors group">
                              <div className="w-7 h-7 bg-earth-100 group-hover:bg-brand-100 rounded-lg
                                flex items-center justify-center transition-colors flex-shrink-0">
                                <item.icon size={14} className="text-earth-500 group-hover:text-brand-600 transition-colors" />
                              </div>
                              <div>
                                <p className="text-sm text-earth-800 font-semibold leading-tight">{item.label}</p>
                                <p className="text-xs text-earth-400 mt-0.5">{item.sub}</p>
                              </div>
                            </Link>
                          ))}
                        </div>

                        <div className="border-t border-earth-100 py-1">
                          <button onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600
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

                {/* Cart */}
                <button
                  onClick={() => openCart?.()}
                  aria-label="Open cart"
                  className="relative flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-lg
                    bg-brand-500 hover:bg-brand-600 text-white transition-all
                    active:scale-[0.97] group shadow-sm"
                >
                  <div className="relative">
                    <ShoppingCart size={19} className="group-hover:scale-110 transition-transform" />
                    {itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-white text-brand-600 text-[10px]
                        min-w-[16px] h-4 rounded-full flex items-center justify-center
                        font-bold leading-none px-0.5 border border-brand-200 shadow-sm">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-none">
                    <p className="text-[10px] text-brand-100 font-body">
                      {itemCount === 0 ? 'Your cart' : `${itemCount} item${itemCount > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-[13px] font-body font-bold">
                      {itemCount > 0 ? fmt(subtotal) : 'KES 0'}
                    </p>
                  </div>
                </button>

                {/* Hamburger (mobile) */}
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className={`md:hidden p-2.5 rounded-lg transition-all ${
                    menuOpen ? 'bg-earth-100 text-earth-900' : 'text-earth-500 hover:text-earth-900 hover:bg-earth-100'
                  }`}
                  aria-label="Menu"
                >
                  {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── Mobile search panel ─────────────────────────────── */}
        {searchOpen && (
          <div className="md:hidden bg-white border-t border-earth-200 px-3 py-2.5">
            <NavSearchBar autoFocus onClose={() => setSearchOpen(false)} />
          </div>
        )}

        {/* ── Row 2: Category nav (desktop only) ──────────────── */}
        <div className="hidden md:block bg-white border-t border-earth-100 border-b border-earth-200">
          <div className="container-page">
            <div className="flex items-stretch h-10 gap-0">

              {/* All Categories */}
              <AllCategoriesMenu categories={categories} />

              {/* Divider */}
              <div className="w-px bg-earth-200 mx-1 flex-shrink-0" />

              {/* Category quick-links — scrollable with arrows */}
              <CategoryStrip categories={categories} />

              {/* Right side nav */}
              <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-earth-200 pl-2 ml-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 h-full text-sm font-body font-medium
                    transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-brand-600 border-b-2 border-brand-500'
                        : 'text-earth-600 hover:text-earth-900'
                    }`
                  }
                >
                  <Home size={13} />
                  Home
                </NavLink>
                <NavLink
                  to="/shop"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 h-full text-sm font-body font-medium
                    transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-brand-600 border-b-2 border-brand-500'
                        : 'text-earth-600 hover:text-earth-900'
                    }`
                  }
                >
                  <ShoppingBag size={13} />
                  Shop All
                </NavLink>
                <NavLink
                  to="/track"
                  data-tour="public-track-link"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 h-full text-sm font-body font-medium
                    transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-brand-600 border-b-2 border-brand-500'
                        : 'text-earth-600 hover:text-earth-900'
                    }`
                  }
                >
                  <MapPin size={13} />
                  Track Order
                </NavLink>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile full-screen drawer ────────────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-50 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 left-0 h-full w-[82vw] max-w-xs bg-white z-50
            md:hidden flex flex-col shadow-2xl overflow-y-auto"
            style={{ animation: 'slideInLeft 0.22s ease-out' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-earth-200">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3">
                <img src="/Vittorios-logo.jpeg" alt={shopInfo.name}
                  className="w-9 h-9 rounded-lg object-cover border border-earth-200" />
                <div>
                  <p className="font-display font-bold text-earth-900 text-sm leading-tight">{shopInfo.name}</p>
                  <p className="text-earth-500 text-[10px] font-body">{shopInfo.tagline}</p>
                </div>
              </Link>
              <button onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-earth-400 hover:text-earth-900 hover:bg-earth-100 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Account strip */}
            {isAuthenticated ? (
              <div className="px-4 py-3 bg-earth-50 border-b border-earth-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-500
                  flex items-center justify-center border-2 border-earth-200 flex-shrink-0">
                  <AvatarInner size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-earth-900 text-sm font-body font-semibold leading-tight truncate">{user?.name}</p>
                  <p className="text-earth-500 text-[10px] font-body mt-0.5">Customer Account</p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-earth-200">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-brand-500
                    text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.98]">
                  <User size={15} />
                  Sign In / Register
                </Link>
              </div>
            )}

            {/* Categories */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-body font-bold text-earth-400 uppercase tracking-widest mb-2">
                Shop by Category
              </p>
              <div className="space-y-0.5">
                {categories.map(cat => (
                  <Link
                    key={cat}
                    to={`/shop?category=${encodeURIComponent(cat)}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body
                      text-earth-700 hover:text-earth-900 hover:bg-earth-100 transition-all"
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">{getCategoryIcon(cat)}</span>
                    <span className="flex-1 font-medium">{cat}</span>
                    <ChevronRight size={13} className="text-earth-300" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mx-4 my-2 border-t border-earth-200" />

            {/* Nav links */}
            <div className="px-4 pb-2 space-y-0.5">
              <NavLink to="/" end onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive ? 'bg-brand-500 text-white' : 'text-earth-700 hover:text-earth-900 hover:bg-earth-100'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <Home size={16} className={isActive ? 'text-white' : 'text-earth-400'} />
                    Home
                  </>
                )}
              </NavLink>
              <NavLink to="/shop" end onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive ? 'bg-brand-500 text-white' : 'text-earth-700 hover:text-earth-900 hover:bg-earth-100'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <ShoppingBag size={16} className={isActive ? 'text-white' : 'text-earth-400'} />
                    Shop All Products
                  </>
                )}
              </NavLink>
              <NavLink to="/track" onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium transition-all ${
                    isActive ? 'bg-brand-500 text-white' : 'text-earth-700 hover:text-earth-900 hover:bg-earth-100'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <MapPin size={16} className={isActive ? 'text-white' : 'text-earth-400'} />
                    Track My Order
                  </>
                )}
              </NavLink>
            </div>

            {/* Authenticated links */}
            {isAuthenticated && (
              <>
                <div className="mx-4 my-2 border-t border-earth-200" />
                <div className="px-4 pb-2 space-y-0.5">
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body
                      text-earth-700 hover:text-earth-900 hover:bg-earth-100 transition-all">
                    <Package size={16} className="text-earth-400 flex-shrink-0" />
                    My Orders
                  </Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body
                      text-earth-700 hover:text-earth-900 hover:bg-earth-100 transition-all">
                    <UserCircle size={16} className="text-earth-400 flex-shrink-0" />
                    My Profile
                  </Link>
                </div>
                <div className="mx-4 mt-auto mb-4">
                  <button onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3
                      rounded-xl text-sm font-body font-semibold text-red-600
                      border border-red-200 hover:bg-red-50 transition-all">
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

        </>
      )}
    </>
  )
}
