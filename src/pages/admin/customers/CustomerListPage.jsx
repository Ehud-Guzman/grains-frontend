import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, Users } from 'lucide-react'
import { adminCustomerService } from '../../../services/admin/customer.service'
import { formatKES, formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import Pagination from '../../../components/ui/Pagination'

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await adminCustomerService.getAll({ search, page, limit: 20 })
        setCustomers(res.data.data.customers)
        setPagination(res.data.pagination || { page: 1, pages: 1, total: res.data.data.customers.length })
      } catch {}
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search, page])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-admin font-bold text-admin-900">Customers</h1>
        <span className="text-admin-400 text-sm font-admin">{pagination.total} total</span>
      </div>

      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2.5 border border-admin-200 rounded-lg text-sm font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-admin-200 p-12 text-center">
          <Users size={32} className="text-admin-300 mx-auto mb-2" />
          <p className="text-admin-400 font-admin">No customers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-admin">
              <thead>
                <tr className="border-b border-admin-100 bg-admin-50">
                  <th className="px-5 py-3 text-left text-admin-500 font-medium">Customer</th>
                  <th className="px-5 py-3 text-left text-admin-500 font-medium hidden sm:table-cell">Phone</th>
                  <th className="px-5 py-3 text-right text-admin-500 font-medium hidden md:table-cell">Orders</th>
                  <th className="px-5 py-3 text-right text-admin-500 font-medium hidden md:table-cell">Total Spend</th>
                  <th className="px-5 py-3 text-left text-admin-500 font-medium hidden lg:table-cell">Badges</th>
                  <th className="w-10 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-50">
                {customers.map(c => (
                  <tr key={c._id} className="hover:bg-admin-50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 text-xs font-semibold">{c.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-admin-800">{c.name}</p>
                          {c.email && <p className="text-admin-400 text-xs">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-admin-600 hidden sm:table-cell">{c.phone}</td>
                    <td className="px-5 py-3.5 text-right text-admin-700 font-medium hidden md:table-cell">{c.totalOrders || 0}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-admin-800 hidden md:table-cell">{formatKES(c.totalSpend || 0)}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {c.isRepeat && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Repeat</span>}
                        {c.isHighValue && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">High Value</span>}
                        {c.isInactive && <span className="text-xs bg-admin-100 text-admin-500 px-1.5 py-0.5 rounded-full font-medium">Inactive</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/admin/customers/${c._id}`}
                        className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-700 transition-colors block">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  )
}
