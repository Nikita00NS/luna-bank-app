import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ton': ['@tonconnect/ui-react', '@tonconnect/sdk'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-zustand': ['zustand'],
          'vendor-qrcode': ['qrcode.react'],
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
  },
})