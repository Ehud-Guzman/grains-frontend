import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Upload, X,
  ChevronDown, ChevronUp, Save, Eye, Package, Info
} from 'lucide-react'
import { adminProductService } from '../../../services/admin/product.service'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PACKAGING_SIZES = ['45kg', '50kg', '90kg', '100kg', 'Bulk', 'Custom']
const CATEGORIES = [
  'Cereals & Grains', 'Pulses & Legumes', 'Flour & Milled Products',
  'Animal Feed & Byproducts', 'Oil Seeds & Nuts', 'Fresh Dry Food Add-ons',
  'Packaged Branded Products', 'Other'
]

const emptyPackaging = () => ({
  size: '50kg', customSize: '', priceKES: '', stock: '',
  lowStockThreshold: 10, quoteOnly: false,
  _id: Math.random().toString(36).slice(2)
})

const emptyVariety = () => ({
  varietyName: '', description: '', imageURLs: [],
  packaging: [emptyPackaging()],
  _id: Math.random().toString(36).slice(2), collapsed: false
})

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Field = ({ label, error, required, hint, children }) => (
  <div>
    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5 normal-case font-normal"> *</span>}
    </label>
    {children}
    {hint  && <p className="text-admin-400 text-xs mt-1 leading-relaxed">{hint}</p>}
    {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
  </div>
)

const Input = ({ error, className = '', ...props }) => (
  <input {...props}
    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-admin text-admin-800
      placeholder-admin-400 focus:outline-none focus:ring-2 focus:border-transparent
      transition-all bg-white ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-admin-200 focus:ring-brand-400'
      } ${className}`}
  />
)

const Select = ({ error, children, className = '', ...props }) => (
  <select {...props}
    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-admin text-admin-800
      focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-all ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-admin-200 focus:ring-brand-400'
      } ${className}`}>
    {children}
  </select>
)

// ── IMAGE UPLOADER ────────────────────────────────────────────────────────────
function ImageUploader({ images = [], onChange, label = 'Images' }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleUpload = async (files) => {
    if (!files.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('images', f))
      const res = await adminProductService.uploadImages(formData)
      onChange([...images, ...res.data.data.urls])
      toast.success(`${res.data.data.urls.length} image(s) uploaded`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <Field label={label}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-admin-200 group shadow-sm">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
        className="border-2 border-dashed border-admin-200 rounded-xl p-5 text-center
          cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-admin-500 py-1">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-admin">Uploading…</span>
          </div>
        ) : (
          <>
            <Upload size={20} className="text-admin-300 mx-auto mb-2" />
            <p className="text-xs font-admin text-admin-500">
              Drop images or <span className="text-brand-600 font-semibold">click to browse</span>
            </p>
            <p className="text-xs text-admin-400 mt-0.5">JPG, PNG, WebP · Max 5MB each</p>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handleUpload(e.target.files)} />
    </Field>
  )
}

