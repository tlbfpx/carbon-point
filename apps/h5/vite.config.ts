import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/h5/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@carbon-point/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@carbon-point/api': path.resolve(__dirname, '../../packages/api/src'),
      '@carbon-point/hooks': path.resolve(__dirname, '../../packages/hooks/src'),
      '@carbon-point/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist/h5',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          'antd-mobile': ['antd-mobile'],
          query: ['@tanstack/react-query'],
          store: ['zustand'],
        },
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
    target: 'es2015',
    cssCodeSplit: true,
    minify: 'esbuild',
  },
});
