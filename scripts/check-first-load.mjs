// Guards the storefront's first-load JavaScript after `npm run build`.
//
// Walks index.html -> entry chunk -> every chunk reachable through STATIC imports (dynamic import()
// is the lazy boundary and is not followed) and fails when:
//   - a heavy lazy-only vendor chunk (jsPDF/html2canvas, charts) is in that graph, or
//   - the gzipped total goes over the budget.
// Background: the 2026-10 audit found vendor-pdf (165KB) loading on every page because the entry
// statically imported Vite's preload helper out of it; nothing noticed for months.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(process.argv[2] || path.join(here, '..', 'dist'))
const BUDGET_GZIP_KB = Number(process.env.FIRST_LOAD_BUDGET_KB || 150)
const FORBIDDEN = [/^vendor-pdf/, /^vendor-charts/, /^index\.es/, /^admin-/, /^driver-/]

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const entry = (html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/) || [])[1]
if (!entry) {
  console.error('check-first-load: no entry <script> found in dist/index.html (did the build run?)')
  process.exit(2)
}
const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])

const seen = new Map()
const visit = (rel, via) => {
  const name = rel.replace(/^\/assets\//, '').replace(/^\.\//, '')
  if (seen.has(name)) return
  const file = path.join(dist, 'assets', name)
  if (!fs.existsSync(file)) return
  const buf = fs.readFileSync(file)
  seen.set(name, { gz: zlib.gzipSync(buf).length, raw: buf.length, via })
  const src = buf.toString('utf8')
  // Static imports only: `import{..}from"./x.js"` and bare `import"./x.js"`.
  for (const m of src.matchAll(/(?:^|[;}\n])\s*import\s*(?:[^"';]*?from)?\s*"\.\/([^"]+\.js)"/g)) visit(m[1], name)
}
visit(entry, 'index.html')
preloads.forEach((p) => visit(p, 'modulepreload'))

const totalGzipKB = [...seen.values()].reduce((s, v) => s + v.gz, 0) / 1024
const offenders = [...seen.keys()].filter((n) => FORBIDDEN.some((re) => re.test(n)))

console.log(`first-load JS: ${seen.size} chunks, ${totalGzipKB.toFixed(0)} KB gzip (budget ${BUDGET_GZIP_KB} KB)`)
for (const [n, v] of [...seen].sort((a, b) => b[1].gz - a[1].gz)) {
  console.log(`  ${String(Math.round(v.gz / 1024)).padStart(4)} KB  ${n}  (via ${v.via})`)
}

let failed = false
if (offenders.length) {
  console.error(`FAIL: lazy-only chunk(s) in the first-load graph: ${offenders.join(', ')}`)
  failed = true
}
if (totalGzipKB > BUDGET_GZIP_KB) {
  console.error(`FAIL: first-load JS is ${totalGzipKB.toFixed(0)} KB gzip, over the ${BUDGET_GZIP_KB} KB budget`)
  failed = true
}
process.exit(failed ? 1 : 0)
