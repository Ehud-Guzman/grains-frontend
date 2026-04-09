import { useState, useEffect, useCallback } from 'react'
import {
  Truck, Plus, ChevronDown, ChevronUp, CheckCircle2, Clock,
  Trash2, X, AlertTriangle, Package, Calendar, Hash,
  RefreshCw, Search, SlidersHorizontal, FileText, User
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { stockIntakeService } from '../../../services/admin/stockIntake.service'
import { formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import ViewOnlyBanner from '../../../components/admin/ViewOnlyBanner'
import toast from 'react-hot-toast'

// ── HELPERS ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: 'Pending',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  processed: { label: 'Processed', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400'  },
}

const EMPTY_ITEM = { description: '', quantity: '', unit: 'bags', notes: '' }
const EMPTY_FORM = {
  supplier: '', vehicleRef: '', arrivedAt: '', notes: '',
  items: [{ ...EMPTY_ITEM }],
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full border ${m.bg} ${m.text} ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ── ITEM ROW ─────────────────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove, canRemove, inputClass }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      {/* Description */}
      <div className="col-span-12 sm:col-span-5">
        <input
          type="text"
          value={item.description}
          onChange={e => onChange(index, 'description', e.target.value)}
          className={inputClass}
          placeholder="e.g. White Maize (unsorted)"
        />
      </div>
      {/* Quantity */}
      <div className="col-span-4 sm:col-span-2">
        <input
          type="number"
          min="0"
          value={item.quantity}
          onChange={e => onChange(index, 'quantity', e.target.value)}
          className={inputClass}
          placeholder="Qty"
        />
      </div>
      {/* Unit */}
      <div className="col-span-4 sm:col-span-2">
        <input
          type="text"
          value={item.unit}
          onChange={e => onChange(index, 'unit', e.target.value)}
          className={inputClass}
          placeholder="Unit"
        />
      </div>
      {/* Notes */}
      <div className="col-span-4 sm:col-span-2">
        <input
          type="text"
          value={item.notes}
          onChange={e => onChange(index, 'notes', e.target.value)}
          className={inputClass}
          placeholder="Notes"
        />
      </div>
      {/* Remove */}
      <div className="col-span-12 sm:col-span-1 flex justify-end sm:justify-center pt-1">
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="p-1.5 rounded-lg text-admin-400 hover:text-red-500 hover:bg-red-50
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Remove item"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── CREATE MODAL ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    arrivedAt: new Date().toISOString().slice(0, 16),
    items: [{ ...EMPTY_ITEM }],
  })
  const [saving, setSaving] = useState(false)

  const inputClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
    font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
    focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const changeItem = (index, key, val) => {
    setForm(p => {
      const items = [...p.items]
      items[index] = { ...items[index], [key]: val }
      return { ...p, items }
    })
  }

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))
  const removeItem = (index) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }))

  const handleSubmit = async () => {
    if (!form.supplier.trim()) return toast.error('Supplier name is required')
    if (!form.arrivedAt) return toast.error('Arrival date/time is required')
    const validItems = form.items.filter(i => i.description.trim())
    if (validItems.length === 0) return toast.error('Add at least one item')
    for (const item of validItems) {
      if (item.quantity === '' || Number(item.quantity) < 0) {
        return toast.error(`Quantity for "${item.description}" must be 0 or more`)
      }
    }

    setSaving(true)
    try {
      const payload = {
        supplier:   form.supplier.trim(),
        vehicleRef: form.vehicleRef.trim(),
        arrivedAt:  new Date(form.arrivedAt).toISOString(),
        notes:      form.notes.trim(),
        items:      validItems.map(i => ({
          description: i.description.trim(),
          quantity:    Number(i.quantity),
          unit:        i.unit.trim() || 'bags',
          notes:       i.notes.trim(),
        })),
      }
      const res = await stockIntakeService.create(payload)
      toast.success(`Intake ${res.data.data.intakeRef} logged`)
      onCreated(res.data.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create intake record')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center
      justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-admin-100
        my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
              <Truck size={17} className="text-brand-600" />
            </div>
            <div>
              <h2 className="font-admin font-bold text-admin-900 text-sm">Log Truck Arrival</h2>
              <p className="text-xs font-admin text-admin-400 mt-0.5">
                Record raw goods received from supplier
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-admin-100 text-admin-400
              hover:text-admin-700 transition-colors">
            <X size={17} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Supplier + Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600
                uppercase tracking-wide mb-1.5">
                Supplier <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.supplier}
                onChange={e => setField('supplier', e.target.value)}
                className={inputClass} placeholder="e.g. Kamau Traders Ltd" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600
                uppercase tracking-wide mb-1.5">
                Vehicle / Truck Ref
              </label>
              <input type="text" value={form.vehicleRef}
                onChange={e => setField('vehicleRef', e.target.value)}
                className={inputClass} placeholder="e.g. KBZ 001A" />
            </div>
          </div>

          {/* Arrival date */}
          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600
              uppercase tracking-wide mb-1.5">
              Arrived At <span className="text-red-400">*</span>
            </label>
            <input type="datetime-local" value={form.arrivedAt}
              onChange={e => setField('arrivedAt', e.target.value)}
              className={inputClass} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-admin font-semibold text-admin-600
                uppercase tracking-wide">
                Goods / Items <span className="text-red-400">*</span>
              </label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-admin font-semibold
                  text-brand-600 hover:text-brand-700 transition-colors">
                <Plus size={13} /> Add row
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 mb-1 px-0.5 hidden sm:grid">
              {['Description', 'Qty', 'Unit', 'Notes', ''].map((h, i) => (
                <div key={i} className={`text-xs font-admin font-semibold text-admin-400
                  uppercase tracking-wide ${
                    i === 0 ? 'col-span-5' :
                    i === 1 ? 'col-span-2' :
                    i === 2 ? 'col-span-2' :
                    i === 3 ? 'col-span-2' : 'col-span-1'
                  }`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <ItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  onChange={changeItem}
                  onRemove={removeItem}
                  canRemove={form.items.length > 1}
                  inputClass={inputClass}
                />
              ))}
            </div>
          </div>

          {/* General notes */}
          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600
              uppercase tracking-wide mb-1.5">
              General Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Any additional notes about this delivery…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex gap-2 border-t border-admin-100">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin
              font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors
              flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white
              rounded-full animate-spin" /> Saving…</> : <><Truck size={15} /> Log Arrival</>}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PROCESS MODAL ────────────────────────────────────────────────────────────
function ProcessModal({ intake, onClose, onProcessed }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await stockIntakeService.markProcessed(intake._id, notes)
      toast.success(`${intake.intakeRef} marked as processed`)
      onProcessed(res.data.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process intake')
    } finally { setSaving(false) }
  }

  const inputClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
    font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
    focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center
      justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-admin-100">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-admin-100">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={17} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">
              Mark as Processed
            </h3>
            <p className="text-xs font-admin text-admin-400 mt-0.5">
              {intake.intakeRef} · {intake.supplier}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex
            items-start gap-3">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-admin text-amber-700">
              This marks the goods as sorted and packed. This action cannot be undone.
            </p>
          </div>

          {/* Items summary */}
          <div className="bg-admin-50 rounded-xl p-3 space-y-1">
            {intake.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-admin text-admin-700">{item.description}</span>
                <span className="text-xs font-admin font-semibold text-admin-800">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600
              uppercase tracking-wide mb-1.5">
              Processing Notes <span className="text-admin-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="e.g. Packed into 50kg bags, 3 bags damaged removed…"
              autoFocus
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-admin
              font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors
              flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><CheckCircle2 size={15} /> Confirm Processed</>}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DETAIL PANEL (expandable row) ────────────────────────────────────────────
function DetailPanel({ intake, onProcess, onDelete, canAct }) {
  return (
    <div className="px-5 pb-4 pt-2 border-t border-admin-50 bg-admin-50/40">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Items list */}
        <div>
          <p className="text-xs font-admin font-semibold text-admin-500 uppercase
            tracking-wide mb-2">
            Goods Received
          </p>
          <div className="space-y-1.5">
            {intake.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 bg-white
                rounded-xl px-3 py-2 border border-admin-100">
                <div className="min-w-0">
                  <p className="text-sm font-admin font-semibold text-admin-800 leading-tight">
                    {item.description}
                  </p>
                  {item.notes && (
                    <p className="text-xs font-admin text-admin-400 mt-0.5">{item.notes}</p>
                  )}
                </div>
                <span className="text-sm font-admin font-bold text-admin-700 whitespace-nowrap flex-shrink-0">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          {intake.notes && (
            <div>
              <p className="text-xs font-admin font-semibold text-admin-500 uppercase
                tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm font-admin text-admin-700 bg-white rounded-xl
                px-3 py-2 border border-admin-100">
                {intake.notes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl px-3 py-2 border border-admin-100">
              <p className="text-xs font-admin text-admin-400">Logged by</p>
              <p className="text-sm font-admin font-semibold text-admin-700 mt-0.5">
                {intake.createdBy?.name || '—'}
              </p>
            </div>
            <div className="bg-white rounded-xl px-3 py-2 border border-admin-100">
              <p className="text-xs font-admin text-admin-400">Logged at</p>
              <p className="text-sm font-admin font-semibold text-admin-700 mt-0.5">
                {formatDate(intake.createdAt)}
              </p>
            </div>
          </div>

          {intake.status === 'processed' && (
            <div className="bg-green-50 rounded-xl px-3 py-2 border border-green-100 space-y-1">
              <p className="text-xs font-admin font-semibold text-green-700 uppercase tracking-wide">
                Processing Record
              </p>
              <p className="text-xs font-admin text-green-700">
                By <strong>{intake.processedBy?.name || '—'}</strong> · {formatDate(intake.processedAt)}
              </p>
              {intake.processedNotes && (
                <p className="text-xs font-admin text-green-700 italic">"{intake.processedNotes}"</p>
              )}
            </div>
          )}

          {/* Actions */}
          {canAct && intake.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => onProcess(intake)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500
                  text-white rounded-xl text-xs font-admin font-semibold hover:bg-green-600
                  transition-colors">
                <CheckCircle2 size={13} /> Mark Processed
              </button>
              <button onClick={() => onDelete(intake)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 border
                  border-red-200 text-red-500 rounded-xl text-xs font-admin font-medium
                  hover:bg-red-50 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── INTAKE ROW ────────────────────────────────────────────────────────────────
function IntakeRow({ intake, onProcess, onDelete, canAct }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className={`border-b border-admin-50 hover:bg-admin-50/50 transition-colors cursor-pointer
          ${intake.status === 'pending' ? 'bg-amber-50/20' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Ref */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-admin-100 rounded-lg flex items-center
              justify-center flex-shrink-0">
              <Truck size={13} className="text-admin-500" />
            </div>
            <div>
              <p className="text-sm font-admin font-bold text-admin-900">{intake.intakeRef}</p>
              <p className="text-xs font-admin text-admin-400">{formatDate(intake.arrivedAt)}</p>
            </div>
          </div>
        </td>
        {/* Supplier */}
        <td className="px-5 py-4">
          <p className="text-sm font-admin font-semibold text-admin-800">{intake.supplier}</p>
          {intake.vehicleRef && (
            <p className="text-xs font-admin text-admin-400 mt-0.5">{intake.vehicleRef}</p>
          )}
        </td>
        {/* Items count */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-1.5">
            <Package size={13} className="text-admin-400" />
            <span className="text-sm font-admin text-admin-700">
              {intake.items.length} item{intake.items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </td>
        {/* Status */}
        <td className="px-5 py-4">
          <StatusBadge status={intake.status} />
        </td>
        {/* Expand toggle */}
        <td className="px-5 py-4 text-right">
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <DetailPanel
              intake={intake}
              onProcess={onProcess}
              onDelete={onDelete}
              canAct={canAct}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-admin-50">
      <td className="px-5 py-4"><div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-admin-100 rounded-lg" />
        <div className="space-y-1">
          <div className="h-4 bg-admin-100 rounded w-24" />
          <div className="h-3 bg-admin-100 rounded w-16" />
        </div>
      </div></td>
      <td className="px-5 py-4"><div className="h-4 bg-admin-100 rounded w-32" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-admin-100 rounded w-16" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-admin-100 rounded-full w-20" /></td>
      <td className="px-5 py-4"><div className="h-6 bg-admin-100 rounded-lg w-8 ml-auto" /></td>
    </tr>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function StockIntakePage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  const canAct = !isSuperAdmin

  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [processTarget, setProcessTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetch = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const res = await stockIntakeService.list({
        status: params.status ?? statusFilter,
        search: params.search ?? search,
        page:   params.page   ?? page,
        limit:  20,
      })
      setRecords(res.data.data || [])
      setPagination(res.data.pagination || null)
    } catch {
      toast.error('Failed to load intake records')
    } finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { fetch() }, [fetch])

  const handleSearch = (val) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilter = (val) => {
    setStatusFilter(val)
    setPage(1)
  }

  const handleCreated = (intake) => {
    setRecords(r => [intake, ...r])
  }

  const handleProcessed = (updated) => {
    setRecords(r => r.map(x => x._id === updated._id ? updated : x))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await stockIntakeService.remove(deleteTarget._id)
      toast.success(`${deleteTarget.intakeRef} deleted`)
      setRecords(r => r.filter(x => x._id !== deleteTarget._id))
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally { setDeleting(false) }
  }

  const pendingCount = records.filter(r => r.status === 'pending').length

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {isSuperAdmin && <ViewOnlyBanner />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Stock Intake</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            Truck arrivals &amp; raw goods received
            {pendingCount > 0 && !loading && (
              <span className="ml-2 text-amber-600 font-semibold">
                {pendingCount} pending processing
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetch()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-admin-200
              rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors
              shadow-admin">
            <RefreshCw size={14} /> Refresh
          </button>
          {canAct && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white
                rounded-lg text-sm font-admin font-semibold hover:bg-brand-600
                transition-colors shadow-sm">
              <Plus size={15} /> Log Arrival
            </button>
          )}
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      {!loading && pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {[
            { icon: Truck,         label: 'Total Arrivals',   value: pagination.total,                          color: 'bg-brand-50 text-brand-600' },
            { icon: Clock,         label: 'Pending',          value: records.filter(r => r.status==='pending').length, color: 'bg-amber-50 text-amber-600' },
            { icon: CheckCircle2,  label: 'Processed',        value: records.filter(r => r.status==='processed').length, color: 'bg-green-50 text-green-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-admin-200
              shadow-admin px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={15} />
              </div>
              <div>
                <p className="text-xl font-admin font-bold text-admin-900 leading-tight">{value}</p>
                <p className="text-xs font-admin text-admin-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search ref, supplier, vehicle…"
              className="w-full pl-8 pr-3 py-2 text-sm font-admin border border-admin-200
                rounded-xl bg-admin-50 text-admin-800 placeholder-admin-400 focus:outline-none
                focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-admin-400" />
            {['', 'pending', 'processed'].map(s => (
              <button key={s || 'all'}
                onClick={() => handleStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-admin font-semibold
                  border transition-all ${
                    statusFilter === s
                      ? s === '' ? 'bg-admin-800 text-white border-admin-800'
                        : s === 'pending' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-admin-500 border-admin-200 hover:border-admin-400'
                  }`}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                {['Intake Ref', 'Supplier', 'Items', 'Status', ''].map(h => (
                  <th key={h}
                    className={`px-5 py-3.5 text-xs text-admin-500 font-semibold uppercase
                      tracking-wide text-left`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Truck size={32} className="text-admin-200 mx-auto mb-3" />
                    <p className="text-admin-500 font-admin font-medium">
                      {search || statusFilter ? 'No records match your filters' : 'No intake records yet'}
                    </p>
                    {!search && !statusFilter && canAct && (
                      <p className="text-xs font-admin text-admin-400 mt-1">
                        Log your first truck arrival to get started
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <IntakeRow
                    key={r._id}
                    intake={r}
                    onProcess={setProcessTarget}
                    onDelete={setDeleteTarget}
                    canAct={canAct}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination && pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-admin-100 bg-admin-50/40
            flex items-center justify-between">
            <p className="text-xs font-admin text-admin-400">
              Page {pagination.page} of {pagination.pages} · {pagination.total} records
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-admin-200 rounded-lg text-xs font-admin
                  text-admin-600 hover:bg-admin-50 disabled:opacity-40 transition-colors">
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 border border-admin-200 rounded-lg text-xs font-admin
                  text-admin-600 hover:bg-admin-50 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {processTarget && (
        <ProcessModal
          intake={processTarget}
          onClose={() => setProcessTarget(null)}
          onProcessed={handleProcessed}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center
          justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-admin-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-admin font-bold text-admin-900 text-sm">Delete Intake?</h3>
                <p className="text-xs font-admin text-admin-400">{deleteTarget.intakeRef}</p>
              </div>
            </div>
            <p className="text-sm font-admin text-admin-600 mb-5">
              This will permanently delete the intake record for{' '}
              <strong>{deleteTarget.supplier}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-admin
                  font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)}
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
