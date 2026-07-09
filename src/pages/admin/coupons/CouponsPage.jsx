import { useState, useEffect } from 'react'
import { Plus, Tag, Trash2, Edit2, X, Check, ToggleLeft, ToggleRight, Receipt, ChevronLeft, ChevronRight, User, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { couponService } from '../../../services/coupon.service'
import { formatDate, formatKES } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'

const STATUS_LABELS = {
  pending: 'Pending', approved: 'Approved', preparing: 'Preparing',
  out_for_delivery: 'Out for delivery', completed: 'Completed',
  rejected: 'Rejected', cancelled: 'Cancelled',
}
const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-admin-100 text-admin-500 border-admin-200',
}

// ── REDEMPTIONS DRILL-DOWN ────────────────────────────────────────────────────
function RedemptionsModal({ coupon, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    couponService.getRedemptions(coupon._id, { page, limit: 10 })
      .then(res => setData(res.data?.data))
      .catch(() => toast.error('Failed to load redemptions'))
      .finally(() => setLoading(false))
  }, [coupon._id, page])

  const orders = data?.orders || []
  const pagination = data?.pagination

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-admin-lg border border-admin-100 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Receipt size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="font-admin font-bold text-admin-800 text-sm">Redemptions</p>
              <p className="text-admin-400 text-xs font-admin tracking-wider">{coupon.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-admin-400 hover:text-admin-700 p-1 rounded-lg hover:bg-admin-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <Receipt size={24} className="text-admin-300 mx-auto mb-2" />
              <p className="text-admin-500 font-admin text-sm">No orders have used this code yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-100 bg-admin-25 sticky top-0">
                  {['Date', 'Customer', 'Order', 'Status', 'Discount', 'Total'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const customer = o.userId || o.guestId
                  return (
                    <tr key={o._id} className="border-b border-admin-50 last:border-0 hover:bg-admin-25 transition-colors">
                      <td className="px-4 py-3 text-xs font-admin text-admin-600 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-sm font-admin">
                        <div className="flex items-center gap-1.5">
                          {o.userId
                            ? <User size={11} className="text-admin-300 flex-shrink-0" />
                            : <UserRound size={11} className="text-admin-300 flex-shrink-0" />}
                          <span className="text-admin-800 font-medium truncate max-w-[140px]">{customer?.name || 'Unknown'}</span>
                        </div>
                        <p className="text-admin-400 text-xs mt-0.5">{customer?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-admin text-admin-600 whitespace-nowrap">{o.orderRef}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-admin font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[o.status] || 'bg-admin-100 text-admin-600 border-admin-200'}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-admin text-red-600 whitespace-nowrap">-{formatKES(o.couponDiscount || 0)}</td>
                      <td className="px-4 py-3 text-sm font-admin font-semibold text-admin-800 whitespace-nowrap">{formatKES(o.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-admin-100 flex-shrink-0">
            <p className="text-xs font-admin text-admin-400">
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-admin-200 text-admin-500 hover:bg-admin-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg border border-admin-200 text-admin-500 hover:bg-admin-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const fieldClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
  font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
  focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

const EMPTY_FORM = {
  code: '', discountType: 'percentage', discountValue: '', minOrderValue: '',
  usageLimit: '', expiresAt: '', isActive: true, assignedTo: '',
}

function CouponModal({ coupon, onClose, onSaved }) {
  const isEdit = !!coupon
  const [form, setForm] = useState(isEdit ? {
    ...coupon,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    assignedTo: coupon.assignedTo?._id || coupon.assignedTo || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.code.trim()) return toast.error('Code is required')
    if (!form.discountValue) return toast.error('Discount value is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiresAt: form.expiresAt || null,
        assignedTo: form.assignedTo || null,
      }
      if (isEdit) await couponService.update(coupon._id, payload)
      else await couponService.create(payload)
      toast.success(isEdit ? 'Coupon updated' : 'Coupon created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-admin-lg border border-admin-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Tag size={15} className="text-brand-600" />
            </div>
            <p className="font-admin font-bold text-admin-800 text-sm">
              {isEdit ? `Edit ${coupon.code}` : 'Create Coupon'}
            </p>
          </div>
          <button onClick={onClose} className="text-admin-400 hover:text-admin-700 p-1 rounded-lg hover:bg-admin-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Code</label>
              <input className={fieldClass} placeholder="WELCOME20" value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())} disabled={isEdit} />
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select className={fieldClass} value={form.discountType} onChange={e => set('discountType', e.target.value)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (KES)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">
                {form.discountType === 'percentage' ? 'Discount %' : 'Discount KES'}
              </label>
              <input className={fieldClass} type="number" min="0" placeholder="20"
                value={form.discountValue} onChange={e => set('discountValue', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Min Order (KES)</label>
              <input className={fieldClass} type="number" min="0" placeholder="0 = none"
                value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Usage Limit</label>
              <input className={fieldClass} type="number" min="1" placeholder="Blank = unlimited"
                value={form.usageLimit} onChange={e => set('usageLimit', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Expires</label>
              <input className={fieldClass} type="date" value={form.expiresAt}
                onChange={e => set('expiresAt', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">
              Assign to Customer (user ID — blank = public)
            </label>
            <input className={fieldClass} placeholder="Leave blank for public coupon"
              value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button type="button" onClick={() => set('isActive', !form.isActive)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.isActive ? 'bg-brand-500' : 'bg-admin-200'}`}>
              <span className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm font-admin font-medium text-admin-700">Active</span>
          </label>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-admin-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-admin font-semibold text-admin-600
            border border-admin-200 rounded-xl hover:bg-admin-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-admin font-semibold text-white
              bg-brand-700 rounded-xl hover:bg-brand-800 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { type: 'create'|'edit', coupon? }
  const [deleting, setDeleting] = useState(null)
  const [redemptionsFor, setRedemptionsFor] = useState(null) // coupon or null

  const load = async () => {
    setLoading(true)
    try {
      const res = await couponService.getPerformance()
      setCoupons(res.data?.data || [])
    } catch { toast.error('Failed to load coupons') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return
    setDeleting(id)
    try {
      await couponService.remove(id)
      setCoupons(c => c.filter(x => x._id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(null) }
  }

  const handleToggle = async (coupon) => {
    try {
      const updated = await couponService.update(coupon._id, { isActive: !coupon.isActive })
      setCoupons(c => c.map(x => x._id === coupon._id ? { ...x, ...updated.data.data } : x))
    } catch { toast.error('Failed to update') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Coupons</h1>
          <p className="text-admin-500 text-sm font-admin mt-1">
            Create discount codes for customers
          </p>
        </div>
        <button onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white text-sm font-admin
            font-semibold rounded-xl hover:bg-brand-800 transition-colors shadow-sm">
          <Plus size={15} /> New Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-admin-200 p-16 text-center">
          <Tag size={28} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-500 font-admin font-medium">No coupons yet</p>
          <button onClick={() => setModal({ type: 'create' })}
            className="mt-3 text-sm font-admin font-semibold text-brand-600 hover:underline">
            Create your first coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-admin-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-25">
                {['Code', 'Discount', 'Min Order', 'Usage', 'Redemptions', 'Discount Given', 'Revenue', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                // expiresAt is a date-only value (midnight UTC) — add a full day before
                // comparing so this badge agrees with the backend, which treats the
                // coupon as valid through end-of-day Nairobi time, not from 00:00 UTC.
                const expired = c.expiresAt && (new Date(c.expiresAt).getTime() + 24 * 60 * 60 * 1000) < Date.now()
                const exhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit
                return (
                  <tr key={c._id} className="border-b border-admin-50 last:border-0 hover:bg-admin-25 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-admin font-bold text-admin-900 text-sm tracking-wider">{c.code}</span>
                      {c.assignedTo && (
                        <p className="text-xs font-admin text-admin-400 mt-0.5">
                          For: {c.assignedTo.name || 'specific customer'}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-admin font-bold text-brand-700 text-sm">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : formatKES(c.discountValue)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin text-admin-600">
                      {c.minOrderValue > 0 ? formatKES(c.minOrderValue) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin text-admin-600">
                      {c.usedCount} / {c.usageLimit ?? '∞'}
                      {exhausted && <span className="ml-1 text-xs text-red-500">(limit)</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin">
                      <button onClick={() => setRedemptionsFor(c)} title="View redeeming orders"
                        className="font-semibold text-admin-700 hover:text-brand-600 hover:underline transition-colors">
                        {c.redemptions ?? 0}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin text-red-600">
                      {formatKES(c.totalDiscount ?? 0)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin text-green-700 font-semibold">
                      {formatKES(c.totalRevenue ?? 0)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-admin text-admin-600">
                      {c.expiresAt ? (
                        <span className={expired ? 'text-red-500' : ''}>
                          {formatDate(c.expiresAt)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleToggle(c)} title={c.isActive ? 'Deactivate' : 'Activate'}>
                        {c.isActive
                          ? <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                            </span>
                          : <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold px-2.5 py-1 rounded-full bg-admin-100 text-admin-500 border border-admin-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-admin-300" />Inactive
                            </span>
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: 'edit', coupon: c })}
                          className="p-1.5 rounded-lg text-admin-400 hover:text-admin-700 hover:bg-admin-100 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(c._id)} disabled={deleting === c._id}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CouponModal
          coupon={modal.type === 'edit' ? modal.coupon : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {redemptionsFor && (
        <RedemptionsModal coupon={redemptionsFor} onClose={() => setRedemptionsFor(null)} />
      )}
    </div>
  )
}
