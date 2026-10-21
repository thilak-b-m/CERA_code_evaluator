import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT || '5173';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000';
const apiProxy = {
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },

  server: {
    port: port,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: apiProxy,
    fs: {
      strict: true,
    },
  },

  preview: {
    port,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: apiProxy,
  },
});