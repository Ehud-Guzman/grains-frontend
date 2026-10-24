import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Download, TrendingUp, TrendingDown, Package, Users, ShoppingCart, BarChart3, Printer, LifeBuoy,
  Percent, Bike, Receipt, RefreshCw, History, AlertCircle, FileDown, Wallet,
} from 'lucide-react'
import { runInLightTheme } from '../../../components/admin/adminTheme'
import { adminReportService } from '../../../services/admin/report.service'
import { useShopInfo } from '../../../context/AppSettingsContext'
import { useAuth } from '../../../context/AuthContext'
import { OnboardingReturnLink } from '../../../components/onboarding/OnboardingEnhancements'
import Spinner from '../../../components/ui/Spinner'
import CashUpTab from './CashUpTab'
import { ReportViewContext } from './ReportTable'
import { PRINT_STYLES, PrintHeader, PrintFooter } from './reportUi'
import { SalesTab, ProductsTab, OrdersTab, CustomersTab } from './SalesTabs'
import { StockTab, TurnoverTab, SlowMoversTab, MovementTab } from './StockTabs'
import { MarginsTab, VatTab, RidersTab, OnboardingTab } from './MoneyTabs'
import { PERIODS, isRolling, periodParams, periodLabel, eatToday } from './reportPeriods'
import toast from 'react-hot-toast'

const EXPORT_ROLES = ['admin', 'superadmin'] // must mirror requireMinRole('admin') on /export/:type

// Every report, once. `period: false` marks the reports that are a snapshot or all-time rather than a window.
const TAB_META = {
  sales:            { label: 'Sales',          icon: TrendingUp,   period: true,  csv: 'sales' },
  products:         { label: 'Products',       icon: Package,      period: true,  csv: 'best-sellers' },
  customers:        { label: 'Customers',      icon: Users,        period: false, csv: 'customers' },
  orders:           { label: 'Orders',         icon: ShoppingCart, period: true,  csv: 'orders' },
  riders:           { label: 'Riders',         icon: Bike,         period: true,  csv: 'riders' },
  stock:            { label: 'Stock value',    icon: BarChart3,    period: false, csv: 'stock-valuation' },
  turnover:         { label: 'Turnover',       icon: RefreshCw,    period: true,  csv: 'stock-turnover' },
  'slow-movers':    { label: 'Slow movers',    icon: TrendingDown, period: false, csv: 'slow-movers' },
  'stock-movement': { label: 'Stock movement', icon: History,      period: true,  csv: 'stock-movement' },
  margins:          { label: 'Margins',        icon: Percent,      period: true,  csv: 'margins' },
  'cash-up':        { label: 'Cash-up',        icon: Wallet,       period: true },
  vat:              { label: 'VAT',            icon: Receipt,      period: true,  csv: 'vat' },
  onboarding:       { label: 'Onboarding',     icon: LifeBuoy,     period: false, csv: 'onboarding' },
}

// Thirteen reports in one strip did not fit a screen and hid the last ones. Grouped by the question they answer.
const GROUPS = [
  { key: 'sales',      label: 'Sales',               tabs: ['sales', 'products', 'customers'] },
  { key: 'operations', label: 'Orders & deliveries', tabs: ['orders', 'riders'] },
  { key: 'stock',      label: 'Stock',               tabs: ['stock', 'turnover', 'slow-movers', 'stock-movement'] },
  { key: 'money',      label: 'Money & tax',         tabs: ['margins', 'cash-up', 'vat'] },
  // Training analytics for the owner, not a business report: kept out of everyone else's way.
  { key: 'system',     label: 'System',              tabs: ['onboarding'], superadminOnly: true },
]
const groupOf = (tab) => GROUPS.find(g => g.tabs.includes(tab))

// Two frames: one for React to render, one for the browser to paint.
const nextPaint = () => new Promise(resolve => (typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame(() => requestAnimationFrame(resolve))
  : setTimeout(resolve, 50)))

