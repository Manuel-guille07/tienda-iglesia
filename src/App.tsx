import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppLayout } from './components/layout/AppLayout';
import { POSScreen } from './components/pos/POSScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { TabsScreen } from './components/tabs/TabsScreen';
import { CloseoutScreen } from './components/closeout/CloseoutScreen';
import { SalesHistoryScreen } from './components/history/SalesHistoryScreen';
import { UsersManagementScreen } from './components/users/UsersManagementScreen';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { NotFound404 } from './components/common/NotFound404';
import { useAuthStore } from './store/useAuthStore';
import { usePOSStore } from './store/usePOSStore';
import { useTabStore } from './store/useTabStore';
import { useCloseoutStore } from './store/useCloseoutStore';
import { setupRealtimeSync } from './services/realtime';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const App: React.FC = () => {
  useEffect(() => {
    // 1. Inicializar sesión persistente de Auth y listener onAuthStateChange
    useAuthStore.getState().initAuth();

    // 2. Hidratación inicial desde Supabase
    usePOSStore.getState().loadInitialData();
    useTabStore.getState().loadTabs();
    useCloseoutStore.getState().loadCloseouts();

    // 3. Suscripción en vivo con Supabase Realtime ('elarx-realtime-sync') para múltiples dispositivos
    const cleanupRealtime = setupRealtimeSync({
      onRawMaterialChange: (material, eventType) => {
        usePOSStore.getState().handleRealtimeRawMaterial(material, eventType);
      },
      onSaleChange: (sale, eventType) => {
        usePOSStore.getState().handleRealtimeSale(sale, eventType);
      },
      onTabChange: () => {
        useTabStore.getState().loadTabs();
      },
      onProfileChange: () => {
        useAuthStore.getState().loadProfiles();
      },
      onCloseoutChange: () => {
        useCloseoutStore.getState().loadCloseouts();
      },
    });

    return () => {
      cleanupRealtime();
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública de Login */}
          <Route path="/" element={<LoginScreen />} />

          {/* Rutas protegidas con AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* POS Terminal */}
            <Route path="/pos" element={<POSScreen />} />

            {/* Dashboard Estadístico (RBAC: Pastor, Tesorería, super_admin) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Pastor', 'Tesorería', 'super_admin']}>
                  <DashboardScreen />
                </ProtectedRoute>
              }
            />

            {/* Historial de Ventas & Anulación */}
            <Route path="/historial" element={<SalesHistoryScreen />} />

            {/* Inventario Compuesto (RBAC: Tesorería y Pastor) */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['Tesorería', 'Pastor']}>
                  <InventoryScreen />
                </ProtectedRoute>
              }
            />

            {/* Fiados & Cuentas */}
            <Route path="/tabs" element={<TabsScreen />} />

            {/* Cierre de Caja (RBAC: Vendedor, Tesorería, Pastor) */}
            <Route
              path="/closeout"
              element={
                <ProtectedRoute allowedRoles={['Vendedor', 'Tesorería', 'Pastor']}>
                  <CloseoutScreen />
                </ProtectedRoute>
              }
            />

            {/* Gestión de Usuarios (RBAC: super_admin) */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <UsersManagementScreen />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Ruta Catch-all 404 con diseño ELARX */}
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
