// Screenshots of the admin shell and dashboard at several screen sizes, with the API mocked, so
// a layout change can be reviewed (and overflow checked) without a backend or any real data.
//
//   1. Start the dev server pointing at a dead API address:
//        VITE_API_URL=http://localhost:5055/api npx vite --port 5199 --strictPort
//   2. node scripts/admin-screenshots.cjs [outDir]      (default: ./admin-screenshots)
//
// Needs Playwright (`npm i -g playwright`, or set NODE_PATH to wherever it is installed).
// It does not diff images against a baseline: it writes PNGs for a human to look at and exits
// non-zero if any page scrolls sideways or throws, which is the part a machine can judge.
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const BASE = process.env.BASE_URL || 'http://localhost:5199'
const API_ORIGIN = 'http://localhost:5055'
const OUT = path.resolve(process.argv[2] || 'admin-screenshots')
fs.mkdirSync(OUT, { recursive: true })

const day = (i) => new Date(Date.now() - (29 - i) * 864e5).toISOString()
const order = (i, status) => ({
  _id: `o${i}`, orderRef: `NAI-2026-01${40 + i}`, status, total: 4200 + i * 1350, deliveryMethod: 'delivery',
  createdAt: new Date(Date.now() - i * 36e5 * 3).toISOString(),
  userId: { name: ['Mama Njeri', 'Otieno Traders', 'Kamau Hotel', 'Wanjiku'][i % 4] },
})
const ORDERS = ['pending', 'approved', 'preparing', 'out_for_delivery', 'completed', 'completed', 'pending'].map((s, i) => order(i, s))
const KPIS = {
  ordersToday: 12, pendingOrders: 5, revenueToday: 86400, revenueThisMonth: 1284500, lowStockCount: 4,
  comparison: { ordersYesterday: 9, revenueYesterday: 98000 },
  recentOrders: ORDERS,
  cashFlow: { paidRevenue: 940000, unpaidRevenue: 344500, paidOrders: 61, unpaidOrders: 17 },
}

