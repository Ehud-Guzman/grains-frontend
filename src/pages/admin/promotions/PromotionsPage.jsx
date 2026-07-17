import { useState, useEffect, useRef } from 'react'
import { Plus, Megaphone, Trash2, Edit2, X, Upload, Image as ImageIcon, Video, Search, Play, ArrowRight, Tag, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { promotionService } from '../../../services/promotion.service'
import { adminProductService } from '../../../services/admin/product.service'
import { formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'

const TYPES = [
  { value: 'banner',           label: 'Banner'           },
  { value: 'featured_product', label: 'Featured Product' },
  { value: 'seasonal',         label: 'Seasonal'         },
  { value: 'tip',              label: 'Tip'              },
]

const SEASON_TAGS = [
  { value: 'harvesting',   label: 'Harvesting Season'   },
  { value: 'drought',      label: 'Drought Period'      },
  { value: 'planting',     label: 'Planting Season'     },
  { value: 'import_hike',  label: 'Import Price Hike'   },
  { value: 'normal',       label: 'Normal'              },
]

const fieldClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
  font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
  focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

const EMPTY_FORM = {
  title: '', description: '', imageUrl: '', mediaType: 'image', videoUrl: '',
  type: 'banner', linkedProductId: '', startDate: '', endDate: '',
  seasonTag: '', sortOrder: 0, isActive: true,
}

// Only banner/seasonal types render as the storefront hero carousel — other
// types (featured_product, tip) don't use the media/preview at all, so the
// preview panel and media pickers only matter for those two.
const MEDIA_TYPES = ['banner', 'seasonal']

// ── PRODUCT PICKER (searchable, replaces the old raw ObjectId text field) ────
function ProductPicker({ value, label, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      adminProductService.getAll({ search: query.trim(), limit: 6 })
        .then(res => setResults(res.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  if (value && label) {
    return (
      <div className="flex items-center gap-2 border border-admin-200 rounded-xl px-3.5 py-2.5 bg-admin-50">
        <Package size={14} className="text-brand-500 flex-shrink-0" />
        <span className="text-sm font-admin text-admin-800 font-medium truncate flex-1">{label}</span>
        <button type="button" onClick={() => onChange(null)}
          className="text-admin-400 hover:text-red-500 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admin-400" />
        <input
          className={`${fieldClass} pl-9`}
          placeholder="Search products to link…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && query.trim() && (
        <div className="absolute z-10 mt-1.5 w-full bg-white border border-admin-200 rounded-xl shadow-admin-lg max-h-56 overflow-y-auto">
          {searching ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : results.length === 0 ? (
            <p className="text-xs font-admin text-admin-400 text-center py-4">No products found</p>
          ) : (
            results.map(p => (
              <button key={p._id} type="button"
                onClick={() => { onChange({ id: p._id, name: p.name }); setQuery(''); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-admin-50 transition-colors">
                <Package size={13} className="text-admin-300 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-admin text-admin-800 truncate">{p.name}</p>
                  <p className="text-xs font-admin text-admin-400 truncate">{p.category}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── LIVE BANNER PREVIEW (mirrors the real public PromoBannerCarousel look) ──
function BannerPreview({ form }) {
  const hasMedia = form.mediaType === 'video' ? form.videoUrl : form.imageUrl

  return (
    // Fallback gradient must match the public PromoBannerCarousel's exactly
    <div className="relative rounded-xl overflow-hidden shadow-md h-40 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900">
      {hasMedia && form.mediaType === 'image' && (
        <>
          <img src={form.imageUrl} alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: 'blur(14px) brightness(0.4) saturate(1.3)' }} />
          <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
            <img src={form.imageUrl} alt="" className="h-[85%] w-auto max-w-[42%] object-contain drop-shadow-2xl" />
          </div>
        </>
      )}
      {hasMedia && form.mediaType === 'video' && (
        <video src={form.videoUrl} muted loop autoPlay playsInline poster={form.imageUrl || undefined}
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

      <div className="relative h-full px-5 flex flex-col justify-center max-w-[75%]">
        {form.seasonTag && (
          <span className="inline-flex items-center gap-1 self-start mb-1.5 text-[9px] font-body
            font-bold uppercase tracking-widest text-white/60">
            <Tag size={8} /> {form.seasonTag.replace(/_/g, ' ')}
          </span>
        )}
        <h3 className="font-display text-lg font-bold text-white leading-tight mb-1 truncate">
          {form.title || 'Promotion title'}
        </h3>
        {form.description && (
          <p className="font-body text-white/75 text-xs mb-2.5 leading-relaxed line-clamp-2">
            {form.description}
          </p>
        )}
        <span className="self-start inline-flex items-center gap-1.5 bg-white/95 text-earth-900
          font-body font-bold px-3 py-1.5 rounded-lg text-xs shadow">
          {form.linkedProductId ? 'Shop Now' : 'Browse'} <ArrowRight size={11} />
        </span>
      </div>

      {form.mediaType === 'video' && form.videoUrl && (
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white
          text-[9px] font-body font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          <Play size={8} fill="currentColor" /> Video
        </span>
      )}
      {!hasMedia && (
        <p className="absolute bottom-2 right-3 text-[9px] font-body text-white/40 uppercase tracking-widest">
          No media — solid background will show
        </p>
      )}
    </div>
  )
}

function PromoModal({ promo, onClose, onSaved }) {
  const isEdit = !!promo
  const [form, setForm] = useState(isEdit ? {
    ...EMPTY_FORM,
    ...promo,
    mediaType: promo.mediaType || 'image',
    videoUrl: promo.videoUrl || '',
    linkedProductId: promo.linkedProductId?._id || promo.linkedProductId || '',
    startDate: promo.startDate ? promo.startDate.slice(0, 10) : '',
    endDate: promo.endDate ? promo.endDate.slice(0, 10) : '',
    seasonTag: promo.seasonTag || '',
  } : EMPTY_FORM)
  const [linkedProductLabel, setLinkedProductLabel] = useState(
    isEdit && promo.linkedProductId?.name ? promo.linkedProductId.name : ''
  )
  const [saving, setSaving] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [vidUploading, setVidUploading] = useState(false)
  const fileRef = useRef(null)
  const videoFileRef = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgUploading(true)
    try {
      const res = await promotionService.uploadImage(file)
      set('imageUrl', res.data.data.url)
    } catch {
      toast.error('Image upload failed')
    } finally {
      setImgUploading(false)
      e.target.value = ''
    }
  }

  const handleVideoPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVidUploading(true)
    try {
      const res = await promotionService.uploadVideo(file)
      set('videoUrl', res.data.data.url)
      // Cloudinary's auto-generated video thumbnail doubles as the <video> poster
      // and as a fallback image if the admin ever switches back to Image mode.
      if (res.data.data.thumbnailUrl) set('imageUrl', res.data.data.thumbnailUrl)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Video upload failed')
    } finally {
      setVidUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        linkedProductId: form.linkedProductId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        seasonTag: form.seasonTag || null,
        sortOrder: Number(form.sortOrder) || 0,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
      }
      if (isEdit) await promotionService.update(promo._id, payload)
      else await promotionService.create(payload)
      toast.success(isEdit ? 'Promotion updated' : 'Promotion created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const showMedia = MEDIA_TYPES.includes(form.type)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-admin-lg border border-admin-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Megaphone size={15} className="text-brand-600" />
            </div>
            <p className="font-admin font-bold text-admin-800 text-sm">
              {isEdit ? `Edit ${promo.title}` : 'Create Promotion'}
            </p>
          </div>
          <button onClick={onClose} className="text-admin-400 hover:text-admin-700 p-1 rounded-lg hover:bg-admin-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {showMedia && (
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">
                Live Preview
              </label>
              <BannerPreview form={form} />
            </div>
          )}

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Title</label>
            <input className={fieldClass} placeholder="Harvest Season Sale" value={form.title}
              onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea className={fieldClass} rows={2} placeholder="Optional description or call to action"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select className={fieldClass} value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Season Tag</label>
              <select className={fieldClass} value={form.seasonTag} onChange={e => set('seasonTag', e.target.value)}>
                <option value="">None</option>
                {SEASON_TAGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {showMedia && (
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Media</label>

              {/* Image / Video toggle */}
              <div className="flex gap-1.5 mb-2.5 bg-admin-100 rounded-xl p-1 w-fit">
                {[{ v: 'image', icon: ImageIcon, label: 'Image' }, { v: 'video', icon: Video, label: 'Video' }].map(({ v, icon: Icon, label }) => (
                  <button key={v} type="button" onClick={() => set('mediaType', v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-admin font-semibold transition-colors ${
                      form.mediaType === v ? 'bg-white text-brand-700 shadow-sm' : 'text-admin-500 hover:text-admin-700'
                    }`}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {form.mediaType === 'image' ? (
                <>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                    className="hidden" onChange={handleImagePick} />
                  {form.imageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-admin-200 bg-admin-50">
                      <img src={form.imageUrl} alt="" className="w-full h-32 object-cover" />
                      <button type="button" onClick={() => set('imageUrl', '')}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80
                          rounded-full flex items-center justify-center text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={imgUploading}
                      className="w-full h-24 border-2 border-dashed border-admin-200 rounded-xl flex flex-col
                        items-center justify-center gap-1.5 text-admin-400 hover:border-brand-300
                        hover:text-brand-500 transition-colors disabled:opacity-50 bg-admin-50">
                      {imgUploading
                        ? <><Spinner size="sm" /><span className="text-xs font-admin">Uploading…</span></>
                        : <><Upload size={18} /><span className="text-xs font-admin">Click to upload image</span><span className="text-[10px] font-admin text-admin-300">JPEG, PNG or WebP · max 5 MB</span></>
                      }
                    </button>
                  )}
                </>
              ) : (
                <>
                  <input ref={videoFileRef} type="file" accept="video/mp4,video/webm,video/quicktime"
                    className="hidden" onChange={handleVideoPick} />
                  {form.videoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-admin-200 bg-admin-900">
                      <video src={form.videoUrl} className="w-full h-32 object-cover" muted loop autoPlay playsInline />
                      <button type="button" onClick={() => set('videoUrl', '')}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80
                          rounded-full flex items-center justify-center text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => videoFileRef.current?.click()} disabled={vidUploading}
                      className="w-full h-24 border-2 border-dashed border-admin-200 rounded-xl flex flex-col
                        items-center justify-center gap-1.5 text-admin-400 hover:border-brand-300
                        hover:text-brand-500 transition-colors disabled:opacity-50 bg-admin-50">
                      {vidUploading
                        ? <><Spinner size="sm" /><span className="text-xs font-admin">Uploading…</span></>
                        : <><Video size={18} /><span className="text-xs font-admin">Click to upload video</span><span className="text-[10px] font-admin text-admin-300">MP4, WebM or MOV · max 25 MB</span></>
                      }
                    </button>
                  )}
                  <p className="text-[10px] font-admin text-admin-400 mt-1.5 leading-relaxed">
                    Plays muted and looped on the storefront — keep it short (a few seconds).
                  </p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">
              Linked Product <span className="normal-case font-normal text-admin-400">(optional — sends "Shop Now" here)</span>
            </label>
            <ProductPicker
              value={form.linkedProductId}
              label={linkedProductLabel}
              onChange={(picked) => {
                if (picked) { set('linkedProductId', picked.id); setLinkedProductLabel(picked.name) }
                else { set('linkedProductId', ''); setLinkedProductLabel('') }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Start Date</label>
              <input className={fieldClass} type="date" value={form.startDate}
                onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">End Date</label>
              <input className={fieldClass} type="date" value={form.endDate}
                onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-admin font-semibold text-admin-600 mb-1.5 uppercase tracking-wide">Sort Order</label>
              <input className={fieldClass} type="number" min="0" placeholder="0 = first"
                value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none mt-4">
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className={`w-10 h-5 rounded-full relative transition-colors ${form.isActive ? 'bg-brand-500' : 'bg-admin-200'}`}>
                <span className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm font-admin font-medium text-admin-700">Active</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-admin-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-admin font-semibold text-admin-600
            border border-admin-200 rounded-xl hover:bg-admin-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || imgUploading || vidUploading}
            className="flex-1 px-4 py-2.5 text-sm font-admin font-semibold text-white
              bg-brand-700 rounded-xl hover:bg-brand-800 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  )
}

const TYPE_COLORS = {
  banner:           'bg-blue-50 text-blue-700 border-blue-200',
  featured_product: 'bg-amber-50 text-amber-700 border-amber-200',
  seasonal:         'bg-green-50 text-green-700 border-green-200',
  tip:              'bg-purple-50 text-purple-700 border-purple-200',
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await promotionService.getAll()
      setPromos(res.data?.data || [])
    } catch { toast.error('Failed to load promotions') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion?')) return
    setDeleting(id)
    try {
      await promotionService.remove(id)
      setPromos(p => p.filter(x => x._id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(null) }
  }

  const handleToggle = async (promo) => {
    try {
      const updated = await promotionService.update(promo._id, { isActive: !promo.isActive })
      setPromos(p => p.map(x => x._id === promo._id ? updated.data.data : x))
    } catch { toast.error('Failed to update') }
  }

  const now = new Date()
  const isLive = (p) =>
    p.isActive &&
    (!p.startDate || new Date(p.startDate) <= now) &&
    (!p.endDate   || new Date(p.endDate)   >= now)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Promotions</h1>
          <p className="text-admin-500 text-sm font-admin mt-1">
            Manage banners, featured products and seasonal campaigns
          </p>
        </div>
        <button onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white text-sm font-admin
            font-semibold rounded-xl hover:bg-brand-800 transition-colors shadow-sm">
          <Plus size={15} /> New Promotion
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-admin-200 p-16 text-center">
          <Megaphone size={28} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-500 font-admin font-medium">No promotions yet</p>
          <button onClick={() => setModal({ type: 'create' })}
            className="mt-3 text-sm font-admin font-semibold text-brand-600 hover:underline">
            Create your first promotion
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p._id} className="bg-white rounded-2xl border border-admin-200 p-4 flex items-start gap-4">
              <div className="relative w-24 h-18 rounded-xl overflow-hidden flex-shrink-0 border border-admin-100 bg-admin-100">
                {p.mediaType === 'video' && p.videoUrl ? (
                  <>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <video src={p.videoUrl} className="w-full h-full object-cover" muted />
                    }
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play size={16} className="text-white drop-shadow" fill="currentColor" />
                    </span>
                  </>
                ) : p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Megaphone size={20} className="text-admin-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-admin font-bold text-admin-900 text-sm">{p.title}</p>
                  <span className={`text-xs font-admin font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[p.type] || 'bg-admin-100 text-admin-600 border-admin-200'}`}>
                    {p.type.replace('_', ' ')}
                  </span>
                  {isLive(p)
                    ? <span className="flex items-center gap-1 text-xs font-admin font-semibold text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Live
                      </span>
                    : <span className="text-xs font-admin text-admin-400">
                        {!p.isActive ? 'Inactive' : p.startDate && new Date(p.startDate) > now ? 'Scheduled' : 'Ended'}
                      </span>
                  }
                </div>
                {p.description && <p className="text-xs font-admin text-admin-500 truncate mb-1">{p.description}</p>}
                <div className="flex gap-3 text-xs font-admin text-admin-400">
                  {p.startDate && <span>From {formatDate(p.startDate)}</span>}
                  {p.endDate   && <span>Until {formatDate(p.endDate)}</span>}
                  {p.seasonTag && <span className="text-brand-600">· {p.seasonTag}</span>}
                  {p.linkedProductId?.name && <span>· Links to {p.linkedProductId.name}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleToggle(p)}
                  className="px-2.5 py-1 text-xs font-admin font-semibold rounded-lg border transition-colors
                    hover:opacity-80"
                  style={isLive(p)
                    ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                    : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setModal({ type: 'edit', promo: p })}
                  className="p-1.5 rounded-lg text-admin-400 hover:text-admin-700 hover:bg-admin-100 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PromoModal
          promo={modal.type === 'edit' ? modal.promo : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
