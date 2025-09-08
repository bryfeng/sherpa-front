import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Optionally proxy to backend during dev
      // '/chat': 'http://localhost:8000',
      // '/tools': 'http://localhost:8000',
      // '/healthz': 'http://localhost:8000',
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
    globals: true,
    include: ['src/**/*.{test,spec}.ts?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  }
})
