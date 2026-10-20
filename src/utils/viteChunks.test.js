// @vitest-environment node
// (Importing vite.config.js pulls in vite/esbuild, which refuse to load under jsdom's TextEncoder.)
import { describe, test, expect } from 'vitest'
import config from '../../vite.config.js'

// Regression for the 2026-10 audit: Vite's preload helper ended up inside the vendor-pdf manual chunk,
// the entry statically imported that chunk, and every visitor downloaded 165KB of jsPDF/html2canvas.
// (The full build-graph check is `npm run check:bundle`; this is the fast unit-level guard.)
const manualChunks = config.build.rollupOptions.output.manualChunks

describe('vite manualChunks', () => {
  test("the dynamic-import preload helper is kept with React, not with a lazy vendor chunk", () => {
    expect(manualChunks('\u0000vite/preload-helper.js')).toBe('vendor-react')
    expect(manualChunks('/project/node_modules/vite/preload-helper.js')).toBe('vendor-react')
  })

  test('the PDF libraries still get their own lazy chunk', () => {
    expect(manualChunks('/project/node_modules/jspdf/dist/jspdf.es.min.js')).toBe('vendor-pdf')
    expect(manualChunks('/project/node_modules/html2canvas/dist/html2canvas.esm.js')).toBe('vendor-pdf')
  })

  test('charts stay in their own lazy chunk', () => {
    expect(manualChunks('/project/node_modules/recharts/es6/index.js')).toBe('vendor-charts')
  })
})
