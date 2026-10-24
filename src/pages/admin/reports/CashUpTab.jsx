import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Wallet, Smartphone, Banknote, AlertTriangle, CheckCircle, ArrowDownLeft } from 'lucide-react'
import { formatDate } from '../../../utils/helpers'
import { adminPaymentService } from '../../../services/admin/payment.service'
import { money } from './reportFormat'

// Close-of-day view: what came in, what has to go back, what each driver still has to account for, and the payments
// that need a person. Data comes from GET /admin/reports/cash-up.
const Tile = ({ icon: Icon, label, amount, sub, tone = 'text-admin-800' }) => (
  <div className="bg-white rounded-xl border border-admin-200 p-4 shadow-admin">
    <div className="flex items-center gap-2 text-admin-500 text-xs font-admin font-semibold uppercase tracking-wide">
      <Icon size={14} aria-hidden="true" /> {label}
    </div>
    <p className={`font-admin text-xl font-bold mt-2 tabular-nums whitespace-nowrap ${tone}`}>{money(amount)}</p>
    {sub && <p className="text-xs font-admin text-admin-500 mt-0.5">{sub}</p>}
  </div>
)

const Section = ({ title, hint, children }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
    <div className="px-5 py-4 border-b border-admin-100">
      <h3 className="font-admin font-bold text-admin-900">{title}</h3>
      {hint && <p className="text-xs font-admin text-admin-500 mt-0.5">{hint}</p>}
    </div>
    {children}
  </div>
)

const Empty = ({ children }) => (
  <p className="px-5 py-8 text-center text-sm font-admin text-admin-500">{children}</p>
)

const th = 'px-5 py-3 text-xs text-admin-500 font-semibold uppercase tracking-wide'

const daysSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))

// "Close": someone has dealt with a flagged payment (refunded, topped up, matched to the right order) and says what they did.
// Closing only removes the flag; it never moves money or touches the order.
function CloseControl({ paymentId, onChanged }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (note.trim().length < 3) return toast.error('Say what was done (a few words is enough)')
    setBusy(true)
    try {
      await adminPaymentService.resolveException(paymentId, note.trim())
      toast.success('Closed')
      setOpen(false); setNote('')
      onChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not close it')
    } finally { setBusy(false) }
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-1.5 px-3 py-1 rounded-lg border border-admin-200 bg-white text-xs font-admin font-semibold text-admin-700 hover:bg-admin-50">
        Close…
      </button>
    )
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} aria-label="What was done"
        placeholder="What was done about it?"
        className="flex-1 min-w-[12rem] border border-admin-200 rounded-lg px-3 py-1.5 text-sm font-admin text-admin-800 bg-admin-50 focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <button type="button" onClick={save} disabled={busy}
        className="px-3 py-1.5 rounded-lg bg-shell-800 text-white text-xs font-admin font-semibold hover:bg-shell-700 disabled:opacity-50">
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="px-3 py-1.5 rounded-lg border border-admin-200 text-xs font-admin text-admin-600 hover:bg-admin-50">Cancel</button>
    </div>
  )
}

