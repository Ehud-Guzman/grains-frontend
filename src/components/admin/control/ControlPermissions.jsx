import { useState } from 'react'
import { KeyRound, ChevronDown } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { Section, Loading, SectionError, errorMessage, ROLE_TONE } from './controlUi'

const ROLE_ORDER = ['customer', 'driver', 'staff', 'supervisor', 'admin', 'superadmin']

function Cell({ cell, isPublic }) {
  if (!cell.read && !cell.write) return <span className="text-admin-200" aria-label="No access">—</span>
  const label = `${cell.read ? 'read' : ''}${cell.read && cell.write ? ' and ' : ''}${cell.write ? 'change' : ''}${cell.partial ? ' (some)' : ''}`
  return (
    <span aria-label={label} title={label}
      className={`inline-flex items-center gap-0.5 font-admin font-bold text-[11px] ${isPublic ? 'text-admin-500' : cell.partial ? 'text-amber-600' : 'text-green-700'}`}>
      {cell.read && 'R'}{cell.write && 'W'}{cell.partial && '~'}
    </span>
  )
}

function Row({ area, roles }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="border-t border-admin-100 hover:bg-admin-50/50">
        <td className="px-3 py-2">
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            className="flex items-start gap-1.5 text-left">
            <ChevronDown size={13} className={`mt-1 text-admin-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            <span>
              <span className="block text-sm font-admin font-semibold text-admin-800">
                {area.label}{area.public && <span className="ml-1.5 text-[10px] font-bold uppercase text-admin-500">public</span>}
              </span>
              {area.grantedBy.length > 0 && (
                <span className="block text-[11px] font-admin text-admin-500">also anyone granted “{area.grantedBy.join(', ')}”</span>
              )}
            </span>
          </button>
        </td>
        {roles.map(role => (
          <td key={role} className="px-2 py-2 text-center"><Cell cell={area.cells[role]} isPublic={area.public} /></td>
        ))}
      </tr>
      {open && (
        <tr className="bg-admin-50/60">
          <td colSpan={roles.length + 1} className="px-3 py-3">
            {area.note && <p className="text-xs font-admin text-admin-500 mb-2">{area.note}</p>}
            <ul className="space-y-0.5">
              {area.routes.map((r, i) => (
                <li key={`${r.method}-${r.path}-${i}`} className="text-[11px] font-mono text-admin-600 flex flex-wrap gap-x-2">
                  <span className="font-bold w-12 flex-shrink-0">{r.method}</span>
                  <span className="break-all">{r.path}</span>
                  <span className="text-admin-500">{r.public ? 'anyone' : (r.roles || []).join(', ')}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ControlPermissions() {
  const [matrix, setMatrix] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.permissions()
      setMatrix(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not read the permissions'))
    } finally {
      setLoading(false)
    }
  }

  const roles = matrix ? ROLE_ORDER.filter(r => matrix.roles.includes(r)) : []

  return (
    <Section id="permissions" icon={KeyRound} title="Who can do what"
      subtitle="Read from the rules the server is running right now, not from a document. R = can read, W = can change, ~ = only some of the area."
      actions={!matrix && (
        <button type="button" onClick={load} disabled={loading}
          className="px-3 py-2 rounded-lg border border-admin-200 bg-white text-sm font-admin font-semibold text-admin-700 hover:bg-admin-50 disabled:opacity-50">
          {loading ? 'Reading…' : 'Show the grid'}
        </button>
      )}>
      {error && <SectionError message={error} onRetry={load} />}
      {loading && !matrix && <Loading label="Reading the routes…" />}
      {!matrix && !loading && !error && (
        <p className="text-sm font-admin text-admin-500">Open the grid to see which roles reach which part of the system.</p>
      )}
      {matrix && (
        <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-[11px] font-admin font-bold uppercase tracking-wide text-admin-500">
                  <th className="px-3 py-2">Area</th>
                  {roles.map(r => <th key={r} className={`px-2 py-2 text-center ${r === 'superadmin' ? 'text-red-500' : ''}`} data-tone={ROLE_TONE[r]}>{r}</th>)}
                </tr>
              </thead>
              <tbody>{matrix.areas.map(a => <Row key={a.mount} area={a} roles={roles} />)}</tbody>
            </table>
          </div>
          <p className="text-xs font-admin text-admin-500 mt-3 leading-relaxed">
            This shows what each route’s guard allows. Finer rules inside a screen — a customer seeing only their own orders, a driver
            only their own deliveries — are applied in the code behind the route and are not visible here. Superadmin is deliberately
            read-only on orders, products, stock and payments: day-to-day trading needs a branch account.
          </p>
        </>
      )}
    </Section>
  )
}