const mocks = (role) => ({
  '/auth/refresh': { success: true, data: { accessToken: 't', user: { id: 'u1', name: 'Wanjiru Kamau', role } } },
  '/admin/reports/kpis': { data: KPIS },
  '/admin/stock/low': { data: [
    { productName: 'Pishori Rice', varietyName: 'Premium', packagingSize: '25kg', stock: 0, lowStockThreshold: 10 },
    { productName: 'Maize Flour', varietyName: 'Sifted', packagingSize: '50kg', stock: 3, lowStockThreshold: 15 },
  ] },
  '/admin/reports/sales': { data: { byDay: Array.from({ length: 30 }, (_, i) => ({
    date: day(i), revenue: 20000 + Math.round(Math.abs(Math.sin(i / 3)) * 60000) + i * 800, orders: 5 + (i % 7) })) } },
  '/admin/reports/best-sellers': { data: { products: [
    { productName: 'Maize Flour', variety: 'Sifted', packaging: '2kg', unitsSold: 340 },
    { productName: 'Pishori Rice', variety: 'Premium', packaging: '5kg', unitsSold: 212 },
    { productName: 'Wheat Flour', variety: 'White', packaging: '2kg', unitsSold: 168 },
  ] } },
  '/admin/orders': { data: ORDERS, pagination: { total: 5, page: 1, pages: 1 } },
  // Shape follows the Control Center test fixture (src/pages/admin/control/ControlCenterPage.test.jsx).
  '/admin/control-center/overview': { data: { generatedAt: new Date().toISOString(),
    health: {
      api: { uptimeSeconds: 3700, node: 'v22', environment: 'production', memoryMb: 180, restoreInProgress: false },
      database: { connected: true, name: 'grains' },
      config: [
        { id: 'sms', label: 'SMS (Africa’s Talking)', ok: false, value: 'sandbox', note: 'Sandbox account.', severity: 'info' },
        { id: 'email', label: 'Email (Gmail)', ok: true, value: 'configured', note: 'Ready.', severity: 'info' },
      ],
    },
    attention: [
      { id: 'a', severity: 'high', title: 'There is no backup', detail: 'Nothing has been backed up yet.', link: 'data' },
      { id: 'b', severity: 'medium', title: 'Nakuru branch is locked', detail: 'New orders are blocked there.', link: 'switches' },
      { id: 'c', severity: 'info', title: 'Only one superadmin', detail: 'Add a second for recovery.', link: 'accounts' },
    ],
    branches: [{ id: 'b1', name: 'Nairobi Branch', slug: 'nairobi', location: 'CBD', isActive: true, isDefault: true, hasCoordinates: true, maintenanceMessage: '',
      figures: { pendingOrders: 4, oldestPendingAt: new Date(Date.now() - 30 * 36e5).toISOString(), ordersToday: 10, paidRevenueToday: 30000,
        codUnsettledCount: 2, codUnsettledAmount: 8000, codOldestAt: null, etimsFailed: 0, lowStockLines: 3 },
      switches: { platformLocked: false, maintenanceMode: true, allowGuestOrders: true } }],
    accounts: { total: 3, locked: 1, byRole: {}, signedInToday: 2 },
    backups: { total: 0, totalSizeBytes: 0, latestBackupAt: null, encrypted: false },
    jobs: [{ name: 'cleanup', label: 'Log and guest cleanup', schedule: 'Daily', description: 'Deletes old logs.', pauseEffect: 'Nothing is deleted.', paused: false, lastRun: null }],
    security: { failedLogins24h: 12, accountLocks24h: 1 },
    switchDefinitions: [
      { key: 'platformLocked', label: 'Lock all changes', group: 'emergency', risky: true, description: 'Freeze the branch.' },
      { key: 'maintenanceMode', label: 'Maintenance mode', group: 'emergency', risky: true, description: 'No orders.' },
      { key: 'allowGuestOrders', label: 'Guest checkout', group: 'checkout', description: 'Order without an account.' },
    ] } },
  '/admin/control-center/accounts': { data: [
    { id: 'sa1', name: 'Owner', phone: '0700000001', role: 'superadmin', branchName: null, isLocked: false, failedLoginCount: 0, lastLoginAt: new Date().toISOString(), lastLoginIp: '1.1.1.1', sessionsRevokedAt: null },
    { id: 'a2', name: 'Branch Admin', phone: '0700000002', role: 'admin', branchName: 'Nairobi Branch', isLocked: true, failedLoginCount: 5, lastLoginAt: null, lastLoginIp: null, sessionsRevokedAt: null },
  ] },
  '/admin/control-center/security': { data: { days: 7, totals: {}, events: [], failedLoginsByIp: [], failedLoginsByAccount: [] } },
  '/admin/logs': { data: { logs: [] } },
  // List pages: empty lists still render the page chrome (headers, filters, buttons, empty states).
  '/admin/coupons': { data: [] },
  '/admin/drivers': { data: [] },
  '/admin/stock': { data: [] },
  '/admin/products': { data: [] },
  '/admin/customers': { data: { customers: [] }, pagination: { page: 1, pages: 1, total: 0 } },
  '/admin/alerts': { data: {
    lowStock: { count: 2, items: [{ productName: 'Pishori Rice', varietyName: 'Premium', packagingSize: '25kg', stock: 0, lowStockThreshold: 10 },
      { productName: 'Maize Flour', varietyName: 'Sifted', packagingSize: '50kg', stock: 3, lowStockThreshold: 15 }] },
    dormantCustomers: { d30: 4, d60: 2, d90: 1, customers: [] },
    paymentFailures: { count: 1, items: [] }, etimsFailures: { count: 0, items: [] },
    orderSpike: { isSpike: true, todayCount: 31, dailyAvg: 12 },
  } },
})

