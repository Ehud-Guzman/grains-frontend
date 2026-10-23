import { createContext, useContext, useMemo, useState } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

// The table every report uses. Long ones (stock, turnover, margins: 100-300 rows) get search, sortable
// columns, filter chips and "show more", so a report is something you can answer a question from rather
// than a page to scroll. Short ones just render.
//
// Props
//   headers     [{ label, right?, sort?: (row) => comparable, className? }]   a header with `sort` becomes a button;
//               `className` is for hiding a column on phones (hidden sm:table-cell), applied to the header only:
//               the row's own cell needs the same class
//   rows        the full list; this component filters, sorts and trims it
//   renderRow   (row, indexInView) => <tr>
//   searchText  (row) => string          turns on the search box
//   chips       [{ key, label, test: (row) => boolean }]   one-at-a-time filters, "All" is implicit
//   defaultSort { label, dir }           which header starts sorted (label of that header)
//   pageSize    rows per "show more" step (default 25); a list this short or shorter shows no footer
//   pagination  { page, pages, total, onPage }   when the SERVER pages the list (customers); the table then
//               shows what it is given and renders a Previous/Next pager
//
// Print and PDF must carry every row, not the first 25, so the page flips `expandAll` while it captures.
// All the interactive controls carry data-no-print and stay out of the printed sheet.

export const ReportViewContext = createContext({ expandAll: false })

// Ascending order of two present values.
const compare = (a, b) => {
  if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' })
  return a - b
}

// Empty values sink to the bottom whichever way the column is sorted. That has to be decided BEFORE the
// direction is applied: flipping the sign of "empty comes last" would float the empties to the top.
const orderBy = (accessor, dir) => (a, b) => {
  const va = accessor(a)
  const vb = accessor(b)
  if (va == null && vb == null) return 0
  if (va == null) return 1
  if (vb == null) return -1
  return dir * compare(va, vb)
}

