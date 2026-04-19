import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/platform/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@carbon-point/utils': path.resolve(__dirname, './src/utils'),
      '@carbon-point/api': path.resolve(__dirname, './src/api'),
      '@carbon-point/hooks': path.resolve(__dirname, './src/hooks'),
      '@carbon-point/ui': path.resolve(__dirname, './src/ui'),
      '@carbon-point/design-system': path.resolve(__dirname, './src/design-system'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['recharts'],
          query: ['@tanstack/react-query', 'zustand'],
        },
      },
    },
    target: 'es2015',
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['@ant-design/icons', '@ant-design/cssinjs', 'antd', 'react', 'react-dom'],
  },
});