export default function ReportsPage() {
  const shopInfo = useShopInfo()
  const { user } = useAuth()
  const canExport = EXPORT_ROLES.includes(user?.role)
  const isSuper = user?.role === 'superadmin'

  const [tab, setTab] = useState('sales')
  const [period, setPeriod] = useState('month')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [slowDays, setSlowDays] = useState(30)
  const [segment, setSegment] = useState('all')
  const [custPage, setCustPage] = useState(1)
  const [reloads, setReloads] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [expandAll, setExpandAll] = useState(false)
  // What the last request brought back, stamped with the question it answered. The page only shows it
  // while that stamp still matches what is asked for now, so a slow answer to an earlier tab or period can
  // never appear under the wrong heading (and nothing has to be reset by hand when the choice changes).
  const [loaded, setLoaded] = useState({ key: null, data: null, error: false })
  const reportRef = useRef(null)
  const latestKey = useRef(null)

  const meta = TAB_META[tab]
  const params = useMemo(() => periodParams(period, custom, eatToday()), [period, custom])
  const needsDates = meta.period && !params

  // The question being asked: everything that changes the answer.
  const key = useMemo(() => JSON.stringify([
    tab, meta.period ? params : null, tab === 'slow-movers' ? slowDays : null,
    tab === 'customers' ? [segment, custPage] : null, reloads,
  ]), [tab, meta.period, params, slowDays, segment, custPage, reloads])

  useEffect(() => {
    latestKey.current = key
    if (needsDates) return
    let request
    if (tab === 'sales')               request = adminReportService.getSales(params)
    else if (tab === 'products')       request = adminReportService.getBestSellers({ ...params, limit: 20 })
    else if (tab === 'stock')          request = adminReportService.getStockValuation()
    else if (tab === 'turnover')       request = adminReportService.getStockTurnover(params)
    else if (tab === 'slow-movers')    request = adminReportService.getSlowMovers({ days: slowDays })
    else if (tab === 'stock-movement') request = adminReportService.getStockMovement(params)
    else if (tab === 'customers')      request = adminReportService.getCustomers({ segment, page: custPage })
    else if (tab === 'orders')         request = adminReportService.getOrders(params)
    else if (tab === 'margins')        request = adminReportService.getMargins(params)
    else if (tab === 'riders')         request = adminReportService.getRiders(params)
    else if (tab === 'cash-up')        request = adminReportService.getCashUp(params)
    else if (tab === 'onboarding')     request = adminReportService.getOnboarding()
    else if (tab === 'vat')            request = adminReportService.getVat(params)
    else return
    const asked = key
    request
      .then(res => { if (latestKey.current === asked) setLoaded({ key: asked, data: res.data.data, error: false }) })
      // The API interceptor has already shown a toast; here the page just offers a retry.
      .catch(() => { if (latestKey.current === asked) setLoaded({ key: asked, data: null, error: true }) })
  }, [key, tab, params, needsDates, slowDays, segment, custPage])

  const ready = loaded.key === key
  const data = ready ? loaded.data : null
  const loading = !needsDates && !ready
  const loadError = ready && loaded.error

  // ── choices ───────────────────────────────────────────────────────────────
  const selectTab = (next) => {
    setTab(next)
    // The VAT return is monthly: a rolling window would hand back two part-months.
    if (next === 'vat' && isRolling(period)) setPeriod('last-month')
  }
  const selectGroup = (g) => { if (!g.tabs.includes(tab)) selectTab(g.tabs[0]) }
  const selectSegment = (s) => { setSegment(s); setCustPage(1) }

  // Part of the file name: the dates, the window, or "all-time" for a snapshot report with no period.
  const slug = !meta.period ? 'all-time' : params?.from ? `${params.from}_to_${params.to}` : (params?.period || 'all-time')
  const periodText = tab === 'slow-movers' ? `No sale in ${slowDays} days`
    : meta.period ? periodLabel(period, custom, eatToday()) : 'All time'

  // ── export / print ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canExport) return
    if (!meta.csv) { toast('Use Print or PDF for this report'); return }
    setExporting(true)
    try {
      const query = meta.period ? params : tab === 'slow-movers' ? { days: slowDays } : {}
      const res = await adminReportService.exportCSV(meta.csv, query)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `vittorios-${tab}-${slug}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  // The tables show 25 rows at a time on screen, but a printed or downloaded report must carry every row, so
  // they are all opened first and put back afterwards.
  const handlePrint = async () => {
    setExpandAll(true)
    await nextPaint()
    window.addEventListener('afterprint', () => setExpandAll(false), { once: true })
    window.print()
  }

  // Same html2canvas + jsPDF stack the receipt uses, so a downloaded report matches the printed one rather than
  // being a second rendering path. Unlike the receipt this paginates onto standard A4: reports run to many pages,
  // and one very tall custom-size page is useless to anyone printing or filing it.
  const handlePdf = async () => {
    const el = reportRef.current
    if (!el || pdfBusy) return
    setPdfBusy(true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // keep sticky admin chrome from shifting the capture
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      setExpandAll(true)
      await nextPaint()
      // Captured in light colours whatever the screen theme: the sheet is white paper.
      const canvas = await runInLightTheme(() => html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        // The letterhead and footer are .print-only, i.e. display:none on screen: force them on inside the
        // clone so the PDF carries the same header and footer as the printed copy. The screen rule is
        // `display: none !important`, which a plain inline style cannot beat, so this one is !important too.
        // Search boxes, filters and pagers are screen controls and stay out of the sheet.
        onclone: (doc) => {
          doc.querySelectorAll('.print-only').forEach(n => { n.style.setProperty('display', 'block', 'important') })
          doc.querySelectorAll('[data-no-print]').forEach(n => { n.style.display = 'none' })
        },
      }))

      const PAGE_W = 210, PAGE_H = 297, MARGIN = 10
      const contentW = PAGE_W - MARGIN * 2
      const contentH = PAGE_H - MARGIN * 2
      const pxPerMm = canvas.width / contentW
      const maxSlice = Math.floor(contentH * pxPerMm)

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Prefer to break on a fully white row, so a page break lands between table rows instead of bisecting
      // one (or a totals block). Best-effort: if the pixels can't be read this way the ideal cut still yields
      // a valid page.
      let ctx = null
      try { ctx = canvas.getContext('2d', { willReadFrequently: true }) } catch { ctx = null }
      const isBlankRow = (y) => {
        if (!ctx) return false
        try {
          const row = ctx.getImageData(0, y, canvas.width, 1).data
          for (let i = 0; i < row.length; i += 4) {
            if (row[i] < 248 || row[i + 1] < 248 || row[i + 2] < 248) return false
          }
          return true
        } catch { return false }
      }

      const slice = document.createElement('canvas')
      const sliceCtx = slice.getContext('2d')
      let y = 0
      let page = 0
      while (y < canvas.height) {
        let h = Math.min(maxSlice, canvas.height - y)
        if (h < 1) break
        if (y + h < canvas.height) {
          const floor = Math.floor(h * 0.85)
          for (let probe = h; probe > floor; probe--) {
            if (isBlankRow(y + probe)) { h = probe; break }
          }
        }
        slice.width = canvas.width
        slice.height = h
        sliceCtx.fillStyle = '#ffffff'
        sliceCtx.fillRect(0, 0, slice.width, slice.height)
        sliceCtx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
        if (page > 0) pdf.addPage()
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, contentW, h / pxPerMm)
        page++
        y += h
      }

      pdf.save(`vittorios-${tab}-${slug}.pdf`)
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed — use Print instead')
    } finally {
      document.body.style.overflow = prevOverflow
      setExpandAll(false)
      setPdfBusy(false)
    }
  }

  const visibleGroups = GROUPS.filter(g => !g.superadminOnly || isSuper)
  const currentGroup = groupOf(tab)
  const today = eatToday()

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" data-no-print>
          <div>
            <div className="mb-3"><OnboardingReturnLink /></div>
            <h1 className="text-2xl font-admin font-bold text-admin-900">Reports</h1>
            <p className="text-admin-500 text-xs font-admin mt-0.5">Analytics and data exports</p>
          </div>
          {/* Wraps on narrow phones — the title plus three actions do not fit on a single row at 360px. */}
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={handlePdf} disabled={pdfBusy || loading || !data}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-admin-200 text-admin-700 rounded-xl text-sm font-admin font-semibold hover:bg-admin-50 disabled:opacity-50 transition-colors shadow-admin">
              <FileDown size={15} aria-hidden="true" /> {pdfBusy ? 'Generating…' : 'PDF'}
            </button>
            <button type="button" onClick={handlePrint} disabled={!data}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-admin-200 text-admin-700 rounded-xl text-sm font-admin font-semibold hover:bg-admin-50 disabled:opacity-50 transition-colors shadow-admin">
              <Printer size={15} aria-hidden="true" /> Print
            </button>
            {canExport && (
              <button type="button" onClick={handleExport} disabled={exporting || loading || !data}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-admin font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-admin">
                <Download size={15} aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
          </div>
        </div>

        {/* ── Report picker: what are you trying to find out? ─────── */}
        <nav aria-label="Report sections" className="mb-5 space-y-2" data-no-print>
          <div className="flex gap-1 bg-admin-100 p-1 rounded-xl overflow-x-auto">
            {visibleGroups.map(g => {
              const on = g.key === currentGroup?.key
              return (
                <button key={g.key} type="button" onClick={() => selectGroup(g)} aria-current={on ? 'true' : undefined}
                  className={`px-4 py-2 rounded-lg text-sm font-admin font-semibold whitespace-nowrap transition-all ${
                    on ? 'bg-white text-admin-900 shadow-admin' : 'text-admin-500 hover:text-admin-700'}`}>
                  {g.label}
                </button>
              )
            })}
          </div>
          {currentGroup && currentGroup.tabs.length > 1 && (
            <div role="tablist" aria-label={`${currentGroup.label} reports`} className="flex gap-1 overflow-x-auto border-b border-admin-200">
              {currentGroup.tabs.map(k => {
                const m = TAB_META[k]
                const on = k === tab
                return (
                  <button key={k} type="button" role="tab" aria-selected={on} onClick={() => selectTab(k)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 -mb-px text-sm font-admin font-semibold whitespace-nowrap border-b-2 transition-colors ${
                      on ? 'border-shell-600 text-admin-900' : 'border-transparent text-admin-500 hover:text-admin-700'}`}>
                    <m.icon size={14} aria-hidden="true" /> {m.label}
                  </button>
                )
              })}
            </div>
          )}
        </nav>

        {/* ── Period ───────────────────────────────────────────────── */}
        {meta.period && (
          <div className="mb-5 space-y-3" data-no-print>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
              {PERIODS.map(p => (
                <button key={p.value} type="button" onClick={() => setPeriod(p.value)} aria-pressed={period === p.value}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold transition-all border ${
                    period === p.value
                      ? 'bg-shell-800 text-white border-shell-800 shadow-sm'
                      : 'bg-white border-admin-200 text-admin-600 hover:border-admin-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-admin font-semibold text-admin-600">
                  From
                  <input type="date" value={custom.from} max={custom.to || today}
                    onChange={(e) => setCustom(c => ({ ...c, from: e.target.value }))}
                    className="block mt-1 px-3 py-2 min-h-[40px] rounded-lg border border-admin-200 bg-white text-sm font-admin text-admin-800 focus:outline-none focus:border-shell-400" />
                </label>
                <label className="text-xs font-admin font-semibold text-admin-600">
                  To
                  <input type="date" value={custom.to} min={custom.from || undefined} max={today}
                    onChange={(e) => setCustom(c => ({ ...c, to: e.target.value }))}
                    className="block mt-1 px-3 py-2 min-h-[40px] rounded-lg border border-admin-200 bg-white text-sm font-admin text-admin-800 focus:outline-none focus:border-shell-400" />
                </label>
                {custom.from && custom.to && custom.from > custom.to && (
                  <p role="alert" className="text-xs font-admin font-semibold text-red-600 pb-2.5">The start date is after the end date.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Print area (wraps all reportable content) ─────────────── */}
        <ReportViewContext.Provider value={{ expandAll }}>
          <div className="print-area" ref={reportRef}>
            <PrintHeader shopInfo={shopInfo} tabLabel={meta.label} periodText={periodText} />

            {needsDates ? (
              <div className="bg-white rounded-xl border border-admin-200 p-12 text-center">
                <BarChart3 size={28} className="text-admin-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-admin-600 font-admin font-medium">Pick a start and an end date to see this report.</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : loadError ? (
              <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
                <AlertCircle size={28} className="text-red-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-admin-600 font-admin font-medium mb-3">Couldn&apos;t load this report</p>
                <button type="button" onClick={() => setReloads(n => n + 1)}
                  className="px-4 py-2 bg-shell-800 text-white rounded-lg text-sm font-admin font-semibold hover:bg-shell-700 transition-colors">
                  Retry
                </button>
              </div>
            ) : !data ? (
              <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
                <BarChart3 size={28} className="text-admin-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-admin-600 font-admin font-medium">No data available for this period</p>
              </div>
            ) : (
              <div className="space-y-5">
                {tab === 'sales' && <SalesTab data={data} />}
                {tab === 'products' && <ProductsTab data={data} />}
                {tab === 'customers' && <CustomersTab data={data} segment={segment} onSegment={selectSegment} onPage={setCustPage} />}
                {tab === 'orders' && <OrdersTab data={data} />}
                {tab === 'riders' && <RidersTab data={data} />}
                {tab === 'stock' && <StockTab data={data} />}
                {tab === 'turnover' && <TurnoverTab data={data} />}
                {tab === 'slow-movers' && <SlowMoversTab data={data} days={slowDays} onDays={setSlowDays} />}
                {tab === 'stock-movement' && <MovementTab data={data} />}
                {tab === 'margins' && <MarginsTab data={data} />}
                {tab === 'cash-up' && (
                  <CashUpTab data={data} canClose={['supervisor', 'admin'].includes(user?.role)} onChanged={() => setReloads(n => n + 1)} />
                )}
                {tab === 'vat' && <VatTab data={data} rolling={isRolling(period)} />}
                {tab === 'onboarding' && <OnboardingTab data={data} />}
              </div>
            )}

            {data && <PrintFooter shopInfo={shopInfo} />}
          </div>
        </ReportViewContext.Provider>
      </div>
    </>
  )
}
