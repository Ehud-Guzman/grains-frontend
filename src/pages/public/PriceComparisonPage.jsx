import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Search, X, Scale } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { productService } from '../../services/product.service'
import { formatKES } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'

const MAX_PRODUCTS = 4
const COLORS = ['#C8912A', '#3B82F6', '#22C55E', '#EF4444']

export default function PriceComparisonPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState([]) // [{_id, name}]
  const [series, setSeries] = useState({})     // { [_id]: [{date, price}] }
  const [loadingIds, setLoadingIds] = useState([])
  const debounceRef = useRef(null)

  // Prefill from ?product=<id> if provided (e.g. linked from a product page)
  useEffect(() => {
    const initialId = searchParams.get('product')
    if (!initialId) return
    productService.getById(initialId)
      .then(res => {
        const p = res.data.data
        setSelected([{ _id: p._id, name: p.name }])
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => {
      productService.getSuggestions(query.trim())
        .then(res => setSuggestions(res.data?.data || []))
        .catch(() => setSuggestions([]))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const addProduct = (p) => {
    if (selected.some(s => s._id === p._id) || selected.length >= MAX_PRODUCTS) return
    setSelected(prev => [...prev, { _id: p._id, name: p.name }])
    setQuery('')
    setSuggestions([])
  }

  const removeProduct = (id) => {
    setSelected(prev => prev.filter(s => s._id !== id))
    setSeries(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  // Fetch price history for any newly selected product (default = first variety/packaging)
  useEffect(() => {
    const toFetch = selected.filter(s => !series[s._id] && !loadingIds.includes(s._id))
    if (!toFetch.length) return

    setLoadingIds(prev => [...prev, ...toFetch.map(s => s._id)])

    toFetch.forEach(({ _id }) => {
      productService.getById(_id)
        .then(res => {
          const p = res.data.data
          const variety = p.varieties?.[0]
          const pkg = variety?.packaging?.find(pk => !pk.quoteOnly) || variety?.packaging?.[0]
          if (!variety || !pkg) return Promise.resolve([])
          return productService.getPriceHistory(_id, variety.varietyName, pkg.size)
            .then(r => (r.data?.data || []).slice().reverse())
        })
        .then(history => {
          setSeries(prev => ({
            ...prev,
            [_id]: (history || []).map(l => ({
              date: new Date(l.changedAt).toISOString().slice(0, 10),
              price: l.newPrice,
            })),
          }))
        })
        .catch(() => setSeries(prev => ({ ...prev, [_id]: [] })))
        .finally(() => setLoadingIds(prev => prev.filter(id => id !== _id)))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // Merge all series into one date-indexed dataset for a multi-line chart
  const allDates = Array.from(new Set(
    Object.values(series).flat().map(pt => pt.date)
  )).sort()

  const chartData = allDates.map(date => {
    const row = { date }
    selected.forEach(({ _id }) => {
      const pt = (series[_id] || []).find(p => p.date === date)
      if (pt) row[_id] = pt.price
    })
    return row
  })

  const anyLoading = loadingIds.length > 0

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-earth-100 sticky top-0 z-10">
        <div className="container-page max-w-3xl h-14 flex items-center gap-3">
          <Link to="/shop" className="p-1.5 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-brand-600" />
            <span className="font-display font-bold text-earth-900 text-base">Compare Prices</span>
          </div>
        </div>
      </div>

      <div className="container-page max-w-3xl py-5">
        <p className="text-earth-500 text-sm font-body mb-4">
          Add up to {MAX_PRODUCTS} products to compare their price trends side by side.
        </p>

        {/* Search + add */}
        {selected.length < MAX_PRODUCTS && (
          <div className="relative mb-4">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for a product to add…"
                className="w-full border border-earth-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-body
                  text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                  focus:ring-brand-400 focus:border-transparent bg-white"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1.5 w-full bg-white border border-earth-100 rounded-xl shadow-warm overflow-hidden">
                {suggestions.map(s => (
                  <button key={s._id} onClick={() => addProduct(s)}
                    className="w-full text-left px-4 py-2.5 text-sm font-body text-earth-700 hover:bg-earth-50 transition-colors">
                    {s.name} <span className="text-earth-400 text-xs">· {s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selected.map((s, i) => (
              <span key={s._id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-semibold"
                style={{ backgroundColor: `${COLORS[i % COLORS.length]}1a`, color: COLORS[i % COLORS.length] }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {s.name}
                <button onClick={() => removeProduct(s._id)} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
          {selected.length === 0 ? (
            <div className="text-center py-16">
              <Scale size={28} className="text-earth-300 mx-auto mb-3" />
              <p className="text-earth-500 font-body font-medium">Add products above to compare price trends</p>
            </div>
          ) : anyLoading && chartData.length === 0 ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-earth-500 font-body font-medium">Not enough price history yet for these products</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" vertical={false} />
                <XAxis dataKey="date"
                  tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v, name) => [formatKES(v), selected.find(s => s._id === name)?.name || name]}
                  contentStyle={{ fontFamily: 'Outfit', fontSize: 12, borderRadius: 10, border: '1px solid #E8DDD0' }}
                />
                <Legend
                  formatter={(value) => selected.find(s => s._id === value)?.name || value}
                  wrapperStyle={{ fontSize: 12, fontFamily: 'Outfit' }}
                />
                {selected.map((s, i) => (
                  <Line key={s._id} type="monotone" dataKey={s._id}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                    dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
