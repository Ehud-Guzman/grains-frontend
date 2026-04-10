import { Phone, MessageCircle } from 'lucide-react'
import { useShopInfo } from '../../context/AppSettingsContext'

export default function CTABanner() {
  const shopInfo = useShopInfo()
  const wholesaleWhatsapp = '254799031449'

  return (
    <section className="relative overflow-hidden bg-earth-50 border-y border-earth-200 py-16">

      {/* Subtle dot texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }} />

      {/* Terracotta glow blobs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/10
        rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-500/8
        rounded-full blur-3xl pointer-events-none" />

      <div className="container-page relative">
        <div className="max-w-2xl mx-auto text-center">

          {/* Badge */}
          <a
            href={`https://wa.me/${wholesaleWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-100
            border border-brand-200 rounded-full mb-6 hover:bg-brand-200
            transition-colors"
          >
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-brand-700 text-xs font-body font-semibold uppercase tracking-widest">
              Bulk & Wholesale Orders
            </span>
          </a>

          <h2 className="font-display text-3xl sm:text-4xl text-earth-900 font-bold mb-4 leading-tight">
            Need a bulk order or{' '}
            <span className="text-brand-600">custom quote?</span>
          </h2>

          <p className="text-earth-600 font-body leading-relaxed mb-8 max-w-lg mx-auto">
            Call us directly for bulk pricing, flexible delivery schedules,
            and special arrangements tailored to your business.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={`tel:${shopInfo.phone}`}
              className="flex items-center gap-2.5 px-7 py-3.5 bg-brand-700 text-white
                rounded-xl font-body font-semibold hover:bg-brand-800 transition-all
                active:scale-[0.97] shadow-sm group w-full sm:w-auto justify-center">
              <Phone size={17} className="group-hover:scale-110 transition-transform" />
              {shopInfo.phone}
            </a>

            {shopInfo.whatsapp && (
              <a href={`https://wa.me/${shopInfo.whatsapp}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-7 py-3.5 bg-white border
                  border-earth-300 text-earth-800 rounded-xl font-body font-semibold
                  hover:bg-earth-100 transition-all active:scale-[0.97] group
                  w-full sm:w-auto justify-center">
                <MessageCircle size={17} className="text-green-600
                  group-hover:scale-110 transition-transform" />
                WhatsApp Us
              </a>
            )}
          </div>

          {/* Trust line */}
          <p className="text-earth-500 text-xs font-body mt-6">
            Mon – Sat · 7:00 AM – 6:00 PM · Fast response guaranteed
          </p>
        </div>
      </div>
    </section>
  )
}
