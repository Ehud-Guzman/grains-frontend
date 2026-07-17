import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Plus, Lock, Unlock, Building2, FileText, Receipt, Printer } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { adminCustomerService } from '../../../services/admin/customer.service'
import { adminReportService } from '../../../services/admin/report.service'
import { formatKES, formatDate, getStatusBadgeClass, getStatusLabel } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import ViewOnlyBanner from '../../../components/admin/ViewOnlyBanner'
import toast from 'react-hot-toast'

const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

export default function CustomerProfilePage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [b2bLoading, setB2bLoading] = useState(false)
  const [stmtLoading, setStmtLoading] = useState(false)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const [stmtFrom, setStmtFrom] = useState(oneYearAgo)
  const [stmtTo, setStmtTo] = useState(today)

  const fetchProfile = async () => {
    try {
      const res = await adminCustomerService.getProfile(id)
      setCustomer(res.data.data)
    } catch {
      toast.error('Failed to load customer profile')
    }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProfile() }, [id])

  const handleToggleLock = async () => {
    setLockLoading(true)
    try {
      if (customer.isLocked) {
        await adminCustomerService.unlock(id)
        toast.success('Account unlocked')
      } else {
        await adminCustomerService.lock(id)
        toast.success('Account locked')
      }
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally { setLockLoading(false) }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    setSavingNote(true)
    try {
      await adminCustomerService.addNote(id, note)
      toast.success('Note added')
      setNote('')
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSavingNote(false) }
  }

  const handleToggleB2B = async () => {
    setB2bLoading(true)
    try {
      await adminCustomerService.toggleB2B(id)
      toast.success(customer.isB2B ? 'Marked as retail customer' : 'Marked as B2B customer')
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update B2B status')
    } finally { setB2bLoading(false) }
  }

  const handleDownloadStatement = async () => {
    setStmtLoading(true)
    try {
      const res = await adminReportService.getCustomerStatement(id, { from: stmtFrom, to: stmtTo })
      const { orders = [], summary = {} } = res.data.data || {}
      const lines = [
        `Customer Statement — ${customer.name}`,
        `Period: ${stmtFrom} to ${stmtTo}`,
        `Total Orders: ${summary.totalOrders || 0}`,
        `Total Spend: KES ${(summary.totalSpend || 0).toLocaleString()}`,
        `Total VAT: KES ${(summary.totalVat || 0).toLocaleString()}`,
        `Total Discounts: KES ${(summary.totalDiscounts || 0).toLocaleString()}`,
        '',
        'Date,Reference,Status,Items,Total',
        ...orders.map(o =>
          `${formatDate(o.createdAt)},${o.orderRef},${o.status},${o.items?.length || 0},${o.total}`
        ),
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${customer.name?.replace(/\s+/g, '-')}-${stmtFrom}-to-${stmtTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Could not generate statement')
    } finally { setStmtLoading(false) }
  }

  const handlePrintStatement = async () => {
    setStmtLoading(true)
    try {
      const res = await adminReportService.getCustomerStatement(id, { from: stmtFrom, to: stmtTo })
      const { orders = [], summary = {} } = res.data.data || {}
      const win = window.open('', '_blank')
      win.document.write(`
        <html><head><title>Statement — ${customer.name}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}
          h1{font-size:18px;margin-bottom:2px} p.sub{color:#6b7280;margin-top:0;font-size:13px}
          table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
          th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb}
          th{background:#f9fafb}
          .summary{display:flex;gap:24px;margin-top:16px;font-size:13px}
          .summary div{min-width:120px}
          .summary strong{display:block;font-size:15px;margin-top:2px}
        </style></head><body>
        <h1>Customer Statement — ${escapeHtml(customer.name)}</h1>
        <p class="sub">${escapeHtml(customer.phone)} ${customer.email ? '· ' + escapeHtml(customer.email) : ''} ${customer.kraPin ? '· KRA PIN: ' + escapeHtml(customer.kraPin) : ''}</p>
        <p class="sub">Period: ${stmtFrom} to ${stmtTo}</p>
        <div class="summary">
          <div>Total Orders<strong>${summary.totalOrders || 0}</strong></div>
          <div>Total Spend<strong>KES ${(summary.totalSpend || 0).toLocaleString()}</strong></div>
          <div>Total VAT<strong>KES ${(summary.totalVat || 0).toLocaleString()}</strong></div>
          <div>Total Discounts<strong>KES ${(summary.totalDiscounts || 0).toLocaleString()}</strong></div>
        </div>
        <table><thead><tr><th>Date</th><th>Reference</th><th>Status</th><th>Items</th><th>Total</th></tr></thead>
        <tbody>${orders.map(o => `<tr><td>${formatDate(o.createdAt)}</td><td>${escapeHtml(o.orderRef)}</td><td>${escapeHtml(o.status)}</td><td>${o.items?.length || 0}</td><td>KES ${(o.total || 0).toLocaleString()}</td></tr>`).join('')}</tbody>
        </table>
        </body></html>
      `)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 300)
    } catch (err) {
      toast.error('Could not generate statement')
    } finally { setStmtLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!customer) return <div className="p-6 text-center text-admin-400">Customer not found</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {isSuperAdmin && <ViewOnlyBanner />}

      <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-admin-500 hover:text-admin-700 text-sm font-admin mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to customers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 text-xl font-bold font-admin">{customer.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-admin font-bold text-admin-900">{customer.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-admin-400 text-xs capitalize">{customer.role}</p>
                  {customer.isLocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-admin font-medium bg-red-100 text-red-700">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                  {customer.isB2B && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-admin font-medium bg-blue-100 text-blue-700">
                      <Building2 size={10} /> B2B
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm font-admin">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-admin-600 hover:text-brand-600 transition-colors">
                  <Phone size={14} className="text-admin-400 flex-shrink-0" />{customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-admin-600 hover:text-brand-600 transition-colors">
                  <Mail size={14} className="text-admin-400 flex-shrink-0" />{customer.email}
                </a>
              )}
              {customer.kraPin && (
                <div className="flex items-center gap-2 text-admin-600">
                  <Receipt size={14} className="text-admin-400 flex-shrink-0" />KRA PIN: {customer.kraPin}
                </div>
              )}
            </div>
            {customer.isLocked ? (
              isSuperAdmin && (
                <button
                  onClick={handleToggleLock}
                  disabled={lockLoading}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-admin font-medium transition-colors disabled:opacity-50 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                >
                  <Unlock size={14} /> Unlock Account
                </button>
              )
            ) : (
              <button
                onClick={handleToggleLock}
                disabled={lockLoading}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-admin font-medium transition-colors disabled:opacity-50 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              >
                <Lock size={14} /> Lock Account
              </button>
            )}

            {!isSuperAdmin && (
              <button
                onClick={handleToggleB2B}
                disabled={b2bLoading}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-admin font-medium transition-colors disabled:opacity-50 border ${
                  customer.isB2B
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                    : 'bg-admin-50 text-admin-600 hover:bg-admin-100 border-admin-200'
                }`}
              >
                <Building2 size={14} /> {customer.isB2B ? 'Remove B2B Flag' : 'Mark as B2B'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-semibold text-admin-900 mb-3">Lifetime Stats</h2>
            <div className="space-y-3">
              {[
                { label: 'Total Orders', value: customer.totalOrders || 0 },
                { label: 'Total Spend', value: formatKES(customer.totalSpend || 0) },
                { label: 'VAT Collected', value: formatKES(customer.totalVat || 0) },
                { label: 'Avg Order Value', value: formatKES(customer.avgOrderValue || 0) },
                { label: 'First Order', value: formatDate(customer.firstOrderDate) },
                { label: 'Last Order', value: formatDate(customer.lastOrderDate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-admin-500 font-admin">{label}</span>
                  <span className="font-medium text-admin-800 font-admin">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Statement */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-semibold text-admin-900 mb-3">Statement</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-admin text-admin-500 mb-1">From</label>
                <input type="date" value={stmtFrom} max={stmtTo}
                  onChange={e => setStmtFrom(e.target.value)}
                  className="w-full border border-admin-200 rounded-lg px-2 py-1.5 text-xs font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-admin text-admin-500 mb-1">To</label>
                <input type="date" value={stmtTo} min={stmtFrom} max={today}
                  onChange={e => setStmtTo(e.target.value)}
                  className="w-full border border-admin-200 rounded-lg px-2 py-1.5 text-xs font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadStatement}
                disabled={stmtLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-admin-50 border border-admin-200
                  rounded-lg text-xs font-admin font-medium text-admin-700 hover:bg-admin-100
                  transition-colors disabled:opacity-50"
              >
                <FileText size={13} /> CSV
              </button>
              <button
                onClick={handlePrintStatement}
                disabled={stmtLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-admin-50 border border-admin-200
                  rounded-lg text-xs font-admin font-medium text-admin-700 hover:bg-admin-100
                  transition-colors disabled:opacity-50"
              >
                <Printer size={13} /> {stmtLoading ? 'Generating…' : 'Print / PDF'}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-semibold text-admin-900 mb-3">Internal Notes</h2>
            {customer.notes && (
              <div className="bg-admin-50 rounded-lg p-3 mb-3 text-xs font-admin text-admin-700 whitespace-pre-wrap leading-relaxed">
                {customer.notes}
              </div>
            )}
            {!isSuperAdmin && (
              <>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note about this customer…"
                  rows={3}
                  className="w-full border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none mb-2"
                />
                <button onClick={handleAddNote} disabled={savingNote || !note.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-admin font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors w-full justify-center">
                  <Plus size={14} /> {savingNote ? 'Saving…' : 'Add Note'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Order history */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin">
            <div className="px-5 py-4 border-b border-admin-100">
              <h2 className="font-admin font-semibold text-admin-900">Order History</h2>
            </div>
            {!customer.recentOrders?.length ? (
              <div className="p-8 text-center text-admin-400 text-sm font-admin">No orders yet</div>
            ) : (
              <div className="divide-y divide-admin-50">
                {customer.recentOrders.map(order => (
                  <Link key={order._id} to={`/admin/orders/${order._id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-admin-50 transition-colors group">
                    <div>
                      <p className="font-admin font-medium text-admin-800 text-sm">{order.orderRef}</p>
                      <p className="text-admin-400 text-xs mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={getStatusBadgeClass(order.status)}>{getStatusLabel(order.status, order.deliveryMethod)}</span>
                      <span className="font-admin font-semibold text-admin-800 text-sm">{formatKES(order.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
