import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { message } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import BrandingProvider from './components/BrandingProvider';
import App from './App';
import { globalStyles } from '@carbon-point/design-system';
import './index.css';

// Inject design system global styles into document head
const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);

message.config({
  top: 64,
  duration: 3,
  maxCount: 3,
});

dayjs.locale('zh-cn');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
