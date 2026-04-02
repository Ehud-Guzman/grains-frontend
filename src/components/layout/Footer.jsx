import { Link } from 'react-router-dom'
import { Phone, Mail, Clock, MapPin, MessageCircle, ArrowUpRight } from 'lucide-react'
import { useShopInfo } from '../../context/AppSettingsContext'

const quickLinks = [
  { to: '/shop',     label: 'Shop All Products' },
  { to: '/track',    label: 'Track Your Order'  },
  { to: '/login',    label: 'Sign In'           },
  { to: '/register', label: 'Create Account'    },
]

export default function Footer() {
  const shopInfo = useShopInfo()

  return (
    <footer className="bg-earth-900 mt-16 relative overflow-hidden">

      {/* Subtle grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

      <div className="container-page py-14 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* ── Brand ──────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl overflow-hidden
                border border-earth-700 group-hover:border-brand-500 transition-colors shadow-sm">
                <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                  className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-display font-bold text-cream text-base leading-tight
                  group-hover:text-brand-300 transition-colors">
                  Vittorios
                </p>
                <p className="text-earth-500 text-xs leading-tight">Grains & Cereals</p>
              </div>
            </Link>

            <p className="text-earth-400 text-sm leading-relaxed mb-5">
              Quality grains and cereals sourced directly and delivered fresh.
              Serving Nairobi and surrounding areas since 2020.
            </p>

            {/* WhatsApp CTA */}
            {shopInfo.whatsapp && (
              <a href={`https://wa.me/${shopInfo.whatsapp}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600/20
                  border border-green-600/30 text-green-400 rounded-xl text-xs font-body
                  font-semibold hover:bg-green-600/30 transition-all group">
                <MessageCircle size={14} className="group-hover:scale-110 transition-transform" />
                Chat on WhatsApp
              </a>
            )}
          </div>

          {/* ── Quick links ─────────────────────────────────────────── */}
          <div>
            <h4 className="font-body font-bold text-cream text-sm uppercase tracking-widest mb-5">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to}
                    className="flex items-center gap-1.5 text-earth-400 hover:text-brand-300
                      text-sm font-body transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-earth-600 group-hover:bg-brand-400
                      transition-colors flex-shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ─────────────────────────────────────────────── */}
          <div>
            <h4 className="font-body font-bold text-cream text-sm uppercase tracking-widest mb-5">
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li>
                <a href={`tel:${shopInfo.phone}`}
                  className="flex items-start gap-3 group">
                  <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-lg
                    flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20
                    transition-colors mt-0.5">
                    <Phone size={13} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-earth-500 text-xs font-body uppercase tracking-wide mb-0.5">
                      Phone
                    </p>
                    <p className="text-earth-300 text-sm font-body group-hover:text-brand-300
                      transition-colors">
                      {shopInfo.phone}
                    </p>
                  </div>
                </a>
              </li>

              <li>
                <a href={`mailto:${shopInfo.email}`}
                  className="flex items-start gap-3 group">
                  <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-lg
                    flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20
                    transition-colors mt-0.5">
                    <Mail size={13} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-earth-500 text-xs font-body uppercase tracking-wide mb-0.5">
                      Email
                    </p>
                    <p className="text-earth-300 text-sm font-body group-hover:text-brand-300
                      transition-colors truncate max-w-[160px]">
                      {shopInfo.email}
                    </p>
                  </div>
                </a>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-lg
                  flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={13} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-earth-500 text-xs font-body uppercase tracking-wide mb-0.5">
                    Hours
                  </p>
                  <p className="text-earth-300 text-sm font-body">{shopInfo.hours}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* ── Location ────────────────────────────────────────────── */}
          <div>
            <h4 className="font-body font-bold text-cream text-sm uppercase tracking-widest mb-5">
              Find Us
            </h4>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-lg
                flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={13} className="text-brand-400" />
              </div>
              <p className="text-earth-400 text-sm font-body leading-relaxed">
                {shopInfo.location}
              </p>
            </div>

            {/* Shop now CTA */}
            <Link to="/shop"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white
                rounded-xl text-xs font-body font-semibold hover:bg-brand-600 transition-all
                active:scale-[0.97] shadow-sm group">
              Browse Products
              <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5
                transition-transform" />
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-earth-800 flex flex-col sm:flex-row
          items-center justify-between gap-3">
          <p className="text-earth-500 text-xs font-body">
            © {new Date().getFullYear()} Vittorios Grains & Cereals. All rights reserved.
          </p>
          <p className="text-earth-600 text-xs font-body">
            Designed & maintained by{' '}
            <a href="https://glimmerink.co.ke/" target="_blank" rel="noopener noreferrer"
              className="text-brand-500 hover:text-brand-400 transition-colors font-semibold">
              GlimmerInk Creations
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
