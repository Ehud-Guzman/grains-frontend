import { useState, useEffect } from 'react'
import { List, Plus, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { savedListService } from '../../services/savedList.service'

// Shared "add to list" picker — used from the shop (single product) and the
// cart (whole basket at once). Assumes the caller has already verified the
// user is logged in as a customer; saved lists are a customer-only feature.
export default function AddToListModal({ items, onClose }) {
  const [lists, setLists] = useState(null) // null = loading
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState(null) // list _id being saved to, or 'new'

  useEffect(() => {
    savedListService.getMyLists()
      .then(res => setLists(res.data?.data || []))
      .catch(() => setLists([]))
  }, [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Merge incoming items into a list's existing items, combining quantities
  // where the same product/variety/packaging is already present.
  const mergeItems = (existing = []) => {
    const merged = [...existing]
    items.forEach(newItem => {
      const idx = merged.findIndex(i =>
        i.productId === newItem.productId && i.variety === newItem.variety && i.packaging === newItem.packaging)
      if (idx >= 0) merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + newItem.quantity }
      else merged.push(newItem)
    })
    return merged
  }

  const addToExisting = async (list) => {
    setBusyId(list._id)
    try {
      const merged = mergeItems(list.items)
      await savedListService.updateList(list._id, { items: merged })
      toast.success(`Added to "${list.name}"`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to list')
    } finally { setBusyId(null) }
  }

  const createAndAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setBusyId('new')
    try {
      await savedListService.createList({ name, items })
      toast.success(`Added to new list "${name}"`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create list')
    } finally { setBusyId(null) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-label="Add to list"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl
        border-t sm:border border-earth-100 max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <List size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="font-body font-bold text-earth-900 text-sm">Add to List</p>
              <p className="text-earth-400 text-xs font-body">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {lists === null ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="text-earth-300 animate-spin" />
            </div>
          ) : (
            <>
              {lists.map(list => (
                <button key={list._id} onClick={() => addToExisting(list)} disabled={busyId !== null}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                    border border-earth-200 bg-white hover:border-brand-300 hover:bg-brand-50/40
                    transition-colors disabled:opacity-50 text-left">
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-earth-800 text-sm truncate">{list.name}</p>
                    <p className="text-earth-400 text-xs font-body">
                      {list.items?.length || 0} item{list.items?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {busyId === list._id
                    ? <Loader2 size={15} className="text-brand-500 animate-spin flex-shrink-0" />
                    : <Plus size={15} className="text-brand-500 flex-shrink-0" />
                  }
                </button>
              ))}

              {lists.length === 0 && !creatingNew && (
                <p className="text-earth-400 text-xs font-body text-center py-3">
                  No lists yet — create one below.
                </p>
              )}

              {creatingNew ? (
                <div className="flex gap-2 px-1 pt-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createAndAdd() }}
                    placeholder="New list name…"
                    maxLength={80}
                    className="flex-1 border border-earth-200 rounded-xl px-3 py-2 text-sm font-body
                      text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                      focus:ring-brand-400 focus:border-transparent bg-earth-50"
                  />
                  <button onClick={createAndAdd} disabled={busyId !== null || !newName.trim()}
                    className="px-3 py-2 bg-brand-700 text-white rounded-xl text-sm font-body
                      font-semibold hover:bg-brand-800 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    {busyId === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : (
                <button onClick={() => setCreatingNew(true)} disabled={busyId !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border-2 border-dashed border-brand-200 text-brand-600 text-sm font-body
                    font-semibold hover:bg-brand-50 transition-colors disabled:opacity-50">
                  <Plus size={14} /> Create New List
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