export default function CashUpTab({ data, canClose = false, onChanged }) {
  // The page keeps the previous tab's data for one render while this tab's request starts, so the
  // first paint can arrive with a payload of the wrong shape. Wait for the real one.
  if (!data?.byMethod) return null
  const { byMethod, cashByCollector = [], drivers = [], exceptions = {}, totals = {}, totalIn = 0 } = data
  const { unpaidCompleted = [], lateSuccess = [], stuckPending = [], receiptMismatch = [] } = exceptions
  const recon = data.reconciliation
  const refunds = data.refunds || { owed: { count: 0, amount: 0, orders: [] }, sent: { count: 0, amount: 0 } }
  const owed = refunds.owed
  const clear = !totals.needsAttention && !totals.cashOutstanding

  return (
    <div className="space-y-5" data-testid="cash-up">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile icon={Wallet} label="Total received" amount={totalIn} sub="what actually arrived" />
        <Tile icon={Smartphone} label="M-Pesa"
          amount={byMethod.mpesaAutomatic.amount + byMethod.mpesaManual.amount}
          sub={`${byMethod.mpesaAutomatic.count} automatic · ${byMethod.mpesaManual.count} typed in by hand`} />
        <Tile icon={Banknote} label="Cash confirmed" amount={byMethod.cash.amount} sub={`${byMethod.cash.count} orders`} />
        <Tile icon={AlertTriangle} label="Cash not yet confirmed" amount={totals.cashOutstanding || 0}
          tone={totals.cashOutstanding ? 'text-amber-600' : 'text-green-700'}
          sub={totals.cashOutstanding ? 'delivered, payment not marked received' : 'all delivered cash is accounted for'} />
        <Tile icon={ArrowDownLeft} label="Refunds owed" amount={owed.amount}
          tone={owed.count ? 'text-amber-600' : 'text-green-700'}
          sub={owed.count ? `${owed.count} to send back${owed.oldestAt ? ` · oldest ${daysSince(owed.oldestAt)}d` : ''}` : 'nothing owed back'} />
      </div>

      {clear && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-admin text-green-700">
          <CheckCircle size={16} aria-hidden="true" /> Nothing needs attention for this period.
        </div>
      )}

      {recon?.payments > 0 && (
        <Section title="How received matches invoiced" hint="Every payment taken in this period, against the orders it paid.">
          <dl className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-admin">
            <div><dt className="text-admin-500">Order totals invoiced</dt><dd className="font-semibold text-admin-900 tabular-nums">{money(recon.invoiced)}</dd></div>
            <div>
              <dt className="text-admin-500">+ Rounded up to the shilling</dt>
              <dd className="font-semibold text-admin-900 tabular-nums">{money(recon.roundedUp)}</dd>
              <dd className="text-xs text-admin-500">M-Pesa and cash ask for whole shillings</dd>
            </div>
            <div>
              <dt className="text-admin-500">+ Paid above what was asked</dt>
              <dd className={`font-semibold tabular-nums ${recon.overpaid > 0 ? 'text-amber-700' : 'text-admin-900'}`}>{money(recon.overpaid)}</dd>
              {recon.overpaid > 0 && <dd className="text-xs text-amber-700">surplus to hand back to customers</dd>}
            </div>
            <div><dt className="text-admin-500">= Money received</dt><dd className="font-bold text-brand-700 tabular-nums">{money(recon.received)}</dd></div>
          </dl>
          <p className="px-5 pb-4 text-xs font-admin text-admin-500">
            Your M-Pesa balance and statement also hold {money(owed.amount)} that is owed back to customers (below), which is not counted as received.
          </p>
        </Section>
      )}

      <Section title="Refunds owed" hint="Money taken for orders that were then cancelled or rejected. It stays here, whatever period you are looking at, until the refund is recorded as sent on the order.">
        {!owed.count ? <Empty>No refunds owed.</Empty> : (
          <ul className="divide-y divide-admin-50">
            {owed.orders.map(r => (
              <li key={String(r.paymentId)} className="px-5 py-3 flex items-center justify-between gap-3 text-sm font-admin">
                <div className="min-w-0">
                  <Link to={`/admin/orders/${r.orderId}`} className="font-semibold text-brand-700 hover:underline">{r.orderRef}</Link>
                  <p className="text-xs text-admin-500">
                    owed {daysSince(r.refundedAt)} day{daysSince(r.refundedAt) === 1 ? '' : 's'}
                    {r.refundReason ? ` · ${r.refundReason}` : ''}{r.mpesaPhone ? ` · ${r.mpesaPhone}` : ''}
                  </p>
                </div>
                <span className="font-bold text-amber-600 tabular-nums">{money(r.amount)}</span>
              </li>
            ))}
            {owed.count > owed.orders.length && (
              <li className="px-5 py-3 text-xs font-admin text-admin-500">…and {owed.count - owed.orders.length} more, oldest shown first.</li>
            )}
          </ul>
        )}
        {refunds.sent.count > 0 && (
          <p className="px-5 py-3 border-t border-admin-100 text-xs font-admin text-admin-500">
            Sent back in this period: {money(refunds.sent.amount)} across {refunds.sent.count} refund{refunds.sent.count === 1 ? '' : 's'}.
          </p>
        )}
      </Section>

      <Section title="Drivers" hint="Cash-on-delivery orders each driver completed, against what has been marked as received.">
        {!drivers.length ? <Empty>No cash-on-delivery deliveries in this period.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-admin">
              <thead><tr className="bg-admin-50/60 border-b border-admin-100">
                <th scope="col" className={`${th} text-left`}>Driver</th>
                <th scope="col" className={`${th} text-right`}>Deliveries</th>
                <th scope="col" className={`${th} text-right`}>Due</th>
                <th scope="col" className={`${th} text-right`}>Received</th>
                <th scope="col" className={`${th} text-right`}>Still to confirm</th>
              </tr></thead>
              <tbody className="divide-y divide-admin-50">
                {drivers.map(d => (
                  <tr key={String(d.driverId)}>
                    <td className="px-5 py-3 font-semibold text-admin-800">{d.driverName || 'Unknown driver'}</td>
                    <td className="px-5 py-3 text-right">{d.deliveries}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{money(d.due)}</td>
                    <td className="px-5 py-3 text-right text-green-700 whitespace-nowrap">{money(d.confirmed)}</td>
                    <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${d.outstanding ? 'text-amber-600' : 'text-admin-500'}`}>
                      {money(d.outstanding)}{d.unconfirmedOrders ? ` (${d.unconfirmedOrders})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Finished but unpaid" hint="Orders marked completed with no payment recorded. Cash orders can complete this way; confirm the money or follow up.">
        {!unpaidCompleted.length ? <Empty>None.</Empty> : (
          <ul className="divide-y divide-admin-50">
            {unpaidCompleted.map(o => (
              <li key={o._id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm font-admin">
                <div className="min-w-0">
                  <Link to={`/admin/orders/${o._id}`} className="font-semibold text-brand-700 hover:underline">{o.orderRef}</Link>
                  <p className="text-xs text-admin-500">{o.driverId?.name ? `${o.driverId.name} · ` : ''}{o.deliveredAt ? formatDate(o.deliveredAt) : ''}</p>
                </div>
                <span className="font-bold text-amber-600 tabular-nums">{money(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="M-Pesa needing attention" hint="Money that arrived but was not credited, receipts that do not match, and prompts still unanswered after 15 minutes. These stay until someone closes them.">
        {!lateSuccess.length && !stuckPending.length && !receiptMismatch.length ? <Empty>No M-Pesa problems.</Empty> : (
          <ul className="divide-y divide-admin-50">
            {lateSuccess.map(p => {
              const short = p.lateSuccessMeta?.reason === 'short_payment'
              return (
                <li key={`l-${p.paymentId}`} className="px-5 py-3 text-sm font-admin">
                  <span className="font-semibold text-red-600">{short ? 'Paid short' : 'Late payment'}</span> · {p.orderRef} ·{' '}
                  {p.lateSuccessMeta?.mpesaTransactionId} · {money(p.lateSuccessMeta?.paidAmount || p.amount)}
                  <p className="text-xs text-admin-500">
                    {short
                      ? `The order needed ${money(p.lateSuccessMeta?.expected ?? p.amount)}, so it was not credited. Collect the difference or refund it.`
                      : 'Money was received but the order was already marked failed. Reconcile by hand.'}
                  </p>
                  {canClose && <CloseControl paymentId={p.paymentId} onChanged={onChanged} />}
                </li>
              )
            })}
            {receiptMismatch.map(p => (
              <li key={`m-${p.paymentId}`} className="px-5 py-3 text-sm font-admin">
                <span className="font-semibold text-red-600">Receipts differ</span> · {p.orderRef}
                <p className="text-xs text-admin-500">
                  Typed <span className="font-mono">{p.receiptMismatch?.typedReceipt}</span>, Safaricom says{' '}
                  <span className="font-mono">{p.receiptMismatch?.safaricomReceipt}</span>. Check the M-Pesa statement.
                </p>
                {canClose && <CloseControl paymentId={p.paymentId} onChanged={onChanged} />}
              </li>
            ))}
            {stuckPending.map(p => (
              <li key={`s-${p.paymentId}`} className="px-5 py-3 text-sm font-admin">
                <span className="font-semibold text-amber-600">No answer</span> · {p.orderRef} · {money(p.amount)}
                <p className="text-xs text-admin-500">Prompt sent {formatDate(p.createdAt)}{p.mpesaPhone ? ` to ${p.mpesaPhone}` : ''} and never completed.</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {cashByCollector.length > 0 && (
        <Section title="Cash confirmed by" hint="Who marked the cash as received.">
          <ul className="divide-y divide-admin-50">
            {cashByCollector.map(c => (
              <li key={String(c.userId)} className="px-5 py-3 flex items-center justify-between text-sm font-admin">
                <span>{c.name || 'Unknown'}{c.role ? <span className="text-admin-500"> · {c.role}</span> : null}</span>
                <span className="font-bold text-admin-800">{money(c.amount)} <span className="font-normal text-admin-500">({c.count})</span></span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
