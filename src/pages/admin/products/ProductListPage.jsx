import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Edit, Copy, Trash2, ToggleLeft, ToggleRight,
  Download, Upload, FileSpreadsheet, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Package
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { adminProductService } from '../../../services/admin/product.service'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import SearchAutocomplete from '../../../components/ui/SearchAutocomplete'
import ViewOnlyBanner from '../../../components/admin/ViewOnlyBanner'

// ── SKELETON ROW ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-admin-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-admin-100 rounded-xl flex-shrink-0" />
          <div className="h-4 bg-admin-100 rounded w-32" />
        </div>
      </td>
      <td className="px-5 py-4 hidden sm:table-cell"><div className="h-4 bg-admin-100 rounded w-28" /></td>
      <td className="px-5 py-4 hidden md:table-cell"><div className="h-4 bg-admin-100 rounded w-6 mx-auto" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-admin-100 rounded-full w-14 mx-auto" /></td>
      <td className="px-5 py-4"><div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className="w-7 h-7 bg-admin-100 rounded-lg" />)}</div></td>
    </tr>
  )
}

// ── IMPORT RESULT MODAL ───────────────────────────────────────────────────────
function ImportResultModal({ result, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-admin-lg border border-admin-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            <h3 className="font-admin font-bold text-admin-900">Import Complete</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Created', value: result.created, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', sub: 'text-green-600' },
              { label: 'Updated', value: result.updated, bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  sub: 'text-blue-600'  },
              { label: 'Skipped', value: result.skipped, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', sub: 'text-amber-600' },
            ].map(({ label, value, bg, border, text, sub }) => (
              <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-admin font-bold ${text}`}>{value}</p>
                <p className={`text-xs font-admin font-medium ${sub} mt-1`}>{label}</p>
              </div>
            ))}
          </div>

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-admin font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertCircle size={13} /> {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} with errors
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs font-admin text-red-600 leading-relaxed">
                    {e.row ? `Row ${e.row}: ` : e.product ? `${e.product}: ` : ''}{e.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full py-3 bg-earth-900 text-white rounded-xl text-sm font-admin font-semibold hover:bg-earth-800 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportPreviewModal({ result, importing, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-admin-lg border border-admin-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-brand-600" />
            <h3 className="font-admin font-bold text-admin-900">Import Preview</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Create', value: result.created, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', sub: 'text-green-600' },
              { label: 'Update', value: result.updated, bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  sub: 'text-blue-600'  },
              { label: 'Skip',   value: result.skipped, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', sub: 'text-amber-600' },
            ].map(({ label, value, bg, border, text, sub }) => (
              <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-admin font-bold ${text}`}>{value}</p>
                <p className={`text-xs font-admin font-medium ${sub} mt-1`}>{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-admin-50 border border-admin-200 rounded-xl p-4">
            <p className="text-xs font-admin font-semibold text-admin-700 mb-2">Target Branches</p>
            <div className="flex flex-wrap gap-2">
              {(result.importedToBranches || []).map((branch) => (
                <span key={branch.id} className="px-2.5 py-1 rounded-full bg-white border border-admin-200 text-xs font-admin text-admin-600">
                  {branch.name}
                </span>
              ))}
            </div>
          </div>

          {result.preview?.length > 0 && (
            <div className="border border-admin-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-admin-50 border-b border-admin-200">
                <p className="text-xs font-admin font-semibold text-admin-700">
                  Planned Changes
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-admin-100">
                {result.preview.map((item, index) => (
                  <div key={`${item.branch}-${item.productName}-${index}`} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-admin font-semibold text-admin-800">{item.productName}</p>
                      <p className="text-xs text-admin-400 font-admin mt-0.5">
                        {item.branch} · {item.varieties} variet{item.varieties === 1 ? 'y' : 'ies'} · {item.packagingCount} package row{item.packagingCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-admin font-semibold border ${
                      item.action === 'create'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.action === 'create' ? 'Create' : 'Update'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-admin font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertCircle size={13} /> {result.errors.length} issue{result.errors.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs font-admin text-red-600 leading-relaxed">
                    {e.row ? `Row ${e.row}: ` : e.product ? `${e.product}: ` : ''}{e.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-admin-200 text-admin-700 rounded-xl text-sm font-admin font-semibold hover:bg-admin-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={importing}
            className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing…' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BULK PANEL ────────────────────────────────────────────────────────────────
function BulkPanel({ onImportDone }) {
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const submitImport = async (file, { dryRun = false } = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    if (dryRun) formData.append('dryRun', 'true')

    return api.post('/admin/products/import', formData, {
      timeout: 120000
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get('/admin/products/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `vittorios-products-${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Products exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handleTemplate = async () => {
    try {
      const res = await api.get('/admin/products/template', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'product-import-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch { toast.error('Download failed') }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewing(true)
    try {
      const res = await submitImport(file, { dryRun: true })
      setSelectedFile(file)
      setImportPreview(res.data.data)
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally { setPreviewing(false); e.target.value = '' }
  }

  const confirmImport = async () => {
    if (!selectedFile) return

    setImporting(true)
    try {
      const res = await submitImport(selectedFile)
      onImportDone(res.data.data)
      toast.success(res.data.message)
      setImportPreview(null)
      setSelectedFile(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-white border border-admin-200 rounded-xl shadow-admin mb-4 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-admin-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
            <FileSpreadsheet size={14} className="text-brand-600" />
          </div>
          <div className="text-left">
            <p className="font-admin font-semibold text-admin-800 text-sm">Bulk Import / Export</p>
            <p className="text-xs text-admin-400 font-admin">Add or update products via Excel</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-admin-400" /> : <ChevronDown size={16} className="text-admin-400" />}
      </button>

      {open && (
        <div className="border-t border-admin-100 px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Export */}
            <div className="bg-admin-50 rounded-xl p-4 border border-admin-200">
              <div className="flex items-center gap-2 mb-1.5">
                <Download size={15} className="text-blue-600" />
                <p className="font-admin font-semibold text-admin-800 text-sm">Export Products</p>
              </div>
              <p className="text-admin-400 text-xs font-admin mb-3 leading-relaxed">
                Download all products as Excel. Edit prices or stock then re-import.
              </p>
              <button onClick={handleExport} disabled={exporting}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-admin font-semibold
                  hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                <Download size={12} />
                {exporting ? 'Exporting…' : 'Download Excel'}
              </button>
            </div>

            {/* Template */}
            <div className="bg-admin-50 rounded-xl p-4 border border-admin-200">
              <div className="flex items-center gap-2 mb-1.5">
                <FileSpreadsheet size={15} className="text-green-600" />
                <p className="font-admin font-semibold text-admin-800 text-sm">Get Template</p>
              </div>
              <p className="text-admin-400 text-xs font-admin mb-3 leading-relaxed">
                Blank Excel template with correct column format and sample data.
              </p>
              <button onClick={handleTemplate}
                className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-admin font-semibold
                  hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
                <FileSpreadsheet size={12} />
                Download Template
              </button>
            </div>

            {/* Import */}
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
              <div className="flex items-center gap-2 mb-1.5">
                <Upload size={15} className="text-brand-600" />
                <p className="font-admin font-semibold text-admin-800 text-sm">Import Products</p>
              </div>
              <p className="text-admin-400 text-xs font-admin mb-3 leading-relaxed">
                Upload a filled Excel file. Existing products update, new ones are created.
              </p>
              <label className={`w-full py-2 rounded-lg text-xs font-admin font-semibold transition-colors
                flex items-center justify-center gap-1.5 cursor-pointer
                ${(importing || previewing) ? 'bg-brand-300 text-white cursor-not-allowed' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>
                {previewing ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Previewing…</>
                ) : importing ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing…</>
                ) : (
                  <><Upload size={12} /> Preview Excel</>
                )}
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importing || previewing} onChange={handleImport} />
              </label>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs font-admin text-amber-700">
            <strong>Matching:</strong> Products are matched by name. Same name = update. New name = create.
            Download the template to see the correct column format before importing.
          </div>
        </div>
      )}

      {importPreview && (
        <ImportPreviewModal
          result={importPreview}
          importing={importing}
          onConfirm={confirmImport}
          onClose={() => {
            if (importing) return
            setImportPreview(null)
            setSelectedFile(null)
          }}
        />
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProductListPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // product._id

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter
      const res = await adminProductService.getAll(params)
      let data = res.data.data || []
      if (statusFilter === 'active')   data = data.filter(p => p.isActive)
      if (statusFilter === 'inactive') data = data.filter(p => !p.isActive)
      setProducts(data)
    } catch {}
    finally { setLoading(false) }
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  // Derive categories from loaded products for filter pills
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))]

  const handleToggle = async (id) => {
    try {
      const res = await adminProductService.toggleActive(id)
      toast.success(res.data.data.isActive ? 'Product activated' : 'Product deactivated')
      fetchProducts()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleDuplicate = async (id) => {
    try {
      await adminProductService.duplicate(id)
      toast.success('Duplicated as draft')
      fetchProducts()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleDelete = async (id) => {
    setConfirmDelete(null)
    try {
      await adminProductService.delete(id)
      toast.success('Product deleted')
      fetchProducts()
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete — product has orders') }
  }

  const activeCount   = products.filter(p => p.isActive).length
  const inactiveCount = products.filter(p => !p.isActive).length

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {isSuperAdmin && <ViewOnlyBanner />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Products</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {products.length} product{products.length !== 1 ? 's' : ''}
            {activeCount > 0 && <span className="ml-2 text-green-600 font-semibold">{activeCount} active</span>}
            {inactiveCount > 0 && <span className="ml-1.5 text-admin-400">{inactiveCount} draft</span>}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link to="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
              text-sm font-admin font-semibold hover:bg-brand-600 transition-colors shadow-admin">
            <Plus size={16} /> Add Product
          </Link>
        )}
      </div>

      {/* ── Bulk panel ─────────────────────────────────────────────────── */}
      {!isSuperAdmin && <BulkPanel onImportDone={(result) => { setImportResult(result); fetchProducts() }} />}

      {/* ── Status + search bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4 space-y-3">
        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '',         label: 'All' },
            { value: 'active',   label: 'Active' },
            { value: 'inactive', label: 'Draft' },
          ].map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold border transition-all ${
                statusFilter === f.value
                  ? 'bg-admin-900 text-orange-500 border-admin-900 shadow-sm'
                  : 'bg-white text-admin-500 border-admin-200 hover:border-admin-400 hover:text-admin-700'
              }`}>
              {f.label}
            </button>
          ))}

          {allCategories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(c => c === cat ? '' : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold border transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-admin-400 border-admin-200 hover:border-brand-300 hover:text-brand-600'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Search with autocomplete */}
        <SearchAutocomplete
          value={search}
          onChange={setSearch}
          onSearch={setSearch}
          placeholder="Search products by name…"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                <th className="px-5 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Product
                </th>
                <th className="px-5 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide hidden sm:table-cell">
                  Category
                </th>
                <th className="px-5 py-3.5 text-center text-xs text-admin-500 font-semibold uppercase tracking-wide hidden md:table-cell">
                  Varieties
                </th>
                <th className="px-5 py-3.5 text-center text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5 text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Package size={28} className="text-admin-300 mx-auto mb-3" />
                    <p className="text-admin-500 font-admin font-medium mb-1">No products found</p>
                    <p className="text-admin-400 text-xs mb-4">
                      {search || categoryFilter || statusFilter ? 'Try adjusting your filters' : 'Add your first product to get started'}
                    </p>
                    {!search && !categoryFilter && !statusFilter && (
                      <Link to="/admin/products/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white
                          rounded-lg text-sm font-admin font-medium hover:bg-brand-600 transition-colors">
                        <Plus size={15} /> Add Product
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const image = product.varieties?.[0]?.imageURLs?.[0] || product.imageURLs?.[0]
                  return (
                    <tr key={product._id} className="hover:bg-admin-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-earth-50 rounded-xl overflow-hidden flex-shrink-0 border border-admin-100">
                            {image ? (
                              <img src={image} alt={product.name}
                                className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🌾</div>
                            )}
                          </div>
                          <div>
                            <p className="font-admin font-semibold text-admin-800">{product.name}</p>
                            <p className="text-admin-400 text-xs sm:hidden mt-0.5">{product.category}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-admin-600 font-admin">{product.category}</span>
                      </td>

                      <td className="px-5 py-4 text-center hidden md:table-cell">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-admin-100
                          text-admin-600 text-xs font-bold font-admin rounded-full">
                          {product.varieties?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {isSuperAdmin ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                            px-2.5 py-1 rounded-full border ${
                              product.isActive
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-admin-50 text-admin-500 border-admin-200'
                            }`}>
                            {product.isActive
                              ? <><ToggleRight size={13} /> Active</>
                              : <><ToggleLeft size={13} /> Draft</>
                            }
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggle(product._id)}
                            className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                              px-2.5 py-1 rounded-full border transition-all ${
                                product.isActive
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  : 'bg-admin-50 text-admin-500 border-admin-200 hover:bg-admin-100'
                              }`}
                            title={product.isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {product.isActive
                              ? <><ToggleRight size={13} /> Active</>
                              : <><ToggleLeft size={13} /> Draft</>
                            }
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {!isSuperAdmin && (
                          <div className="flex items-center gap-0.5">
                            <Link to={`/admin/products/${product._id}/edit`}
                              className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-700
                                transition-colors" title="Edit">
                              <Edit size={15} />
                            </Link>
                            <button onClick={() => handleDuplicate(product._id)}
                              className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-blue-600
                                transition-colors" title="Duplicate">
                              <Copy size={15} />
                            </button>
                            {confirmDelete === product._id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(product._id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs
                                    font-admin font-semibold hover:bg-red-700 transition-colors">
                                  Delete
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 text-admin-500 rounded-lg text-xs font-admin
                                    hover:bg-admin-100 transition-colors">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(product._id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-admin-400 hover:text-red-600
                                  transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && products.length > 0 && (
          <div className="px-5 py-3 border-t border-admin-100 bg-admin-50/40">
            <p className="text-xs font-admin text-admin-400">
              {products.length} product{products.length !== 1 ? 's' : ''} shown
              {(search || categoryFilter || statusFilter) && ' — filtered'}
            </p>
          </div>
        )}
      </div>

      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => { setImportResult(null); fetchProducts() }}
        />
      )}
    </div>
  )
}
