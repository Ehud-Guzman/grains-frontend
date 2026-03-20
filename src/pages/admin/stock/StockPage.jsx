import { useState, useEffect, useCallback } from 'react'
import { Package, AlertTriangle, Plus, Edit3, Search, X, RefreshCw } from 'lucide-react'
import { adminStockService } from '../../../services/admin/stock.service'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-admin-50">
      <td className="px-5 py-4"><div className="h-4 bg-admin-100 rounded w-28" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-admin-100 rounded w-24" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-admin-100 rounded w-12" /></td>
      <td className="px-5 py-4 text-right"><div className="h-4 bg-admin-100 rounded w-8 ml-auto" /></td>
      <td className="px-5 py-4 text-right"><div className="h-4 bg-admin-100 rounded w-8 ml-auto" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-admin-100 rounded-full w-20" /></td>
      <td className="px-5 py-4"><div className="flex gap-2"><div className="h-7 bg-admin-100 rounded-lg w-20" /><div className="h-7 bg-admin-100 rounded-lg w-16" /></div></td>
    </tr>
  )
}

export default function StockPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ quantity: '', newQuantity: '', reason: '' })
  const [saving, setSaving] = useState(false)

  const fetchStock = async () => {
    setLoading(true)
    try {
      const res = await adminStockService.getOverview()
      setRows(res.data.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStock() }, [])

  const displayRows = rows
    .filter(r => !showLowOnly || r.status !== 'in_stock')
    .filter(r => !search || [r.productName, r.varietyName, r.packagingSize]
      .join(' ').toLowerCase().includes(search.toLowerCase()))

  const lowCount = rows.filter(r => r.status !== 'in_stock').length
  const outCount = rows.filter(r => r.status === 'out_of_stock').length

  const openModal = (type, row) => {
    setModal({ type, row })
    setForm({ quantity: '', newQuantity: String(row.stock), reason: '' })
  }

  const handleSave = async () => {
    const { type, row } = modal
    if (type === 'adjust' && !form.reason.trim()) return toast.error('Reason is required for adjustments')
    if (type === 'delivery' && (!form.quantity || Number(form.quantity) < 1)) return toast.error('Enter a valid quantity')
    setSaving(true)
    try {
      if (type === 'delivery') {
        await adminStockService.addDelivery({
          productId: row.productId, varietyName: row.varietyName,
          packagingSize: row.packagingSize,
          quantity: Number(form.quantity),
          reason: form.reason || 'New delivery'
        })
        toast.success(`+${form.quantity} bags added`)
      } else {
        await adminStockService.adjust({
          productId: row.productId, varietyName: row.varietyName,
          packagingSize: row.packagingSize,
          newQuantity: Number(form.newQuantity),
          reason: form.reason
        })
        toast.success('Stock adjusted')
      }
      setModal(null)
      fetchStock()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  const inputClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
    font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
    focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Stock Management</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {rows.length} items
            {outCount > 0 && <span className="ml-2 text-red-600 font-semibold">{outCount} out of stock</span>}
            {lowCount > outCount && <span className="ml-1.5 text-amber-600">{lowCount - outCount} low</span>}
          </p>
        </div>
        <button onClick={fetchStock}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200
            rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors
            shadow-admin">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Low stock toggle */}
          <button
            onClick={() => setShowLowOnly(o => !o)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-admin
              font-semibold border transition-all ${
                showLowOnly
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-white text-admin-500 border-admin-200 hover:border-red-300 hover:text-red-600'
              }`}>
            <AlertTriangle size={12} />
            Low stock only
            {lowCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                showLowOnly ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {lowCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admin-400" />
          <input
            type="text"
            placeholder="Search product, variety or size…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-admin-200 rounded-lg text-sm
              font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
              focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                hover:bg-admin-200 text-admin-400 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                {['Product', 'Variety', 'Size', 'Stock', 'Alert at', 'Status', 'Actions'].map(h => (
                  <th key={h}
                    className={`px-5 py-3.5 text-xs text-admin-500 font-semibold uppercase tracking-wide
                      ${['Stock', 'Alert at'].includes(h) ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Package size={28} className="text-admin-300 mx-auto mb-3" />
                    <p className="text-admin-500 font-admin font-medium">
                      {search || showLowOnly ? 'No items match your filters' : 'No stock data available'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row, i) => (
                  <tr key={i}
                    className={`hover:bg-admin-50/60 transition-colors group ${
                      row.status === 'out_of_stock' ? 'bg-red-50/30' :
                      row.status === 'low_stock' ? 'bg-amber-50/20' : ''
                    }`}>
                    <td className="px-5 py-4">
                      <p className="font-admin font-semibold text-admin-800">{row.productName}</p>
                    </td>
                    <td className="px-5 py-4 text-admin-600">{row.varietyName}</td>
                    <td className="px-5 py-4 text-admin-600">{row.packagingSize}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-admin font-bold text-lg ${
                        row.status === 'out_of_stock' ? 'text-red-600' :
                        row.status === 'low_stock' ? 'text-amber-600' : 'text-admin-800'
                      }`}>
                        {row.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-admin-400 font-admin">
                      {row.lowStockThreshold}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-admin
                        font-semibold px-2.5 py-1 rounded-full border ${
                          row.status === 'out_of_stock'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : row.status === 'low_stock'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          row.status === 'out_of_stock' ? 'bg-red-400' :
                          row.status === 'low_stock' ? 'bg-amber-400' : 'bg-green-400'
                        }`} />
                        {row.status === 'out_of_stock' ? 'Out of Stock' :
                         row.status === 'low_stock' ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openModal('delivery', row)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 text-brand-700
                            border border-brand-200 rounded-lg text-xs font-admin font-semibold
                            hover:bg-brand-100 transition-colors">
                          <Plus size={12} /> Add Stock
                        </button>
                        <button onClick={() => openModal('adjust', row)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-admin-50 text-admin-600
                            border border-admin-200 rounded-lg text-xs font-admin font-medium
                            hover:bg-admin-100 transition-colors">
                          <Edit3 size={12} /> Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && displayRows.length > 0 && (
          <div className="px-5 py-3 border-t border-admin-100 bg-admin-50/40">
            <p className="text-xs font-admin text-admin-400">
              {displayRows.length} of {rows.length} items shown
            </p>
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-admin-lg border border-admin-100">

            <div className="flex items-center gap-3 px-5 py-4 border-b border-admin-100">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                modal.type === 'delivery' ? 'bg-brand-50' : 'bg-admin-50'
              }`}>
                {modal.type === 'delivery'
                  ? <Plus size={16} className="text-brand-600" />
                  : <Edit3 size={16} className="text-admin-600" />
                }
              </div>
              <div>
                <h3 className="font-admin font-bold text-admin-900 text-sm">
                  {modal.type === 'delivery' ? 'Add Stock Delivery' : 'Manual Adjustment'}
                </h3>
                <p className="text-admin-400 text-xs font-admin mt-0.5">
                  {modal.row.productName} · {modal.row.varietyName} · {modal.row.packagingSize}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Current stock display */}
              <div className="flex items-center justify-between bg-admin-50 rounded-xl px-4 py-3">
                <span className="text-xs font-admin text-admin-500">Current stock</span>
                <span className="font-admin font-bold text-admin-800 text-lg">{modal.row.stock} bags</span>
              </div>

              {modal.type === 'delivery' ? (
                <div>
                  <label className="block text-xs font-admin font-semibold text-admin-600
                    uppercase tracking-wide mb-1.5">
                    Quantity to Add <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="1" value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className={inputClass} placeholder="e.g. 50" autoFocus />
                  {form.quantity > 0 && (
                    <p className="text-xs text-brand-600 font-admin mt-1">
                      New balance: {modal.row.stock + Number(form.quantity)} bags
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-admin font-semibold text-admin-600
                    uppercase tracking-wide mb-1.5">
                    New Quantity <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" value={form.newQuantity}
                    onChange={e => setForm(p => ({ ...p, newQuantity: e.target.value }))}
                    className={inputClass} />
                  {form.newQuantity !== String(modal.row.stock) && (
                    <p className={`text-xs font-admin mt-1 ${
                      Number(form.newQuantity) > modal.row.stock ? 'text-green-600' : 'text-red-500'
                    }`}>
                      Change: {Number(form.newQuantity) > modal.row.stock ? '+' : ''}
                      {Number(form.newQuantity) - modal.row.stock} bags
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-admin font-semibold text-admin-600
                  uppercase tracking-wide mb-1.5">
                  Reason {modal.type === 'adjust' && <span className="text-red-400">*</span>}
                </label>
                <input type="text" value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  className={inputClass}
                  placeholder={modal.type === 'delivery'
                    ? 'e.g. Delivery from Kamau Traders'
                    : 'e.g. Damaged bags removed'} />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin
                  font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
                  text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}