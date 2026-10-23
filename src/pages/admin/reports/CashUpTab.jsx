import { Link } from 'react-router-dom'
import { Wallet, Smartphone, Banknote, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDate } from '../../../utils/helpers'
import { money } from './reportFormat'

// Close-of-day view: what came in, what each driver still has to account for, and the payments
// that need a person. Data comes from GET /admin/reports/cash-up.
const Tile = ({ icon: Icon, label, amount, sub, tone = 'text-admin-800' }) => (
  <div className="bg-white rounded-xl border border-admin-200 p-4 shadow-admin">
    <div className="flex items-center gap-2 text-admin-500 text-xs font-admin font-semibold uppercase tracking-wide">
      <Icon size={14} aria-hidden="true" /> {label}
    </div>
    <p className={`font-admin text-2xl font-bold mt-2 tabular-nums ${tone}`}>{money(amount)}</p>
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

export default function CashUpTab({ data }) {
  // The page keeps the previous tab's data for one render while this tab's request starts, so the
  // first paint can arrive with a payload of the wrong shape. Wait for the real one.
  if (!data?.byMethod) return null
  const { byMethod, cashByCollector = [], drivers = [], exceptions = {}, totals = {}, totalIn = 0 } = data
  const { unpaidCompleted = [], lateSuccess = [], stuckPending = [] } = exceptions
  const clear = !totals.needsAttention && !totals.cashOutstanding

  return (
    <div className="space-y-5" data-testid="cash-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={Wallet} label="Total received" amount={totalIn} />
        <Tile icon={Smartphone} label="M-Pesa"
          amount={byMethod.mpesaAutomatic.amount + byMethod.mpesaManual.amount}
          sub={`${byMethod.mpesaAutomatic.count} automatic · ${byMethod.mpesaManual.count} typed in by hand`} />
        <Tile icon={Banknote} label="Cash confirmed" amount={byMethod.cash.amount} sub={`${byMethod.cash.count} orders`} />
        <Tile icon={AlertTriangle} label="Cash not yet confirmed" amount={totals.cashOutstanding || 0}
          tone={totals.cashOutstanding ? 'text-amber-600' : 'text-green-700'}
          sub={totals.cashOutstanding ? 'delivered, payment not marked received' : 'all delivered cash is accounted for'} />
      </div>

      {clear && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-admin text-green-700">
          <CheckCircle size={16} aria-hidden="true" /> Nothing needs attention for this period.
        </div>
      )}

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
                    <td className="px-5 py-3 text-right">{money(d.due)}</td>
                    <td className="px-5 py-3 text-right text-green-700">{money(d.confirmed)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${d.outstanding ? 'text-amber-600' : 'text-admin-500'}`}>
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
                <span className="font-bold text-amber-600">{money(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="M-Pesa needing attention" hint="Money that arrived after we had given up on a payment, and prompts still unanswered after 15 minutes.">
        {!lateSuccess.length && !stuckPending.length ? <Empty>No M-Pesa problems.</Empty> : (
          <ul className="divide-y divide-admin-50">
            {lateSuccess.map(p => (
              <li key={`l-${p.paymentId}`} className="px-5 py-3 text-sm font-admin">
                <span className="font-semibold text-red-600">Late payment</span> · {p.orderRef} ·{' '}
                {p.lateSuccessMeta?.mpesaTransactionId} · {money(p.lateSuccessMeta?.paidAmount || p.amount)}
                <p className="text-xs text-admin-500">Money was received but the order was already marked failed. Reconcile by hand.</p>
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
