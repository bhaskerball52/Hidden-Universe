import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
