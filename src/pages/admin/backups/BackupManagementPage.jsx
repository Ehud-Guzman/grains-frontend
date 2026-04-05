import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Archive, AlertTriangle, Download, RefreshCw, Trash2,
  Upload, HardDrive, ShieldAlert, X, CheckCircle,
} from 'lucide-react'
import { adminBackupService } from '../../../services/admin/backup.service'
import Spinner from '../../../components/ui/Spinner'

// ── HELPERS ───────────────────────────────────────────────────────────────────
const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes, unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex++ }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : '—'

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, hint, tone = 'brand' }) => {
  const tones = {
    brand: 'border-brand-100 text-brand-700',
    blue:  'border-blue-100  text-blue-700',
    amber: 'border-amber-100 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-4 bg-white shadow-admin ${tones[tone] || tones.brand}`}>
      <div className="w-9 h-9 rounded-xl bg-admin-50 flex items-center justify-center mb-3 shadow-sm">
        <Icon size={18} />
      </div>
      <p className="text-2xl font-admin font-bold text-admin-900 leading-tight">{value}</p>
      <p className="text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide mt-1">{label}</p>
      {hint && <p className="text-xs text-admin-400 font-admin mt-1">{hint}</p>}
    </div>
  )
}

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
function DeleteModal({ backup, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-admin-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 size={15} className="text-red-600" />
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">Delete Backup</h3>
          </div>
          <button onClick={onCancel} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm font-admin text-admin-700 mb-2">
            This will permanently remove the backup file from the server.
          </p>
          <div className="bg-admin-50 rounded-lg px-3 py-2.5 border border-admin-200">
            <p className="text-xs font-admin font-semibold text-admin-700 break-all">{backup.filename}</p>
            <p className="text-xs text-admin-400 font-admin mt-0.5">
              {formatBytes(backup.sizeBytes)} · Created {formatDateTime(backup.createdAt)}
            </p>
          </div>
          <p className="text-xs text-red-600 font-admin mt-3">This action cannot be undone.</p>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white
              rounded-xl text-sm font-admin font-semibold hover:bg-red-700 disabled:opacity-50
              transition-colors">
            {loading ? <Spinner size="sm" /> : <Trash2 size={14} />}
            Delete Backup
          </button>
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RESTORE CONFIRM MODAL ─────────────────────────────────────────────────────
function RestoreModal({ file, onConfirm, onCancel, loading }) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === 'RESTORE'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-admin-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Upload size={15} className="text-amber-600" />
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">Confirm Restore</h3>
          </div>
          <button onClick={onCancel} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-admin font-semibold text-red-800">This will replace live data</p>
              <p className="text-xs font-admin text-red-700 mt-0.5 leading-relaxed">
                All current collections will be overwritten with the snapshot.
                A safety backup is automatically created immediately before restore.
              </p>
            </div>
          </div>

          <div className="bg-admin-50 rounded-lg px-3 py-2.5 border border-admin-200">
            <p className="text-xs font-admin font-semibold text-admin-600">File selected</p>
            <p className="text-xs font-admin text-admin-700 mt-0.5 break-all">{file?.name}</p>
          </div>

          <div>
            <label className="block text-xs font-admin font-semibold text-admin-600
              uppercase tracking-wide mb-1.5">
              Type <span className="text-red-600 font-bold">RESTORE</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="RESTORE"
              autoFocus
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-admin font-bold
                tracking-widest focus:outline-none focus:ring-2 transition-all ${
                  confirmed
                    ? 'border-green-300 focus:ring-green-300 text-green-700 bg-green-50'
                    : 'border-admin-200 focus:ring-red-300 text-admin-800 bg-white'
                }`}
            />
            {confirmed && (
              <p className="text-xs text-green-600 font-admin font-semibold mt-1 flex items-center gap-1">
                <CheckCircle size={11} /> Confirmed
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => onConfirm(typed)}
            disabled={!confirmed || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white
              rounded-xl text-sm font-admin font-semibold hover:bg-amber-600 disabled:opacity-40
              transition-colors">
            {loading ? <Spinner size="sm" /> : <Upload size={14} />}
            Restore Now
          </button>
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BackupManagementPage() {
  const restoreInputRef = useRef(null)

  const [loading, setLoading]           = useState(true)
  const [creating, setCreating]         = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [restoring, setRestoring]       = useState(false)
  const [deletingId, setDeletingId]     = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const [backups, setBackups]   = useState([])
  const [summary, setSummary]   = useState(null)

  // Modal state
  const [deleteModal, setDeleteModal]   = useState(null) // backup object
  const [restoreFile, setRestoreFile]   = useState(null) // File object

  const loadBackups = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await adminBackupService.list()
      setBackups(res.data?.data?.backups || [])
      setSummary(res.data?.data?.summary || null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load backups')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadBackups() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await adminBackupService.create()
      toast.success('Backup created successfully')
      await loadBackups(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (backup) => {
    setDownloadingId(backup.id)
    try {
      const res = await adminBackupService.download(backup.id)
      const blob = new Blob([res.data], { type: 'application/gzip' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backup.filename || `${backup.id}.json.gz`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download backup')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return
    setDeletingId(deleteModal.id)
    try {
      await adminBackupService.remove(deleteModal.id)
      toast.success('Backup deleted')
      setDeleteModal(null)
      await loadBackups(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete backup')
    } finally {
      setDeletingId(null)
    }
  }

  const handleChooseRestoreFile = () => {
    restoreInputRef.current?.click()
  }

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) setRestoreFile(file)
  }

  const handleRestoreConfirm = async (confirmation) => {
    if (!restoreFile) return
    setRestoring(true)
    try {
      const res = await adminBackupService.restore(restoreFile, confirmation)
      const preRestoreId = res.data?.data?.preRestoreBackup?.id
      toast.success(preRestoreId
        ? `Restored. Safety snapshot created: ${preRestoreId}`
        : 'Backup restored successfully')
      setRestoreFile(null)
      await loadBackups(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore backup')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,.gz,.json.gz,application/json,application/gzip"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Modals */}
      {deleteModal && (
        <DeleteModal
          backup={deleteModal}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
          loading={!!deletingId}
        />
      )}
      {restoreFile && (
        <RestoreModal
          file={restoreFile}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setRestoreFile(null)}
          loading={restoring}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-admin font-bold text-red-600 uppercase tracking-widest">
              Superadmin Only
            </span>
          </div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">System Backups</h1>
          <p className="text-admin-400 text-sm mt-1 max-w-2xl">
            Create full-platform recovery snapshots, download them for off-site storage,
            and restore from a verified backup when needed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadBackups(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-admin-200
              rounded-xl text-sm font-admin font-medium text-admin-700 hover:bg-admin-50
              transition-colors disabled:opacity-50 shadow-admin"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleChooseRestoreFile}
            disabled={restoring}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white
              rounded-xl text-sm font-admin font-medium hover:bg-amber-600 transition-colors
              disabled:opacity-50 shadow-admin"
          >
            {restoring ? <Spinner size="sm" /> : <Upload size={15} />}
            Restore Backup
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white
              rounded-xl text-sm font-admin font-medium hover:bg-brand-600 transition-colors
              disabled:opacity-50 shadow-admin"
          >
            {creating ? <Spinner size="sm" /> : <Archive size={15} />}
            Create Backup
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Archive}
          label="Stored Backups"
          value={summary?.totalBackups ?? 0}
          hint="Snapshots currently stored on this server"
        />
        <StatCard
          icon={HardDrive}
          label="Disk Usage"
          value={formatBytes(summary?.totalSizeBytes || 0)}
          hint="Total space used by backup files"
          tone="blue"
        />
        <StatCard
          icon={ShieldAlert}
          label="Latest Backup"
          value={summary?.latestBackupAt ? formatDateTime(summary.latestBackupAt) : 'None yet'}
          hint="Create one before any risky system-wide changes"
          tone="amber"
        />
      </div>

      {/* ── Warning banner ─────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-admin font-semibold text-amber-800">Restore replaces live data</p>
          <p className="text-xs font-admin text-amber-700 mt-1 leading-relaxed">
            A restore will overwrite current collections with the uploaded snapshot.
            The system creates a safety backup immediately before restore — download
            important backups off the server regularly for off-site protection.
          </p>
        </div>
      </div>

      {/* ── Backup list ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="px-5 py-4 border-b border-admin-100 flex items-center justify-between">
          <div>
            <h2 className="font-admin font-bold text-admin-900">Backup History</h2>
            <p className="text-admin-400 text-xs font-admin mt-0.5">
              Full-system snapshots stored on the backend server
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : backups.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <Archive size={28} className="text-admin-300 mx-auto mb-3" />
            <p className="text-admin-500 font-admin font-medium">No backups yet</p>
            <p className="text-admin-400 text-sm font-admin mt-1">
              Create your first snapshot before major product imports, settings changes,
              or branch migrations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-admin-50">
                <tr className="text-left">
                  <th className="px-5 py-3 text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
                    Backup
                  </th>
                  <th className="px-5 py-3 text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-5 py-3 text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
                    Size
                  </th>
                  <th className="px-5 py-3 text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
                    Records
                  </th>
                  <th className="px-5 py-3 text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-100">
                {backups.map((backup) => {
                  const totalRecords = Object.values(backup.counts || {})
                    .reduce((sum, n) => sum + Number(n || 0), 0)
                  return (
                    <tr key={backup.id} className="align-top hover:bg-admin-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-admin font-semibold text-admin-900 break-all">
                          {backup.filename}
                        </p>
                        <p className="text-xs text-admin-400 font-admin mt-1">
                          ID: {backup.id}
                        </p>
                        <p className="text-xs text-admin-300 font-admin mt-0.5 break-all">
                          SHA-256: {backup.checksum}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-admin-700 font-admin whitespace-nowrap">
                        {formatDateTime(backup.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-admin-700 font-admin whitespace-nowrap">
                        {formatBytes(backup.sizeBytes)}
                      </td>
                      <td className="px-5 py-4 text-sm text-admin-700 font-admin">
                        {totalRecords.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownload(backup)}
                            disabled={downloadingId === backup.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white
                              border border-admin-200 text-sm font-admin text-admin-700
                              hover:bg-admin-50 transition-colors disabled:opacity-50"
                          >
                            {downloadingId === backup.id ? <Spinner size="sm" /> : <Download size={14} />}
                            Download
                          </button>
                          <button
                            onClick={() => setDeleteModal(backup)}
                            disabled={!!deletingId}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50
                              border border-red-200 text-sm font-admin text-red-700
                              hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
