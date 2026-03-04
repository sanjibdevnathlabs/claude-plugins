import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = process.env.MCP_MANAGER_PORT || 4111;

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': `http://localhost:${port}`,
    },
  },
});
