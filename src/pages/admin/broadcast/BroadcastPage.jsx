import { useState, useEffect } from 'react'
import { Megaphone, Users, AlertTriangle, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminBroadcastService } from '../../../services/admin/broadcast.service'

const MAX_LENGTH = 459
const AUDIENCES = [
  { value: 'all', label: 'All registered customers' },
  { value: 'b2b', label: 'B2B customers only' },
]

export default function BroadcastPage() {
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [count, setCount] = useState(null)
  const [countLoading, setCountLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setCountLoading(true)
    adminBroadcastService.getAudienceCount(audience)
      .then(res => setCount(res.data?.data?.count ?? 0))
      .catch(() => setCount(null))
      .finally(() => setCountLoading(false))
  }, [audience])

  const segments = Math.ceil((message.length || 1) / 153)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await adminBroadcastService.send({ message, audience })
      toast.success(`Sent to ${res.data.data.sent} of ${res.data.data.recipientCount} recipients`)
      setMessage('')
      setConfirming(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed')
    } finally { setSending(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-admin font-bold text-admin-900">SMS Broadcast</h1>
        <p className="text-admin-500 text-sm font-admin mt-1">
          Send a one-off SMS to registered customers — for major promos or announcements.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-5">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-admin text-amber-800 leading-relaxed">
          This sends a real SMS to every matching customer via Africa's Talking and cannot be undone or recalled.
          Only customers who opted in to promotional SMS receive broadcasts. Use sparingly — frequent broadcasts feel like spam.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5 space-y-5">
        <div>
          <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-2">
            Audience
          </label>
          <div className="flex gap-2">
            {AUDIENCES.map(a => (
              <button key={a.value} onClick={() => setAudience(a.value)}
                className={`px-3.5 py-2 rounded-xl text-sm font-admin font-medium border transition-all ${
                  audience === a.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-admin-600 border-admin-200 hover:border-admin-400'
                }`}>
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-admin text-admin-400 mt-2 flex items-center gap-1.5">
            <Users size={12} />
            {countLoading ? 'Counting recipients…' : count === null ? 'Could not load recipient count' : `${count} recipient${count !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div>
          <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-2">
            Message
          </label>
          <textarea rows={4} maxLength={MAX_LENGTH}
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="e.g. 20% off all maize this weekend only at Vittorios Grains! Visit us or order online."
            className="w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm font-admin
              text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
              focus:ring-brand-400 focus:border-transparent bg-white resize-none" />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs font-admin text-admin-400">
              {message.length} / {MAX_LENGTH} characters · {segments} SMS segment{segments !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!message.trim() || !count}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white
              rounded-xl text-sm font-admin font-semibold hover:bg-brand-600 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed">
            <Megaphone size={15} /> Review Broadcast
          </button>
        ) : (
          <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-admin text-red-800">
              Send this message to <strong>{count} customer{count !== 1 ? 's' : ''}</strong> now? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)}
                className="flex-1 px-4 py-2.5 border border-admin-200 text-admin-600 rounded-xl
                  text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white
                  rounded-xl text-sm font-admin font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                <Send size={14} /> {sending ? 'Sending…' : `Send to ${count}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
