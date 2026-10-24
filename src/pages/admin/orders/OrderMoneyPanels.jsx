import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDownLeft, CheckCircle2, FileWarning } from 'lucide-react'
import { adminPaymentService } from '../../../services/admin/payment.service'
import { adminOrderService } from '../../../services/admin/order.service'
import { formatKES, formatDate } from '../../../utils/helpers'

// Two panels for the money that has to go BACK, on the admin order page.
//
//  RefundPanel     A paid order that was cancelled or rejected owes the customer their money. The system records that
//                  it is owed; sending it (M-Pesa, cash, bank) happens outside. This is where an admin records that it
//                  was sent, so "owed" ends and the money out can be matched to the M-Pesa statement.
//  CreditNotePanel An order KRA already holds an invoice for was cancelled: a credit note must be filed, then recorded.

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' },
]
const METHOD_LABEL = Object.fromEntries(METHODS.map(m => [m.value, m.label]))
const RECEIPT = /^[A-Z0-9]{10}$/

const field = 'w-full border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin text-admin-800 bg-admin-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent'

export function RefundPanel({ order, canRecord, onDone }) {
  const payment = order.paymentId && typeof order.paymentId === 'object' ? order.paymentId : null
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('mpesa')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (order.paymentStatus !== 'refunded' || !payment) return null

  const owed = payment.receivedAmount ?? payment.amount
  const sent = Boolean(payment.refundSentAt)

  if (sent) {
    return (
      <div role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-admin text-green-800 leading-relaxed">
        <p className="flex items-center gap-1.5 font-semibold text-sm"><CheckCircle2 size={14} aria-hidden="true" /> Refund sent</p>
        <p className="mt-1">
          {formatKES(payment.refundSentAmount)} by {METHOD_LABEL[payment.refundMethod] || payment.refundMethod} on {formatDate(payment.refundSentAt)}
          {payment.refundReference ? <> · receipt <span className="font-mono">{payment.refundReference}</span></> : null}
        </p>
        {payment.refundNote && <p className="mt-0.5 text-green-700">{payment.refundNote}</p>}
      </div>
    )
  }

  const submit = async () => {
    const ref = reference.trim().toUpperCase()
    if (method === 'mpesa' && !RECEIPT.test(ref)) return toast.error('Enter the 10-character M-Pesa receipt of the refund')
    const sentAmount = amount === '' ? owed : Math.round(Number(amount))
    if (!Number.isFinite(sentAmount) || sentAmount < 1 || sentAmount > owed) return toast.error(`The refund must be between KES 1 and KES ${owed}`)
    if (sentAmount < owed && !note.trim()) return toast.error('A refund of less than the amount received needs a note saying why')
    setBusy(true)
    try {
      await adminPaymentService.recordRefundSent(order._id, {
        method, reference: reference.trim(), note: note.trim(), ...(amount !== '' && { amount: sentAmount }),
      })
      toast.success('Refund recorded as sent')
      setOpen(false)
      onDone?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record the refund')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-admin font-semibold text-amber-900">
        <ArrowDownLeft size={14} aria-hidden="true" /> Refund owed: {formatKES(owed)}
      </p>
      <p className="mt-1 text-xs font-admin text-amber-800 leading-relaxed">
        This order was {order.status} after the customer paid{payment.refundedAt ? ` (since ${formatDate(payment.refundedAt)})` : ''}.
        Send the money back through M-Pesa or in cash, then record it here.
      </p>

      {canRecord && (!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-2.5 w-full py-2 rounded-lg bg-amber-600 text-white text-sm font-admin font-semibold hover:bg-amber-700 transition-colors">
          Record refund sent
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-admin font-semibold text-admin-700">
            How was it sent?
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${field} mt-1`}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-admin font-semibold text-admin-700">
            {method === 'mpesa' ? 'M-Pesa receipt of the refund' : 'Reference (optional)'}
            <input value={reference} maxLength={method === 'mpesa' ? 10 : 60}
              onChange={(e) => setReference(method === 'mpesa' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value)}
              placeholder={method === 'mpesa' ? 'e.g. QDK14KSHD7' : 'slip or reference number'}
              className={`${field} mt-1 ${method === 'mpesa' ? 'font-mono uppercase' : ''}`} />
          </label>
          <label className="block text-xs font-admin font-semibold text-admin-700">
            Amount sent (KES) — leave blank for the full {formatKES(owed)}
            <input type="number" min="1" max={owed} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(owed)} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-admin font-semibold text-admin-700">
            Note {amount !== '' && Number(amount) < owed ? '(required: why less?)' : '(optional)'}
            <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={`${field} mt-1`} />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={submit} disabled={busy}
              className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-admin font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {busy ? 'Saving…' : 'Record refund sent'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-admin-200 bg-white text-admin-600 text-sm font-admin hover:bg-admin-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CreditNotePanel({ order, canRecord, onDone }) {
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)

  if (order.etimsCreditNoteStatus === 'issued') {
    return (
      <p role="status" className="mt-3 text-xs font-admin text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        KRA credit note recorded: <span className="font-mono font-semibold">{order.etimsCreditNoteRef}</span>
      </p>
    )
  }
  if (order.etimsCreditNoteStatus !== 'required') return null

  const submit = async () => {
    if (reference.trim().length < 3) return toast.error('Enter the credit-note reference KRA gave')
    setBusy(true)
    try {
      await adminOrderService.recordCreditNote(order._id, reference.trim())
      toast.success('Credit note recorded')
      setReference('')
      onDone?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record the credit note')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-admin font-semibold text-amber-900">
        <FileWarning size={14} aria-hidden="true" /> A credit note must be filed with KRA
      </p>
      <p className="mt-1 text-xs font-admin text-amber-800 leading-relaxed">
        KRA holds invoice {order.etimsInvoiceNumber ? <span className="font-mono">{order.etimsInvoiceNumber}</span> : 'for this order'}, but the order was {order.status}.
        File a credit note against it (KRA portal or your accountant), then record its reference.
      </p>
      {canRecord && (
        <div className="mt-2.5 flex gap-2">
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} aria-label="Credit note reference"
            placeholder="Credit note reference" className={`${field} flex-1`} />
          <button type="button" onClick={submit} disabled={busy || reference.trim().length < 3}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-admin font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {busy ? 'Saving…' : 'Record credit note'}
          </button>
        </div>
      )}
    </div>
  )
}
