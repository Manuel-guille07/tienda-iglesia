import React from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../common/Header';
import { Navigation, isUserAdminOrSupervisor } from '../common/Navigation';
import { QADiagnosticModal } from '../users/QADiagnosticModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../context/ThemeContext';
import { Boxes, BarChart3, History, UserCog, Activity, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser } = useAuthStore();
  const { isGestionOpen, setIsGestionOpen, isQAModalOpen, setIsQAModalOpen } = useUIStore();

  const isAdminOrSupervisor = isUserAdminOrSupervisor(currentUser?.role);

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

  const managementSheetContent =
    isAdminOrSupervisor && isGestionOpen ? (
      <>
        {/* Overlay oscuro inmune a contenedores padres */}
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={() => setIsGestionOpen(false)}
          aria-hidden="true"
        />

        {/* Contenedor del Bottom Sheet en el nivel raíz */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de Gestión y Administración"
          className={`fixed bottom-0 left-0 right-0 z-[10000] max-w-lg mx-auto rounded-t-3xl shadow-2xl pb-safe p-5 sm:p-6 space-y-4 border-t transition-transform ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Indicador superior de arrastre */}
          <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto" />

          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
            }`}
          >
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Gestión y Administración
              </h3>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                }`}
              >
                Selecciona una vista administrativa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGestionOpen(false)}
              aria-label="Cerrar menú de gestión"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                isDark
                  ? 'bg-[#211D1A] text-[#9A9086] hover:text-[#F4F0EA]'
                  : 'bg-[#EFECE6] text-[#6E665E] hover:text-[#141210]'
              }`}
            >
              <X className="w-5 h-5" />
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
                  className={`min-h-[56px] p-4 rounded-2xl border text-left flex items-center gap-3.5 transition cursor-pointer select-none active:scale-[0.99] ${
                    isActive
                      ? isDark
                        ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                        : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                      : isDark
                      ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                      : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 pointer-events-none ${
                      isActive
                        ? isDark
                          ? 'bg-[#141210] text-[#EFECE6]'
                          : 'bg-[#FAF8F5] text-[#141210]'
                        : isDark
                        ? 'bg-[#171412] text-[#F4F0EA]'
                        : 'bg-[#FAF8F5] text-[#141210]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="min-w-0 pointer-events-none">
                    <span className="text-base font-semibold block leading-tight truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-xs block mt-0.5 truncate ${
                        isActive
                          ? 'opacity-80'
                          : isDark
                          ? 'text-[#9A9086]'
                          : 'text-[#6E665E]'
                      }`}
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
              className={`sm:col-span-2 min-h-[56px] p-4 rounded-2xl border text-left flex items-center justify-between gap-3.5 transition cursor-pointer select-none active:scale-[0.99] ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 pointer-events-none">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'bg-[#171412] text-emerald-400'
                      : 'bg-[#FAF8F5] text-emerald-700'
                  }`}
                >
                  <Activity className="w-5 h-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className="text-base font-semibold block leading-tight">
                    Autodiagnóstico QA
                  </span>
                  <span
                    className={`text-xs block mt-0.5 truncate ${
                      isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                    }`}
                  >
                    Verificar conexión Supabase, stock e integridad
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </>
    ) : null;

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col antialiased transition-colors duration-200 ${
        isDark ? 'bg-[#0E0C0B] text-[#F4F0EA]' : 'bg-[#EFECE6] text-[#141210]'
      }`}
    >
      <Header />
      <Navigation />
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-24 lg:pb-10">
        <Outlet />
      </main>

      {/* Renderizado en el nivel raíz del documento (createPortal a document.body) para inmunidad total ante overflow/z-index */}
      {typeof document !== 'undefined' && managementSheetContent
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