// ── PACKAGING ROW ─────────────────────────────────────────────────────────────
function PackagingRow({ pkg, onChange, onRemove, canRemove, index }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      pkg.quoteOnly ? 'bg-admin-50 border-admin-100' : 'bg-white border-admin-200'
    }`}>
      <div className="grid grid-cols-12 gap-3 items-start">

        {/* Size selector */}
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-xs font-admin text-admin-500 mb-1.5">
            Size <span className="text-red-400">*</span>
          </label>
          <Select value={pkg.size}
            onChange={e => onChange({ ...pkg, size: e.target.value,
              quoteOnly: e.target.value === 'Bulk' ? true : pkg.quoteOnly })}>
            {PACKAGING_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          {pkg.size === 'Custom' && (
            <Input className="mt-2" placeholder="e.g. 25kg"
              value={pkg.customSize}
              onChange={e => onChange({ ...pkg, customSize: e.target.value })} />
          )}
        </div>

        {/* Price */}
        <div className="col-span-6 sm:col-span-3">
          <label className="block text-xs font-admin text-admin-500 mb-1.5">Price (KES)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-400 text-xs font-admin">KES</span>
            <Input type="number" min="0" placeholder="3,800"
              value={pkg.priceKES}
              onChange={e => onChange({ ...pkg, priceKES: e.target.value })}
              disabled={pkg.quoteOnly}
              className={`pl-10 ${pkg.quoteOnly ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {/* Stock */}
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-xs font-admin text-admin-500 mb-1.5">Stock (bags)</label>
          <Input type="number" min="0" placeholder="0"
            value={pkg.stock}
            onChange={e => onChange({ ...pkg, stock: e.target.value })}
            disabled={pkg.quoteOnly}
            className={pkg.quoteOnly ? 'opacity-40 cursor-not-allowed' : ''}
          />
        </div>

        {/* Low stock alert */}
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-xs font-admin text-admin-500 mb-1.5">Alert below</label>
          <Input type="number" min="0" placeholder="10"
            value={pkg.lowStockThreshold}
            onChange={e => onChange({ ...pkg, lowStockThreshold: e.target.value })}
          />
        </div>

        {/* Quote only + remove */}
        <div className="col-span-6 sm:col-span-2 flex flex-col gap-2.5 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => onChange({ ...pkg, quoteOnly: !pkg.quoteOnly })}
              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0
                border-2 transition-all cursor-pointer ${
                  pkg.quoteOnly
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-admin-300 hover:border-brand-400'
                }`}>
              {pkg.quoteOnly && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs font-admin text-admin-600">Quote only</span>
          </label>

          {canRemove && (
            <button type="button" onClick={onRemove}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700
                font-admin transition-colors">
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      {pkg.quoteOnly && (
        <p className="text-xs text-admin-400 font-admin mt-2 flex items-center gap-1">
          <Info size={11} />
          Customers will see a "Request a Quote" button instead of a price
        </p>
      )}
    </div>
  )
}

// ── VARIETY SECTION ───────────────────────────────────────────────────────────
function VarietySection({ variety, index, onChange, onRemove, canRemove, errors }) {
  const updatePackaging = (pkgId, updates) =>
    onChange({ ...variety, packaging: variety.packaging.map(p => p._id === pkgId ? { ...p, ...updates } : p) })

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      errors ? 'border-red-300' : 'border-admin-200'
    }`}>

      {/* Header */}
      <div
        onClick={() => onChange({ ...variety, collapsed: !variety.collapsed })}
        className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${
          variety.collapsed ? 'bg-white hover:bg-admin-50' : 'bg-admin-50 border-b border-admin-200'
        } ${errors ? 'bg-red-50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs font-admin ${
            errors ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-700'
          }`}>
            {index + 1}
          </div>
          <div>
            <p className="font-admin font-semibold text-admin-800 text-sm">
              {variety.varietyName || `Variety ${index + 1}`}
            </p>
            <p className="text-admin-400 text-xs mt-0.5">
              {variety.packaging.length} size{variety.packaging.length !== 1 ? 's' : ''}
              {errors && <span className="text-red-500 ml-2">— has errors</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {canRemove && (
            <button type="button"
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-admin-400 hover:text-red-500 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
          {variety.collapsed
            ? <ChevronDown size={16} className="text-admin-400" />
            : <ChevronUp size={16} className="text-admin-400" />
          }
        </div>
      </div>

      {/* Body */}
      {!variety.collapsed && (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Variety Name" required error={errors?.varietyName}>
              <Input placeholder="e.g. Yellow Maize"
                value={variety.varietyName}
                onChange={e => onChange({ ...variety, varietyName: e.target.value })}
                error={errors?.varietyName}
                autoFocus={!variety.varietyName} />
            </Field>
            <Field label="Description">
              <Input placeholder="Optional — shown on product page"
                value={variety.description}
                onChange={e => onChange({ ...variety, description: e.target.value })} />
            </Field>
          </div>

          <ImageUploader
            label="Variety Images"
            images={variety.imageURLs}
            onChange={urls => onChange({ ...variety, imageURLs: urls })} />

          {/* Packaging */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide">
                Packaging Sizes <span className="text-red-400">*</span>
              </label>
              <button type="button"
                onClick={() => onChange({ ...variety, packaging: [...variety.packaging, emptyPackaging()] })}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700
                  font-admin font-medium transition-colors">
                <Plus size={13} /> Add Size
              </button>
            </div>

            {errors?.packaging && (
              <p className="text-red-500 text-xs mb-3 font-medium">{errors.packaging}</p>
            )}

            <div className="space-y-2">
              {variety.packaging.map((pkg, i) => (
                <PackagingRow key={pkg._id} pkg={pkg} index={i}
                  onChange={updates => updatePackaging(pkg._id, updates)}
                  onRemove={() => onChange({ ...variety, packaging: variety.packaging.filter(p => p._id !== pkg._id) })}
                  canRemove={variety.packaging.length > 1}
                />
              ))}
            </div>

            <button type="button"
              onClick={() => onChange({ ...variety, packaging: [...variety.packaging, emptyPackaging()] })}
              className="mt-2 w-full py-2 border-2 border-dashed border-admin-200 rounded-xl
                text-xs font-admin text-admin-400 hover:border-brand-300 hover:text-brand-600
                hover:bg-brand-50 transition-all flex items-center justify-center gap-1.5">
              <Plus size={13} /> Add Another Size
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN FORM ─────────────────────────────────────────────────────────────────
export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [loading, setLoading]   = useState(isEdit)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState({})
  const [form, setForm]         = useState({
    name: '', category: '', customCategory: '',
    description: '', imageURLs: [], isActive: false,
    varieties: [emptyVariety()]
  })

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      try {
        const res = await adminProductService.getById(id)
        const p = res.data.data
        setForm({
          name:           p.name || '',
          category:       CATEGORIES.includes(p.category) ? p.category : 'Other',
          customCategory: CATEGORIES.includes(p.category) ? '' : p.category,
          description:    p.description || '',
          imageURLs:      p.imageURLs || [],
          isActive:       p.isActive || false,
          varieties: (p.varieties || []).map(v => ({
            ...v,
            _id: v._id || Math.random().toString(36).slice(2),
            collapsed: true,
            packaging: (v.packaging || []).map(pkg => ({
              ...pkg,
              _id: pkg._id || Math.random().toString(36).slice(2),
              customSize: PACKAGING_SIZES.includes(pkg.size) ? '' : pkg.size,
              size: PACKAGING_SIZES.includes(pkg.size) ? pkg.size : 'Custom',
              priceKES: pkg.priceKES ?? '',
              stock: pkg.stock ?? '',
              lowStockThreshold: pkg.lowStockThreshold ?? 10,
              quoteOnly: pkg.quoteOnly || false
            }))
          }))
        })
      } catch {
        toast.error('Failed to load product')
        navigate('/admin/products')
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.category) e.category = 'Category is required'
    if (form.category === 'Other' && !form.customCategory.trim()) e.customCategory = 'Please specify the category'

    const ve = {}
    form.varieties.forEach((v, i) => {
      const err = {}
      if (!v.varietyName.trim()) err.varietyName = 'Variety name is required'
      v.packaging.forEach((pkg, j) => {
        if (pkg.size === 'Custom' && !pkg.customSize.trim())
          err.packaging = `Size ${j+1}: custom label required`
        if (!pkg.quoteOnly && !pkg.priceKES)
          err.packaging = err.packaging || `Size ${j+1}: price required (or tick Quote Only)`
      })
      if (Object.keys(err).length) ve[i] = err
    })
    if (Object.keys(ve).length) e.varieties = ve
    if (!form.varieties.length) e.varietiesEmpty = 'At least one variety is required'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = (isActive) => ({
    name: form.name.trim(),
    category: form.category === 'Other' ? form.customCategory.trim() : form.category,
    description: form.description.trim(),
    imageURLs: form.imageURLs,
    isActive,
    varieties: form.varieties.map(v => ({
      varietyName: v.varietyName.trim(),
      description: v.description.trim(),
      imageURLs: v.imageURLs,
      packaging: v.packaging.map(pkg => ({
        size: pkg.size === 'Custom' ? pkg.customSize.trim() : pkg.size,
        priceKES: pkg.quoteOnly ? null : (Number(pkg.priceKES) || null),
        stock: pkg.quoteOnly ? null : (Number(pkg.stock) || 0),
        lowStockThreshold: Number(pkg.lowStockThreshold) || 10,
        quoteOnly: pkg.quoteOnly
      }))
    }))
  })

  const handleSubmit = async (activate) => {
    if (!validate()) {
      toast.error('Please fix the errors before saving')
      const errorIdxs = Object.keys(errors.varieties || {}).map(Number)
      setForm(f => ({
        ...f,
        varieties: f.varieties.map((v, i) => errorIdxs.includes(i) ? { ...v, collapsed: false } : v)
      }))
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await adminProductService.update(id, buildPayload(activate))
        toast.success('Product updated')
      } else {
        await adminProductService.create(buildPayload(activate))
        toast.success(activate ? 'Product created and activated' : 'Saved as draft')
      }
      navigate('/admin/products')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product')
    } finally { setSaving(false) }
  }

  const updateVariety = (varId, updates) =>
    setForm(f => ({ ...f, varieties: f.varieties.map(v => v._id === varId ? { ...v, ...updates } : v) }))

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto pb-28">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products"
          className="flex items-center gap-1.5 text-admin-500 hover:text-admin-700 text-sm font-admin transition-colors">
          <ArrowLeft size={15} /> Products
        </Link>
        <span className="text-admin-300 text-sm">/</span>
        <h1 className="text-xl font-admin font-bold text-admin-900">
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <div className="space-y-5">

        {/* ── BASIC INFO ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
              <Package size={14} className="text-brand-600" />
            </div>
            <h2 className="font-admin font-bold text-admin-900">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Product Name" required error={errors.name}>
              <Input placeholder="e.g. Maize" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                error={errors.name} autoFocus />
            </Field>

            <Field label="Category" required error={errors.category || errors.customCategory}>
              <Select value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                error={errors.category}>
                <option value="">Select a category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
              {form.category === 'Other' && (
                <Input className="mt-2" placeholder="Enter category name"
                  value={form.customCategory}
                  onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))}
                  error={errors.customCategory} />
              )}
            </Field>
          </div>

          <Field label="Description" hint="Optional — shown on the customer product page">
            <textarea rows={3} placeholder="Describe this product…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm font-admin
                text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
                focus:ring-brand-400 focus:border-transparent resize-none bg-white transition-all"
            />
          </Field>

          <div className="mt-4">
            <ImageUploader label="Product Images (shown when no variety image)"
              images={form.imageURLs}
              onChange={urls => setForm(f => ({ ...f, imageURLs: urls }))} />
          </div>
        </div>

        {/* ── VARIETIES ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xs font-bold font-admin">V</span>
              </div>
              <div>
                <h2 className="font-admin font-bold text-admin-900">Varieties & Packaging</h2>
                <p className="text-admin-400 text-xs font-admin mt-0.5">
                  {form.varieties.length} variet{form.varieties.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, varieties: [...f.varieties, emptyVariety()] }))}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg
                text-sm font-admin font-medium hover:bg-purple-100 transition-colors">
              <Plus size={14} /> Add Variety
            </button>
          </div>

          {errors.varietiesEmpty && (
            <p className="text-red-500 text-sm mb-3 font-admin">{errors.varietiesEmpty}</p>
          )}

          <div className="space-y-3">
            {form.varieties.map((variety, index) => (
              <VarietySection key={variety._id} variety={variety} index={index}
                onChange={updates => updateVariety(variety._id, updates)}
                onRemove={() => setForm(f => ({ ...f, varieties: f.varieties.filter(v => v._id !== variety._id) }))}
                canRemove={form.varieties.length > 1}
                errors={errors.varieties?.[index]}
              />
            ))}
          </div>

          <button type="button"
            onClick={() => setForm(f => ({ ...f, varieties: [...f.varieties, emptyVariety()] }))}
            className="mt-3 w-full py-3 border-2 border-dashed border-admin-200 rounded-xl
              text-sm font-admin text-admin-400 hover:border-brand-300 hover:text-brand-600
              hover:bg-brand-50 transition-all flex items-center justify-center gap-2">
            <Plus size={15} /> Add Another Variety
          </button>
        </div>

        {/* ── PRICING NOTE ────────────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-admin text-amber-800 leading-relaxed">
            <strong className="font-semibold">Pricing per size:</strong> Each variety has independent pricing per packaging size.
            Set <strong>Quote Only</strong> on Bulk sizes — customers see "Request a Quote" instead of a price.
            Prices of <strong>0</strong> or empty will show as "Contact us".
          </p>
        </div>
      </div>

      {/* ── STICKY SAVE BAR ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-admin-200 px-6 py-4 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Link to="/admin/products"
            className="px-4 py-2.5 border border-admin-200 text-admin-600 rounded-xl text-sm
              font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </Link>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleSubmit(false)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-admin-200 text-admin-700
                rounded-xl text-sm font-admin font-medium hover:bg-admin-50 transition-colors disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>

            <button type="button" onClick={() => handleSubmit(true)} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl
                text-sm font-admin font-semibold hover:bg-brand-600 transition-all
                disabled:opacity-50 shadow-admin active:scale-[0.98]">
              <Eye size={14} />
              {saving ? 'Saving…' : isEdit ? 'Save & Activate' : 'Create & Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}