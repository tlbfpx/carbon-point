import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, isSsrBuild }) => {
  // Platform app (platform admin): build to dist/platform with base=/platform/
  // Dashboard app (enterprise admin): build to dist/dashboard with base=/dashboard/
  const platformInput = path.resolve(__dirname, 'platform.html');
  const dashboardInput = path.resolve(__dirname, 'index.html');

  return {
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
      port: 3001,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist/dashboard',
      emptyOutDir: true,
      base: '/',
      rollupOptions: {
        input: {
          dashboard: dashboardInput,
          platform: platformInput,
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
            charts: ['recharts'],
            query: ['@tanstack/react-query', 'zustand'],
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
      target: 'es2015',
      cssCodeSplit: true,
      minify: 'esbuild',
      sourcemap: false,
    },
  };
});
