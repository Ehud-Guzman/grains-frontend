import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { timeAgo } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import { SectionError, errorMessage } from '../../../components/admin/control/controlUi'
import ControlOverview from '../../../components/admin/control/ControlOverview'
import ControlSwitches from '../../../components/admin/control/ControlSwitches'
import ControlAccounts from '../../../components/admin/control/ControlAccounts'
import ControlSecurity from '../../../components/admin/control/ControlSecurity'
import ControlDataHealth from '../../../components/admin/control/ControlDataHealth'
import ControlPermissions from '../../../components/admin/control/ControlPermissions'

// The Control Center: the superadmin's one screen for seeing the whole system and
// putting it right. Everything on it is refused by the API for every other role; the
// route guard only keeps the page out of their way.
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'Health' },
  { id: 'switches', label: 'Switches' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data' },
  { id: 'permissions', label: 'Permissions' },
]

const AUTO_REFRESH_MS = 90 * 1000

export default function ControlCenterPage() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  // Reloading keeps the old data on screen until the new arrives, so open dialogs, typed
  // text and scroll position survive a refresh — including the silent one on a timer.
  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await api.overview()
      if (!mounted.current) return
      setOverview(res.data.data)
      setError('')
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, 'Could not load the Control Center'))
    } finally {
      if (mounted.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    const timer = setInterval(load, AUTO_REFRESH_MS)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [load])

  if (!overview) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {error
          ? <SectionError message={error} onRetry={load} />
          : <div className="flex flex-col items-center gap-3 py-24 text-admin-400"><Spinner size="lg" /><p className="text-sm font-admin">Reading the whole system…</p></div>}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-admin font-bold text-red-600 uppercase tracking-widest">Superadmin</span>
          </div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Control Center</h1>
          <p className="text-admin-500 text-sm font-admin mt-1 max-w-2xl leading-relaxed">
            See the whole system, change what only you can change, and put things right. Every action is written to the activity log.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-admin text-admin-400 hidden sm:inline">Updated {timeAgo(overview.generatedAt)}</span>
          <button type="button" onClick={load} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200 rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 shadow-admin disabled:opacity-60">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {error && <SectionError message={`${error} — showing the last good reading.`} onRetry={load} />}

      <nav aria-label="On this page"
        className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-admin-50/90 backdrop-blur border-b border-admin-100">
        <ul className="flex gap-1.5 overflow-x-auto">
          {SECTIONS.map(s => (
            <li key={s.id} className="flex-shrink-0">
              <a href={`#${s.id}`}
                className="block px-3 py-1.5 rounded-lg border border-admin-200 bg-white text-xs font-admin font-semibold text-admin-600 hover:bg-admin-100">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ControlOverview overview={overview} />
      <ControlSwitches overview={overview} reload={load} />
      <ControlAccounts onChanged={load} />
      <ControlSecurity />
      <ControlDataHealth overview={overview} reload={load} />
      <ControlPermissions />
    </div>
  )
}
