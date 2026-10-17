import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { adminControlCenterService } from '../../services/admin/controlCenter.service'
import { SEES_ORDER_QUEUE, SEES_STOCK_LEVELS } from './adminNav'

// What the sidebar badges and the alerts bell show.
//
//  • staff/supervisor/admin: pending orders (everyone with an order queue) and low stock
//    (supervisor+ only — /admin/stock/low refuses staff).
//  • superadmin: the Control Center's attention list (urgent + look-soon items).
//
// Every request is independent. They used to share one Promise.all, so staff — who may read
// orders but not stock — had the pending-orders count thrown away by the stock request's 403.
//
// Polling pauses while the tab is hidden (a forgotten tab shouldn't keep hitting the API
// every minute) and catches up the moment it is visible again.

const BUSINESS_POLL_MS = 60 * 1000
const SUPERADMIN_POLL_MS = 2 * 60 * 1000 // the overview does real work; no need for more often

const EMPTY = { pending: 0, lowStock: 0, attention: { urgent: 0, soon: 0, items: [] } }

export default function useAdminAlerts(role) {
  const [alerts, setAlerts] = useState(EMPTY)

  const load = useCallback(async () => {
    if (role === 'superadmin') {
      try {
        const res = await adminControlCenterService.overview()
        const items = (res.data?.data?.attention || []).filter(a => a.severity !== 'info')
        setAlerts({
          ...EMPTY,
          attention: {
            urgent: items.filter(a => a.severity === 'high').length,
            soon: items.filter(a => a.severity === 'medium').length,
            items: items.slice(0, 6),
          },
        })
      } catch { /* keep the last reading; the Control Center itself reports errors */ }
      return
    }

    const wantsOrders = SEES_ORDER_QUEUE.includes(role)
    const wantsStock = SEES_STOCK_LEVELS.includes(role)
    const [orders, stock] = await Promise.allSettled([
      wantsOrders ? api.get('/admin/orders?status=pending&limit=1') : Promise.resolve(null),
      wantsStock ? api.get('/admin/stock/low') : Promise.resolve(null),
    ])
    setAlerts(prev => ({
      ...prev,
      pending: orders.status === 'fulfilled' && orders.value
        ? orders.value.data?.pagination?.total || 0
        : prev.pending,
      lowStock: stock.status === 'fulfilled' && stock.value
        ? stock.value.data?.data?.length || 0
        : prev.lowStock,
    }))
  }, [role])

  useEffect(() => {
    if (!role || role === 'customer' || role === 'driver') return undefined
    let cancelled = false
    const run = () => { if (!cancelled && !document.hidden) load() }

    run()
    const timer = setInterval(run, role === 'superadmin' ? SUPERADMIN_POLL_MS : BUSINESS_POLL_MS)
    document.addEventListener('visibilitychange', run)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [role, load])

  const total = role === 'superadmin'
    ? alerts.attention.urgent + alerts.attention.soon
    : alerts.pending + alerts.lowStock

  return { ...alerts, total, refresh: load }
}
