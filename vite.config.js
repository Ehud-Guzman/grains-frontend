import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the warning threshold slightly — our admin bundle is intentionally
    // larger than the default 500kB limit.
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor chunks ─────────────────────────────────────────────────
          // Heavy third-party libs are split out so they can be cached
          // independently and don't bloat the app entry point.

          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }

          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }

          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }

          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }

          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }

          // ── App route chunks ──────────────────────────────────────────────
          // Split by portal so a customer never downloads admin code and
          // vice versa. Path matching is intentionally broad — subdirectories
          // are included automatically.

          if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
            return 'portal-admin';
          }

          if (id.includes('/pages/driver/') || id.includes('/components/driver/')) {
            return 'portal-driver';
          }

          // customer pages + public shop land in the default entry chunk
        },
      },
    },
  },
})
