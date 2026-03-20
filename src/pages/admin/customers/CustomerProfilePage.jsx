import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Plus } from 'lucide-react'
import { adminCustomerService } from '../../../services/admin/customer.service'
import { formatKES, formatDate, getStatusBadgeClass, getStatusLabel } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function CustomerProfilePage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchProfile = async () => {
    try {
      const res = await adminCustomerService.getProfile(id)
      setCustomer(res.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProfile() }, [id])

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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!customer) return <div className="p-6 text-center text-admin-400">Customer not found</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
              <div>
                <h1 className="font-admin font-bold text-admin-900">{customer.name}</h1>
                <p className="text-admin-400 text-xs mt-0.5 capitalize">{customer.role}</p>
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
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-semibold text-admin-900 mb-4">Lifetime Stats</h2>
            <div className="space-y-3">
              {[
                { label: 'Total Orders', value: customer.totalOrders || 0 },
                { label: 'Total Spend', value: formatKES(customer.totalSpend || 0) },
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

          {/* Notes */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-semibold text-admin-900 mb-3">Internal Notes</h2>
            {customer.notes && (
              <div className="bg-admin-50 rounded-lg p-3 mb-3 text-xs font-admin text-admin-700 whitespace-pre-wrap leading-relaxed">
                {customer.notes}
              </div>
            )}
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
                      <span className={getStatusBadgeClass(order.status)}>{getStatusLabel(order.status)}</span>
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
