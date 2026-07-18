import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Remove console statements in production builds, keep console.error and console.warn for debugging
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['log', 'info', 'debug'],
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
    // Optimize bundle via manualChunks (function form; works with Rollup).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/]@mui[\\/]/.test(id)) return 'mui'
          if (/[\\/]node_modules[\\/]@anthropic-ai[\\/]sdk[\\/]/.test(id)) return 'anthropic'
          if (/[\\/]node_modules[\\/](react|react-dom|reactflow|@reactflow|scheduler)[\\/]/.test(id)) return 'vendor'
        }
      }
    }
  }
})
