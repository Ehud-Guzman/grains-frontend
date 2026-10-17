import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Layers, ShoppingCart, ShieldAlert, AlertTriangle } from 'lucide-react'

// The topbar bell. One component for every viewport and every role — it replaces two
// copy-pasted dropdowns that had already drifted apart.
//
// Rows depend on the role (see useAdminAlerts): business roles get pending orders and low
// stock; the superadmin gets the Control Center's attention items.

function Row({ icon: Icon, tone, title, subtitle, onClick }) {
  const tones = {
    amber: ['bg-amber-100 text-amber-600', 'hover:bg-amber-50'],
    red:   ['bg-red-100 text-red-600',     'hover:bg-red-50'],
  }[tone]
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-full ${tones[1]} transition-colors group text-left`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[0]}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-admin font-semibold text-admin-800 truncate">{title}</p>
        <p className="text-xs text-admin-400 font-admin truncate">{subtitle}</p>
      </div>
      <ChevronRight size={14} className="text-admin-300 group-hover:text-admin-600 transition-colors flex-shrink-0" />
    </button>
  )
}

export default function AlertsBell({ role, alerts }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const isSuper = role === 'superadmin'

  // Close on Escape or a click anywhere outside — without a full-screen invisible overlay
  // sitting on top of the page.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const go = (to) => { setOpen(false); navigate(to) }
  const { total } = alerts
  const urgent = isSuper && alerts.attention.urgent > 0

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-haspopup="true" aria-controls="admin-alerts-panel"
        aria-label={total > 0 ? `Alerts, ${total} need attention` : 'Alerts, none need attention'}
        className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center
          rounded-xl hover:bg-admin-100 text-admin-500 hover:text-admin-800 transition-colors">
        <Bell size={19} />
        {total > 0 && (
          <span className={`absolute top-1 right-1 text-white text-[10px] font-bold min-w-[17px] h-[17px]
            rounded-full flex items-center justify-center px-1 leading-none border-2 border-white
            ${urgent || !isSuper ? 'bg-red-500' : 'bg-amber-500'}`}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div id="admin-alerts-panel" role="region" aria-label="Alerts"
          className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80
            bg-white rounded-2xl shadow-xl border border-admin-100 z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-admin-100 bg-admin-50 flex items-center justify-between">
            <p className="text-sm font-admin font-bold text-admin-900">Alerts</p>
            {total > 0 && <span className="text-xs font-admin text-admin-400">{total} need attention</span>}
          </div>

          <div className="py-1 max-h-[60vh] overflow-y-auto">
            {!isSuper && alerts.pending > 0 && (
              <Row icon={ShoppingCart} tone="amber"
                title={`${alerts.pending} pending order${alerts.pending === 1 ? '' : 's'}`}
                subtitle="Awaiting approval"
                onClick={() => go('/admin/orders?status=pending')} />
            )}
            {!isSuper && alerts.lowStock > 0 && (
              <Row icon={Layers} tone="red"
                title={`${alerts.lowStock} low stock item${alerts.lowStock === 1 ? '' : 's'}`}
                subtitle="At or below threshold"
                onClick={() => go('/admin/stock?filter=low')} />
            )}

            {isSuper && alerts.attention.items.map(item => (
              <Row key={item.id}
                icon={item.severity === 'high' ? ShieldAlert : AlertTriangle}
                tone={item.severity === 'high' ? 'red' : 'amber'}
                title={item.title} subtitle={item.detail || 'Open the Control Center'}
                onClick={() => go(item.link?.startsWith('/') ? item.link : '/admin/control-center')} />
            ))}

            {total === 0 && (
              <p className="px-4 py-6 text-center text-sm text-admin-400 font-admin">All clear — no alerts</p>
            )}
          </div>

          {isSuper && (
            <button type="button" onClick={() => go('/admin/control-center')}
              className="w-full px-4 py-2.5 border-t border-admin-100 bg-admin-50 text-xs font-admin font-semibold text-brand-600 hover:text-brand-700 text-left">
              Open the Control Center →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
