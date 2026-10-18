import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, API and uploaded files are proxied to the Express server
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY || 'http://localhost:5000',
      '/uploads': process.env.VITE_PROXY || 'http://localhost:5000',
    },
  },
});
