import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppLayout } from './components/layout/AppLayout';
import { POSScreen } from './components/pos/POSScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { TabsScreen } from './components/tabs/TabsScreen';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { NotFound404 } from './components/common/NotFound404';
import { useAuthStore } from './store/useAuthStore';
import { usePOSStore } from './store/usePOSStore';
import { useTabStore } from './store/useTabStore';
import { useCloseoutStore } from './store/useCloseoutStore';
import { setupRealtimeSync } from './services/realtime';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Code-Splitting de rutas secundarias pesadas para optimizar carga inicial en móviles antiguos
const DashboardScreen = lazy(() =>
  import('./components/dashboard/DashboardScreen').then((m) => ({
    default: m.DashboardScreen,
  }))
);
const CloseoutScreen = lazy(() =>
  import('./components/closeout/CloseoutScreen').then((m) => ({
    default: m.CloseoutScreen,
  }))
);
const SalesHistoryScreen = lazy(() =>
  import('./components/history/SalesHistoryScreen').then((m) => ({
    default: m.SalesHistoryScreen,
  }))
);
const UsersManagementScreen = lazy(() =>
  import('./components/users/UsersManagementScreen').then((m) => ({
    default: m.UsersManagementScreen,
  }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-medium">Cargando vista...</span>
  </div>
);

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
      onCloseoutChange: (payload) => {
        if (payload?.table === 'closeouts') {
          useCloseoutStore.getState().handleRealtimeCloseout(payload);
        } else {
          useCloseoutStore.getState().loadCloseouts();
        }
      },
    });

    return () => {
      cleanupRealtime();
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
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
              {/* POS Terminal (Carga inmediata sin lazy loading) */}
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

              {/* Historial de Ventas & Anulación (RBAC: Pastor, Tesorería, super_admin) */}
              <Route
                path="/historial"
                element={
                  <ProtectedRoute allowedRoles={['Pastor', 'Tesorería', 'super_admin']}>
                    <SalesHistoryScreen />
                  </ProtectedRoute>
                }
              />

              {/* Inventario Compuesto (RBAC: Tesorería, Pastor, super_admin) */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['Tesorería', 'Pastor', 'super_admin']}>
                    <InventoryScreen />
                  </ProtectedRoute>
                }
              />

              {/* Fiados & Cuentas */}
              <Route path="/tabs" element={<TabsScreen />} />

              {/* Cierre de Caja (RBAC: Vendedor, Tesorería, Pastor, super_admin) */}
              <Route
                path="/closeout"
                element={
                  <ProtectedRoute allowedRoles={['Vendedor', 'Tesorería', 'Pastor', 'super_admin']}>
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
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
