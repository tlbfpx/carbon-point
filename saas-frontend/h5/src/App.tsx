import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import { designSystemConfig } from '@carbon-point/design-system';
import HomePage from '@/pages/HomePage';
import CheckInPage from '@/pages/CheckInPage';
import CheckInHistoryPage from '@/pages/CheckInHistoryPage';
import PointsPage from '@/pages/PointsPage';
import MallPage from '@/pages/MallPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import MyCouponsPage from '@/pages/MyCouponsPage';
import OrderHistoryPage from '@/pages/OrderHistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotificationPage from '@/pages/NotificationPage';
import { useAuthStore } from '@/store/authStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { routeLogger } from '@carbon-point/utils';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RouteLogger: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    routeLogger.info(`[路由切换] 导航到 ${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);
  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <ConfigProvider {...designSystemConfig.dark}>
      <ErrorBoundary>
        <BrowserRouter basename="/h5">
          <RouteLogger />
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin"
            element={
              <ProtectedRoute>
                <CheckInPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin/history"
            element={
              <ProtectedRoute>
                <CheckInHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/points"
            element={
              <ProtectedRoute>
                <PointsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mall"
            element={
              <ProtectedRoute>
                <MallPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mall/:id"
            element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-coupons"
            element={
              <ProtectedRoute>
                <MyCouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export default App;