export default function DataTable({
  title, subtitle, headers, rows = [], renderRow, emptyMessage = 'No data for this period',
  searchText, chips, defaultSort, pageSize = 25, pagination,
}) {
  const { expandAll } = useContext(ReportViewContext)
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('all')
  const [sort, setSort] = useState(defaultSort ? { label: defaultSort.label, dir: defaultSort.dir || 'desc' } : null)
  const [shown, setShown] = useState(pageSize)

  const needle = query.trim().toLowerCase()
  const activeChip = chips?.find(c => c.key === chip)

  const view = useMemo(() => {
    let list = rows
    if (activeChip) list = list.filter(activeChip.test)
    if (needle && searchText) list = list.filter(r => searchText(r).toLowerCase().includes(needle))
    const header = sort && headers.find(h => h.label === sort.label)
    if (header?.sort) {
      list = [...list].sort(orderBy(header.sort, sort.dir === 'asc' ? 1 : -1))
    }
    return list
  }, [rows, activeChip, needle, searchText, sort, headers])

  const clientPaged = !pagination
  const visible = clientPaged && !expandAll ? view.slice(0, shown) : view
  const filtered = Boolean(needle || activeChip)

  const toggleSort = (label) => {
    setShown(pageSize)
    setSort(cur => (cur?.label === label ? { label, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { label, dir: 'desc' }))
  }
  const onQuery = (v) => { setQuery(v); setShown(pageSize) }
  const onChip = (k) => { setChip(k); setShown(pageSize) }

  const showControls = Boolean(searchText || chips?.length)
  const showFooter = pagination || view.length > pageSize || filtered

  return (
    <section className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
      {(title || showControls) && (
        <div className="px-5 py-4 border-b border-admin-100">
          {title && (
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="font-admin font-bold text-admin-900">{title}</h3>
              {subtitle && <p className="text-xs font-admin text-admin-500">{subtitle}</p>}
            </div>
          )}
          {showControls && (
            <div className={`flex flex-wrap items-center justify-between gap-3 ${title ? 'mt-3' : ''}`} data-no-print>
              {chips?.length ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter rows">
                  {[{ key: 'all', label: 'All' }, ...chips].map(c => (
                    <button key={c.key} type="button" onClick={() => onChip(c.key)} aria-pressed={chip === c.key}
                      className={`px-3 py-1.5 rounded-full text-xs font-admin font-semibold border transition-colors ${
                        chip === c.key
                          ? 'bg-shell-800 text-white border-shell-800'
                          : 'bg-white border-admin-200 text-admin-600 hover:border-admin-400'
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : <span />}
              {searchText && (
                <label className="relative block w-full sm:w-60">
                  <span className="sr-only">Search this table</span>
                  <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-500 pointer-events-none" />
                  <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search…"
                    className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-admin-200 bg-white text-sm font-admin
                      text-admin-800 placeholder:text-admin-500 focus:outline-none focus:border-shell-400" />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-admin">
          <thead>
            <tr className="bg-admin-50/60 border-b border-admin-100">
              {headers.map(h => {
                const sorted = sort?.label === h.label ? sort.dir : null
                return (
                  <th scope="col" key={h.label}
                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-3 sm:px-5 py-3.5 text-xs text-admin-500 font-semibold uppercase tracking-wide ${h.right ? 'text-right' : 'text-left'} ${h.className || ''}`}>
                    {h.sort ? (
                      <button type="button" onClick={() => toggleSort(h.label)} data-sort-button
                        className={`inline-flex items-center gap-1 uppercase tracking-wide font-semibold hover:text-admin-800 transition-colors ${sorted ? 'text-admin-800' : ''}`}>
                        {h.label}
                        {sorted === 'asc' ? <ChevronUp size={12} aria-hidden="true" />
                          : sorted === 'desc' ? <ChevronDown size={12} aria-hidden="true" />
                          : <ChevronsUpDown size={12} aria-hidden="true" className="opacity-40" data-no-print />}
                      </button>
                    ) : h.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-5 py-10 text-center text-admin-500 font-admin text-sm">
                  {filtered ? 'Nothing matches' : emptyMessage}
                </td>
              </tr>
            ) : visible.map((row, i) => renderRow(row, i))}
          </tbody>
        </table>
      </div>

      {showFooter && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-admin-100 bg-admin-50/40" data-no-print>
          <p className="text-xs font-admin text-admin-500" aria-live="polite">
            {pagination
              ? `Page ${pagination.page} of ${pagination.pages} · ${pagination.total.toLocaleString('en-KE')} in total`
              : filtered
                ? `${view.length.toLocaleString('en-KE')} of ${rows.length.toLocaleString('en-KE')} match`
                : `Showing ${Math.min(visible.length, view.length).toLocaleString('en-KE')} of ${view.length.toLocaleString('en-KE')}`}
          </p>
          {pagination ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => pagination.onPage(pagination.page - 1)} disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-admin-200 bg-white text-xs font-admin font-semibold text-admin-700 hover:bg-admin-50 disabled:opacity-40">
                <ChevronLeft size={13} aria-hidden="true" /> Previous
              </button>
              <button type="button" onClick={() => pagination.onPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-admin-200 bg-white text-xs font-admin font-semibold text-admin-700 hover:bg-admin-50 disabled:opacity-40">
                Next <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          ) : visible.length < view.length && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setShown(n => n + pageSize)}
                className="px-3 py-1.5 rounded-lg border border-admin-200 bg-white text-xs font-admin font-semibold text-admin-700 hover:bg-admin-50">
                Show {Math.min(pageSize, view.length - visible.length)} more
              </button>
              <button type="button" onClick={() => setShown(view.length)}
                className="px-3 py-1.5 rounded-lg text-xs font-admin font-semibold text-brand-700 hover:bg-brand-50">
                Show all {view.length.toLocaleString('en-KE')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
