import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Kept in step with jsconfig.json so "@/..." resolves the same in the editor
  // and at build time. React Bits' JS-CSS components use relative imports, but
  // some registry items do reach for "@/".
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [react()],
  build: {
    // The WebGL stack is genuinely large, but it is only fetched when a
    // simulation is launched — the hub itself never loads it. React is pinned
    // to its own chunk so the bundler can't hoist it in alongside three.js and
    // undo that split.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (/[\\/]node_modules[\\/](three|@react-three|its-fine|zustand|suspend-react)/.test(id)) {
            return 'three-vendor'
          }
          return undefined
        },
      },
    },
  },
})
