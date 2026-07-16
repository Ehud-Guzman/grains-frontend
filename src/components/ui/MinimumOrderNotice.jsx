import { Package, CheckCircle2, MessageCircle } from 'lucide-react'
import { useAppSettings } from '../../context/AppSettingsContext'
import { useBranch } from '../../context/BranchContext'
import { formatKES } from '../../utils/helpers'

// Surfaces a branch's order minimums BEFORE checkout (bulk-only branches like
// Busia set these in Settings → Pricing). Two per-branch minimums exist:
// minimumOrderValue (KES) and minimumOrderQuantity (total bags) — either or
// both may be set. Renders nothing when the resolved branch has neither, so
// it's safe to mount everywhere.
//
//   <MinimumOrderNotice />                                → info banner (shop page)
//   <MinimumOrderNotice subtotal={total} quantity={bags} />→ progress toward the minimums (cart)
export default function MinimumOrderNotice({ subtotal = null, quantity = null, compact = false, className = '' }) {
  const { orderSettings, shopInfo, hasLoaded } = useAppSettings()
  const { branch } = useBranch()
  const minValue = Number(orderSettings.minimumOrderValue) || 0
  const minQty = Number(orderSettings.minimumOrderQuantity) || 0

  if (!hasLoaded || (minValue <= 0 && minQty <= 0)) return null

  const ruleText = [
    minQty > 0 && <strong key="q">{minQty} bags</strong>,
    minValue > 0 && <strong key="v">{formatKES(minValue)}</strong>,
  ].filter(Boolean)
  const whatsappDigits = (shopInfo?.whatsapp || '').replace(/\D/g, '')

  // ── Info variant — no cart context (shop / browse pages) ─────────────
  if (subtotal === null) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 ${className}`}>
        <div className="flex items-start gap-2.5">
          <Package size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-800 font-body">
            {branch?.name ? `Our ${branch.name} branch` : 'This branch'} serves bulk
            orders — the minimum order is {ruleText[0]}{ruleText.length > 1 && <> ({ruleText[1]})</>}.
          </p>
        </div>
        {whatsappDigits && (
          <a href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Hello, I would like to place a bulk order.')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 ml-[26px] text-xs font-body
              font-semibold text-green-700 hover:text-green-800 transition-colors">
            <MessageCircle size={13} />
            Talk to us on WhatsApp about large orders
          </a>
        )}
      </div>
    )
  }

  // ── Progress variant — cart pages ─────────────────────────────────────
  const cartQty = Number(quantity) || 0
  const valueMet = minValue <= 0 || subtotal >= minValue
  const qtyMet = minQty <= 0 || cartQty >= minQty
  const met = valueMet && qtyMet

  const missing = []
  if (!qtyMet) missing.push(<span key="q"><strong>{minQty - cartQty} more bag{minQty - cartQty === 1 ? '' : 's'}</strong> (minimum {minQty})</span>)
  if (!valueMet) missing.push(<span key="v"><strong>{formatKES(minValue - subtotal)}</strong> more (minimum {formatKES(minValue)})</span>)

  // Progress toward whichever requirement is furthest from being met
  const ratios = []
  if (minValue > 0) ratios.push(subtotal / minValue)
  if (minQty > 0) ratios.push(cartQty / minQty)
  const pct = Math.min(100, Math.round(Math.min(...ratios) * 100))

  return (
    <div className={`rounded-xl border px-3.5 ${compact ? 'py-2.5' : 'py-3'} ${
      met ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
    } ${className}`}>
      <div className="flex items-start gap-2">
        {met ? (
          <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Package size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <p className={`text-xs font-body ${met ? 'text-green-800' : 'text-amber-800'}`}>
          {met ? (
            <>Bulk order minimum met — ready to check out.</>
          ) : (
            <>This branch takes bulk orders only — add {missing[0]}
              {missing.length > 1 && <> and {missing[1]}</>} to check out.</>
          )}
        </p>
      </div>
      {!met && (
        <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
