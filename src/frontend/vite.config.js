import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://d17c0kiwp2waq7.cloudfront.net',
        changeOrigin: true
      },
      '/ws': {
        target: 'wss://d17c0kiwp2waq7.cloudfront.net',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  }
});
