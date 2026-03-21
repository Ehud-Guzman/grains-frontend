import { Phone, MessageCircle, ArrowRight } from 'lucide-react'
import { SHOP_INFO } from '../../utils/constants'

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-earth-900 py-16">

      {/* Dot texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }} />

      {/* Gold glow blobs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/20
        rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-500/15
        rounded-full blur-3xl pointer-events-none" />

      <div className="container-page relative">
        <div className="max-w-2xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/15
            border border-brand-500/30 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
            <span className="text-brand-300 text-xs font-body font-semibold uppercase tracking-widest">
              Bulk & Wholesale Orders
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl text-cream font-bold mb-4 leading-tight">
            Need a bulk order or{' '}
            <span className="text-brand-400">custom quote?</span>
          </h2>

          <p className="text-earth-400 font-body leading-relaxed mb-8 max-w-lg mx-auto">
            Call us directly for bulk pricing, flexible delivery schedules,
            and special arrangements tailored to your business.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={`tel:${SHOP_INFO.phone}`}
              className="flex items-center gap-2.5 px-7 py-3.5 bg-brand-500 text-white
                rounded-xl font-body font-semibold hover:bg-brand-600 transition-all
                active:scale-[0.97] shadow-lg shadow-brand-900/40 group w-full sm:w-auto
                justify-center">
              <Phone size={17} className="group-hover:scale-110 transition-transform" />
              {SHOP_INFO.phone}
            </a>

            {SHOP_INFO.whatsapp && (
              <a href={`https://wa.me/${SHOP_INFO.whatsapp}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-7 py-3.5 bg-white/8 border
                  border-white/15 text-cream rounded-xl font-body font-semibold
                  hover:bg-white/15 transition-all active:scale-[0.97] group
                  w-full sm:w-auto justify-center">
                <MessageCircle size={17} className="text-green-400
                  group-hover:scale-110 transition-transform" />
                WhatsApp Us
              </a>
            )}
          </div>

          {/* Trust line */}
          <p className="text-earth-600 text-xs font-body mt-6">
            Mon – Sat · 7:00 AM – 6:00 PM · Fast response guaranteed
          </p>
        </div>
      </div>
    </section>
  )
}