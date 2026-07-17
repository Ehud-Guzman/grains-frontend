import { useState } from 'react'
import { X, Camera, CheckCircle } from 'lucide-react'
import { driverService } from '../../services/driver.service'
import toast from 'react-hot-toast'

// Proof-of-delivery capture at handover. Everything is optional — a driver
// with no camera/data can still complete in two taps — but photo + recipient
// name are what settles "we never received it" disputes, so the UI nudges
// without blocking.
export default function CompleteDeliveryModal({ order, onClose, onCompleted }) {
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [recipientName, setRecipientName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return }
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      let body
      if (photo || recipientName.trim() || note.trim()) {
        body = new FormData()
        if (photo) body.append('photo', photo)
        if (recipientName.trim()) body.append('recipientName', recipientName.trim())
        if (note.trim()) body.append('note', note.trim())
      }
      await driverService.completeDelivery(order._id, body)
      toast.success('Delivery completed')
      onCompleted(order._id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete delivery')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-admin font-bold text-admin-900 text-base">Confirm delivery</h2>
            <p className="text-xs font-admin text-admin-400">{order.orderRef}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-admin-400 hover:text-admin-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Photo capture */}
        <label className="block cursor-pointer">
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
            onChange={handlePhoto} className="hidden" />
          {preview ? (
            <img src={preview} alt="Delivery proof"
              className="w-full h-40 object-cover rounded-xl border border-admin-200" />
          ) : (
            <div className="w-full h-24 border-2 border-dashed border-admin-200 rounded-xl
              flex flex-col items-center justify-center gap-1 text-admin-400 hover:border-admin-300
              hover:text-admin-500 transition-colors">
              <Camera size={20} />
              <span className="text-xs font-admin font-medium">Take a photo of the delivered goods (optional)</span>
            </div>
          )}
        </label>

        <div>
          <label className="block text-xs font-admin font-semibold text-admin-600 mb-1">
            Received by (optional)
          </label>
          <input type="text" value={recipientName} maxLength={100}
            onChange={e => setRecipientName(e.target.value)}
            placeholder="Name of the person who received the goods"
            className="w-full border border-admin-200 rounded-xl px-3 py-2.5 text-sm font-admin
              text-admin-900 placeholder-admin-300 focus:outline-none focus:ring-2
              focus:ring-green-400 focus:border-transparent" />
        </div>

        <div>
          <label className="block text-xs font-admin font-semibold text-admin-600 mb-1">
            Note (optional)
          </label>
          <input type="text" value={note} maxLength={300}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Left with the shop attendant"
            className="w-full border border-admin-200 rounded-xl px-3 py-2.5 text-sm font-admin
              text-admin-900 placeholder-admin-300 focus:outline-none focus:ring-2
              focus:ring-green-400 focus:border-transparent" />
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-admin font-semibold
            hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={16} />
          {submitting ? 'Completing…' : 'Mark as Delivered'}
        </button>
      </div>
    </div>
  )
}
