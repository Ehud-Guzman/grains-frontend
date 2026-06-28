import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ShoppingCart, Edit2, Check, X, ArrowLeft, List } from 'lucide-react'
import toast from 'react-hot-toast'
import { savedListService } from '../../services/savedList.service'
import { useCart } from '../../context/CartContext'
import { formatKES } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'

export default function SavedListsPage() {
  const { reorderItems, openCart } = useCart()
  const [lists, setLists]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')
  const [deleting, setDeleting]   = useState(null)
  const [expanded, setExpanded]   = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await savedListService.getMyLists()
      setLists(res.data?.data || [])
    } catch { toast.error('Failed to load lists') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const res = await savedListService.createList({ name: newName.trim() })
      setLists(prev => [res.data.data, ...prev])
      setNewName('')
      setCreating(false)
      toast.success('List created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create list')
    }
  }

  const handleRename = async (id) => {
    if (!editName.trim()) return
    try {
      const res = await savedListService.updateList(id, { name: editName.trim() })
      setLists(prev => prev.map(l => l._id === id ? res.data.data : l))
      setEditingId(null)
      toast.success('Renamed')
    } catch { toast.error('Could not rename') }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await savedListService.deleteList(id)
      setLists(prev => prev.filter(l => l._id !== id))
      if (expanded === id) setExpanded(null)
      toast.success('List deleted')
    } catch { toast.error('Could not delete') }
    finally { setDeleting(null) }
  }

  const handleLoadToCart = (list) => {
    if (!list.items?.length) { toast('This list is empty', { icon: '📋' }); return }
    reorderItems(list.items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      variety: i.variety,
      packaging: i.packaging,
      unitPrice: 0, // unknown from list — user will see real price at checkout
      quantity: i.quantity,
    })))
    openCart()
    toast.success(`${list.items.length} items added from "${list.name}"`)
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <div className="bg-white border-b border-earth-100 sticky top-0 z-10">
        <div className="container-page max-w-2xl h-14 flex items-center gap-3">
          <Link to="/dashboard"
            className="p-1.5 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <List size={16} className="text-brand-600" />
            <span className="font-display font-bold text-earth-900 text-base">My Lists</span>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="ml-auto flex items-center gap-1.5 text-xs font-body font-semibold text-brand-600
              hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors border border-brand-200">
            <Plus size={13} /> New List
          </button>
        </div>
      </div>

      <div className="container-page max-w-2xl py-4 pb-12">
        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-2xl border border-earth-200 p-4 mb-4 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="List name…"
              maxLength={80}
              className="flex-1 text-sm font-body border-none outline-none text-earth-900 placeholder-earth-300"
            />
            <button onClick={handleCreate}
              className="p-1.5 rounded-lg bg-brand-700 text-white hover:bg-brand-800 transition-colors">
              <Check size={15} />
            </button>
            <button onClick={() => { setCreating(false); setNewName('') }}
              className="p-1.5 rounded-lg text-earth-400 hover:text-earth-700 hover:bg-earth-100 transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-earth-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <List size={24} className="text-earth-300" />
            </div>
            <p className="font-body text-earth-500 mb-2">No saved lists yet</p>
            <button onClick={() => setCreating(true)}
              className="text-sm font-body font-semibold text-brand-600 hover:underline">
              Create your first list
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map(list => (
              <div key={list._id} className="bg-white rounded-2xl border border-earth-100 overflow-hidden">
                {/* List header */}
                <div className="p-4 flex items-center gap-3">
                  {editingId === list._id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(list._id); if (e.key === 'Escape') setEditingId(null) }}
                        className="flex-1 text-sm font-body border border-earth-200 rounded-lg px-2 py-1 outline-none"
                      />
                      <button onClick={() => handleRename(list._id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1 text-earth-400 hover:bg-earth-100 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpanded(expanded === list._id ? null : list._id)}>
                        <p className="font-body font-semibold text-earth-900 text-sm">{list.name}</p>
                        <p className="text-earth-400 text-xs font-body mt-0.5">
                          {list.items?.length || 0} item{list.items?.length !== 1 ? 's' : ''}
                        </p>
                      </button>
                      <button
                        onClick={() => handleLoadToCart(list)}
                        title="Load to cart"
                        className="p-2 rounded-xl text-brand-600 hover:bg-brand-50 border border-brand-100 transition-colors">
                        <ShoppingCart size={15} />
                      </button>
                      <button
                        onClick={() => { setEditingId(list._id); setEditName(list.name) }}
                        className="p-2 rounded-xl text-earth-500 hover:bg-earth-100 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(list._id)}
                        disabled={deleting === list._id}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* Expanded items */}
                {expanded === list._id && list.items?.length > 0 && (
                  <div className="border-t border-earth-100">
                    {list.items.map((item, i) => (
                      <div key={i}
                        className="px-4 py-2.5 flex items-center justify-between border-b border-earth-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-body font-semibold text-earth-800 truncate">{item.productName}</p>
                          <p className="text-xs font-body text-earth-400">{item.variety} · {item.packaging}</p>
                        </div>
                        <span className="text-xs font-body font-semibold text-earth-700 ml-3 flex-shrink-0">
                          × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-brand-50 border border-brand-100 rounded-2xl p-4">
          <p className="text-xs font-body text-earth-600">
            <span className="font-semibold text-brand-700">Tip:</span> Add products to a list from the shop, then load the whole list into your cart at once.
          </p>
        </div>
      </div>
    </div>
  )
}
