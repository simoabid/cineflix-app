import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@providers': path.resolve(__dirname, './src/lib/providers'),
      '@p-stream/providers': path.resolve(__dirname, './src/lib/providers'),
    },
  },
  server: {
    host: 'localhost',
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