async function shoot(browser, { role, name, width, height = 1400, url = '/admin/dashboard', theme = 'light', act }) {
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  const table = mocks(role)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route(`${API_ORIGIN}/**`, (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const hit = Object.keys(table).find((k) => p === k || p.startsWith(`${k}/`))
    route.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': BASE, 'access-control-allow-credentials': 'true' },
      body: JSON.stringify(hit ? table[hit] : { success: true, data: {} }),
    })
  })
  await page.addInitScript(([r, t]) => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Wanjiru Kamau', role: r }))
    localStorage.setItem('currentBranch', JSON.stringify({ id: 'b1', name: 'Nairobi Branch' }))
    localStorage.setItem('admin.theme', t)
  }, [role, theme])
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  if (act) { await act(page); await page.waitForTimeout(500) } // let lazy chunks and transitions settle
  // Sideways scroll = something is wider than the screen. Decorative blobs clipped by an
  // overflow-hidden parent are not a problem, so measure the scrollable areas, not every element.
  const overflow = await page.evaluate(() => {
    const main = document.getElementById('main')
    return Math.max(document.documentElement.scrollWidth - window.innerWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  await ctx.close()
  return { name, overflow, errors }
}

;(async () => {
  const browser = await chromium.launch()
  const runs = []
  for (const role of ['admin', 'staff', 'superadmin']) {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      runs.push({ role, width, name: `${role}-${width}` })
    }
  }
  // Dark theme: the same pages, plus a spread of others so a colour that only one page uses is seen.
  for (const [name, url] of [['dashboard', '/admin/dashboard'], ['orders', '/admin/orders'], ['coupons', '/admin/coupons'],
    ['drivers', '/admin/drivers'], ['customers', '/admin/customers'], ['reports', '/admin/reports'], ['stock', '/admin/stock'],
    ['alerts', '/admin/alerts'], ['settings', '/admin/settings'], ['products', '/admin/products']]) {
    runs.push({ role: 'admin', width: 1280, height: 900, theme: 'dark', url, name: `dark-admin-${name}`, soft: !['dashboard', 'orders'].includes(name) })
  }
  runs.push(
    { role: 'superadmin', width: 1280, height: 900, theme: 'dark', name: 'dark-superadmin-dashboard' },
    { role: 'superadmin', width: 1280, height: 900, theme: 'dark', url: '/admin/control-center', name: 'dark-superadmin-control-center', soft: true },
    { role: 'staff', width: 1280, height: 800, theme: 'dark', name: 'dark-staff-dashboard' },
    { role: 'admin', width: 390, height: 1700, theme: 'dark', name: 'dark-admin-390' },
    { role: 'admin', width: 390, height: 800, theme: 'dark', name: 'dark-admin-mobile-drawer',
      act: (p) => p.getByRole('button', { name: 'Open navigation menu' }).click() },
    { role: 'admin', width: 1280, height: 800, theme: 'dark', name: 'dark-admin-search-palette',
      act: async (p) => { await p.keyboard.press('Control+k'); await p.getByRole('dialog').waitFor(); await p.keyboard.type('co') } },
    { role: 'admin', width: 1280, height: 800, theme: 'dark', name: 'dark-admin-help-panel', soft: true,
      act: async (p) => { await p.getByRole('button', { name: 'Ask the help assistant' }).click(); await p.getByRole('dialog').waitFor() } },
    { role: 'admin', width: 1280, height: 900, theme: 'dark', name: 'dark-admin-bell', soft: true,
      act: (p) => p.getByRole('button', { name: /alerts/i }).first().click() },
    { role: 'admin', width: 1280, height: 800, theme: 'dark', name: 'dark-admin-collapsed-sidebar',
      act: (p) => p.getByRole('button', { name: 'Collapse sidebar' }).click() },
    { role: 'admin', width: 1280, height: 800, theme: 'system', name: 'admin-theme-auto-light-os' },
  )
  runs.push(
    { role: 'admin', width: 1280, height: 800, name: 'admin-collapsed-sidebar',
      act: (p) => p.getByRole('button', { name: 'Collapse sidebar' }).click() },
    { role: 'admin', width: 390, height: 800, name: 'admin-mobile-drawer',
      act: (p) => p.getByRole('button', { name: 'Open navigation menu' }).click() },
    { role: 'admin', width: 1280, height: 800, name: 'admin-search-palette',
      act: async (p) => { await p.keyboard.press('Control+k'); await p.getByRole('dialog').waitFor(); await p.keyboard.type('co') } },
    { role: 'admin', width: 1280, height: 900, name: 'admin-orders-page', url: '/admin/orders' },
  )

  let failed = false
  for (const run of runs) {
    const { name, overflow, errors } = await shoot(browser, run)
    // Pages whose mocks are only partly faithful may throw for reasons that are not the page's
    // fault; only the core runs (no `soft`) fail the script on an error.
    const bad = overflow > 0 || (errors.length > 0 && !run.soft)
    if (bad) failed = true
    console.log(`${bad ? 'FAIL' : 'ok  '} ${name}${overflow > 0 ? ` (scrolls ${overflow}px sideways)` : ''}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`)
  }
  await browser.close()
  console.log(`\nScreenshots in ${OUT}`)
  process.exit(failed ? 1 : 0)
})()
