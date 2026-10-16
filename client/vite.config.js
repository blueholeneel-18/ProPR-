import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    css: true,
    // Unit tests only; the Playwright E2E specs live in `e2e/` and are run by
    // `npm run test:e2e`, so keep them out of the vitest run.
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
