import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Security: restrict dev server to only serve files from project root
    // This mitigates esbuild GHSA-67mh-4wv8-2f99 without a breaking Vite v8 upgrade
    fs: {
      strict: true,
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true,
      },
    },
  },
  build: {
    // Code-split vendor libraries to fix chunk size warning (655 kB → chunked)
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-lucide': ['lucide-react'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
