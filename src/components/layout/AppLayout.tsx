import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from '../common/Header';
import { Navigation, isUserAdminOrSupervisor } from '../common/Navigation';
import { QADiagnosticModal } from '../users/QADiagnosticModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { QL_EASE_OUT, QL_SPRING_SNAPPY } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { Boxes, BarChart3, History, UserCog, Activity, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser } = useAuthStore();
  const { isGestionOpen, setIsGestionOpen, isQAModalOpen, setIsQAModalOpen } = useUIStore();

  const isAdminOrSupervisor = isUserAdminOrSupervisor(currentUser?.role);

  useEffect(() => {
    if (!isGestionOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGestionOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGestionOpen, setIsGestionOpen]);

  const adminItems = [
    {
      id: 'inventory',
      label: 'Inventario',
      subtitle: 'Insumos, productos y stock',
      path: '/inventory',
      icon: Boxes,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Métricas e ingresos del mes',
      path: '/dashboard',
      icon: BarChart3,
    },
    {
      id: 'history',
      label: 'Historial de Ventas',
      subtitle: 'Tickets, CSV/PDF y anulaciones',
      path: '/historial',
      icon: History,
    },
    {
      id: 'users',
      label: 'Usuarios',
      subtitle: 'Perfiles, roles y PIN de acceso',
      path: '/usuarios',
      icon: UserCog,
    },
  ];

  const handleNavigateAdmin = (path: string) => {
    setIsGestionOpen(false);
    navigate(path);
  };

  const handleOpenQADiagnostic = () => {
    setIsGestionOpen(false);
    setIsQAModalOpen(true);
  };

  const managementSheetContent = (
    <AnimatePresence>
      {isAdminOrSupervisor && isGestionOpen && (
        <>
          {/* Overlay por encima de nav (z-40) y modales (z-50), debajo de toasts (z-9999) */}
          <motion.div
            key="gestion-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={QL_EASE_OUT}
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsGestionOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet de Gestión */}
          <motion.div
            key="gestion-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de Gestión y Administración"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={QL_SPRING_SNAPPY}
            className="fixed bottom-0 left-0 right-0 z-[61] max-w-lg mx-auto rounded-t-3xl pb-safe p-5 sm:p-6 space-y-4 border-t border-x border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Indicador superior de arrastre */}
            <div className="w-10 h-1 rounded-full bg-[var(--ql-text-muted)]/30 mx-auto" />

            <div className="flex items-center justify-between pb-3 border-b border-[var(--ql-hairline)]">
              <div>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                  Gestión y Administración
                </h3>
                <p className="text-xs text-[var(--ql-text-secondary)] mt-0.5">
                  Selecciona una vista administrativa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGestionOpen(false)}
                aria-label="Cerrar menú de gestión"
                className="w-9 h-9 rounded-full bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] flex items-center justify-center transition-colors cursor-pointer ql-focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateAdmin(item.path)}
                    className={cn(
                      'min-h-[56px] p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all duration-150 cursor-pointer select-none active:scale-[0.985] ql-focus-ring',
                      isActive
                        ? 'bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] border-transparent font-semibold [box-shadow:var(--ql-shadow-sm)]'
                        : 'bg-[var(--ql-bg-elevated)] border-[var(--ql-hairline)] text-[var(--ql-text-primary)] hover:border-[var(--ql-hairline-strong)]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 pointer-events-none',
                        isActive
                          ? 'bg-[var(--ql-accent-text)]/15 text-[var(--ql-accent-text)]'
                          : 'bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] text-[var(--ql-text-primary)]'
                      )}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                    </div>
                    <div className="min-w-0 pointer-events-none">
                      <span className="text-sm font-semibold block leading-tight truncate">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          'text-xs block mt-0.5 truncate',
                          isActive ? 'opacity-75' : 'text-[var(--ql-text-secondary)]'
                        )}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Botón de Autodiagnóstico QA */}
              <button
                type="button"
                onClick={handleOpenQADiagnostic}
                className="sm:col-span-2 min-h-[56px] p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] hover:border-[var(--ql-hairline-strong)] text-[var(--ql-text-primary)] text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer select-none active:scale-[0.985] ql-focus-ring"
              >
                <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--ql-tone-sage-soft)] border border-[var(--ql-hairline)] text-[var(--ql-tone-sage)]">
                    <Activity className="w-[18px] h-[18px] shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block leading-tight">
                      Autodiagnóstico QA
                    </span>
                    <span className="text-xs text-[var(--ql-text-secondary)] block mt-0.5 truncate">
                      Verificar conexión Supabase, stock e integridad
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col antialiased ql-bg-app transition-colors duration-200">
      <Header />
      <Navigation />
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-mobile-nav md:pb-10">
        <Outlet />
      </main>

      {typeof document !== 'undefined'
        ? createPortal(managementSheetContent, document.body)
        : managementSheetContent}

      {isAdminOrSupervisor && (
        <QADiagnosticModal
          isOpen={isQAModalOpen}
          onClose={() => setIsQAModalOpen(false)}
        />
      )}
    </div>
  );
};
