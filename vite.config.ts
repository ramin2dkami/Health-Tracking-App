import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /Health-Tracking-App/; dev stays at the root.
  base: command === 'build' ? '/Health-Tracking-App/' : '/',
  plugins: [react()],
  server: {
    // Fixed port: IndexedDB is per-origin, so a different port shows an empty diary.
    // strictPort fails loudly instead of drifting to another port the preview isn't watching.
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
  },
}))
