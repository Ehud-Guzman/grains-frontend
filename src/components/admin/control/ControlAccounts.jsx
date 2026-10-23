import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UserCog, LogOut, Lock, Unlock } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { adminUserService } from '../../../services/admin/user.service'
import { useAuth } from '../../../context/AuthContext'
import Modal from '../../ui/Modal'
import { formatDateTime, timeAgo } from '../../../utils/helpers'
import { Section, Pill, ROLE_TONE, PasswordConfirmModal, Loading, SectionError, errorMessage } from './controlUi'

function ConfirmSignOut({ account, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      await api.signOut(account.id)
      toast.success(`${account.name} signed out everywhere`)
      onDone()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not sign them out'))
      setBusy(false)
    }
  }
  return (
    <Modal onClose={busy ? undefined : onClose} label={`Sign out ${account.name}`}
      panelClassName="bg-white w-full sm:max-w-sm rounded-2xl shadow-2xl border border-admin-100">
      <div className="px-5 py-4 border-b border-admin-100">
        <h3 className="font-admin font-bold text-admin-900 text-sm">Sign out {account.name}?</h3>
      </div>
      <div className="px-5 py-4 text-sm font-admin text-admin-600 leading-relaxed">
        Every session this account has — on every phone and browser — ends now. They can sign in again with their password.
        To stop them signing in at all, lock the account instead.
      </div>
      <div className="px-5 pb-5 flex gap-2">
        <button type="button" onClick={go} disabled={busy}
          className="flex-1 py-2.5 bg-shell-800 text-white rounded-xl text-sm font-admin font-semibold hover:bg-shell-700 disabled:opacity-50">
          Sign out
        </button>
        <button type="button" onClick={onClose} disabled={busy}
          className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-xl text-sm font-admin font-medium hover:bg-admin-50">
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export default function ControlAccounts({ onChanged }) {
  const { user: me } = useAuth()
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [signOutTarget, setSignOutTarget] = useState(null)
  const [signOutAll, setSignOutAll] = useState(false)
  const [scope, setScope] = useState('staff')

  const load = useCallback(async () => {
    try {
      const res = await api.accounts()
      setAccounts(res.data.data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load accounts'))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleLock = async (account) => {
    setBusyId(account.id)
    try {
      if (account.isLocked) await adminUserService.unlock(account.id)
      else await adminUserService.lock(account.id)
      toast.success(`${account.name} ${account.isLocked ? 'unlocked' : 'locked'}`)
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the account'))
    } finally {
      setBusyId(null)
    }
  }

  const isMe = (a) => String(a.id) === String(me?.id || me?._id)

  return (
    <Section id="accounts" icon={UserCog} title="Accounts and sessions"
      subtitle="Everyone with a staff-side login. Lock stops sign-in; sign out ends sessions that are already open."
      actions={
        <>
          <Link to="/admin/users" className="text-xs font-admin font-semibold text-brand-600 hover:text-brand-700">
            Create, change role, reset password →
          </Link>
          <button type="button" onClick={() => setSignOutAll(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-admin-200 bg-white text-sm font-admin font-semibold text-admin-700 hover:bg-admin-50">
            <LogOut size={14} /> Sign everyone out
          </button>
        </>
      }>
      {error && !accounts && <SectionError message={error} onRetry={load} />}
      {!error && !accounts && <Loading label="Loading accounts…" />}

      {accounts && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="text-[11px] font-admin font-bold uppercase tracking-wide text-admin-500 border-b border-admin-100">
                <th className="px-4 sm:px-3 py-2">Account</th>
                <th className="px-3 py-2">Role · branch</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-4 sm:px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {accounts.map(a => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 sm:px-3 py-3">
                    <p className="text-sm font-admin font-semibold text-admin-800">
                      {a.name}{isMe(a) && <span className="ml-1.5 text-xs font-normal text-admin-500">(you)</span>}
                    </p>
                    <p className="text-xs font-admin text-admin-500">{a.phone}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={ROLE_TONE[a.role]}>{a.role}</Pill>
                    <p className="text-xs font-admin text-admin-500 mt-1">{a.branchName || (a.role === 'superadmin' ? 'All branches' : 'No branch')}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-admin text-admin-700">{a.lastLoginAt ? timeAgo(a.lastLoginAt) : 'Never'}</p>
                    {a.lastLoginIp && <p className="text-xs font-admin text-admin-500">{a.lastLoginIp}</p>}
                    {a.sessionsRevokedAt && <p className="text-[11px] font-admin text-admin-500" title={formatDateTime(a.sessionsRevokedAt)}>signed out {timeAgo(a.sessionsRevokedAt)}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.isLocked ? <Pill tone="red">Locked</Pill> : <Pill tone="green">Active</Pill>}
                      {a.failedLoginCount >= 3 && <Pill tone="amber">{a.failedLoginCount} wrong passwords</Pill>}
                    </div>
                  </td>
                  <td className="px-4 sm:px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" disabled={isMe(a)} onClick={() => setSignOutTarget(a)}
                        title={isMe(a) ? 'Use Log out for your own session' : 'End all of their sessions'}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-admin-200 text-xs font-admin font-semibold text-admin-600 hover:bg-admin-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        <LogOut size={12} /> Sign out
                      </button>
                      <button type="button" disabled={isMe(a) || busyId === a.id} onClick={() => toggleLock(a)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-admin-200 text-xs font-admin font-semibold text-admin-600 hover:bg-admin-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        {a.isLocked ? <Unlock size={12} /> : <Lock size={12} />} {a.isLocked ? 'Unlock' : 'Lock'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {signOutTarget && <ConfirmSignOut account={signOutTarget} onClose={() => setSignOutTarget(null)} onDone={load} />}

      {signOutAll && (
        <PasswordConfirmModal title="Sign everyone out" confirmLabel="Sign them out" danger
          onClose={() => setSignOutAll(false)}
          onConfirm={async (password) => {
            const res = await api.signOutAll(scope, password)
            toast.success(res.data.message)
            await load()
            onChanged?.()
          }}>
          <p className="mb-3">
            Ends every open session except yours. Use it if a password or phone may have been exposed, or after restoring a backup.
          </p>
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Who to sign out</legend>
            {[['staff', 'Staff, supervisors, admins and drivers'], ['everyone', 'Everyone, including customers']].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm font-admin text-admin-700 cursor-pointer">
                <input type="radio" name="cc-scope" value={value} checked={scope === value} onChange={() => setScope(value)} />
                {label}
              </label>
            ))}
          </fieldset>
        </PasswordConfirmModal>
      )}
    </Section>
  )
}
