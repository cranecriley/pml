import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  // Optimization settings for faster dev startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    force: false // Only rebuild when dependencies change
  },
  server: {
    open: true,
    host: true,
    // Enable faster HMR
    hmr: {
      overlay: false // Disable error overlay for faster updates
    }
  },
  build: {
    // Optimize build but not affecting dev speed
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})