import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../context/ThemeContext';
import {
  ShoppingBag,
  Users,
  Calculator,
  Boxes,
  BarChart3,
  History,
  UserCog,
  Activity,
  LayoutGrid,
  ChevronDown,
  X,
} from 'lucide-react';
import { QADiagnosticModal } from '../users/QADiagnosticModal';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const normRole = (currentUser?.role || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const isSuperAdmin = normRole === 'super_admin';
  const isAdminOrSupervisor =
    isSuperAdmin || normRole === 'tesoreria' || normRole === 'pastor';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3 Vistas operativas principales (Visibles para Vendedor y todos los roles)
  const coreItems = [
    {
      id: 'pos',
      label: 'Vender',
      path: '/pos',
      icon: ShoppingBag,
    },
    {
      id: 'tabs',
      label: 'Fiados',
      path: '/tabs',
      icon: Users,
    },
    {
      id: 'closeout',
      label: 'Caja',
      path: '/closeout',
      icon: Calculator,
    },
  ];

  // Herramientas de Gestión Administrativa (100% OCULTAS para el rol 'vendedor')
  const adminItems = isAdminOrSupervisor
    ? [
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
      ]
    : [];

  const isActiveAdminRoute = adminItems.some((item) => location.pathname === item.path);

  return (
    <>
      {/* Nivel 2 de Navegación (Móvil: Fila Inferior de botones distribuidos | Desktop: Barra de píldoras) */}
      <nav
        className={`w-full max-w-full overflow-x-hidden border-b transition-colors duration-200 ${
          isDark
            ? 'bg-[#171412] border-[#2A2420]'
            : 'bg-[#FAF8F5] border-[#E2DDD5]'
        }`}
      >
        {/* Fila Inferior de Navegación en Móvil (< 768px): Ancho distribuido 100% sin scroll lateral */}
        <div className="md:hidden w-full max-w-full px-2.5 py-2">
          <div
            className={`grid gap-1.5 w-full ${
              isAdminOrSupervisor ? 'grid-cols-4' : 'grid-cols-3'
            }`}
          >
            {coreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsAdminMenuOpen(false);
                    navigate(item.path);
                  }}
                  className={`min-h-[46px] px-2 py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer select-none min-w-0 ${
                    isActive
                      ? isDark
                        ? 'bg-[#EFECE6] text-[#141210] shadow-sm'
                        : 'bg-[#141210] text-[#FAF8F5] shadow-sm'
                      : isDark
                      ? 'bg-[#211D1A] text-[#9A9086] hover:text-[#F4F0EA] border border-[#2A2420]'
                      : 'bg-[#EFECE6] text-[#6E665E] hover:text-[#141210] border border-[#E2DDD5]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* 4º Botón "Gestión" en Móvil (Exclusivo para super_admin, pastor, tesoreria; 100% oculto para vendedor) */}
            {isAdminOrSupervisor && (
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen(true)}
                className={`min-h-[46px] px-2 py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer select-none min-w-0 ${
                  isActiveAdminRoute || isAdminMenuOpen
                    ? isDark
                      ? 'bg-[#EFECE6] text-[#141210] shadow-sm'
                      : 'bg-[#141210] text-[#FAF8F5] shadow-sm'
                    : isDark
                    ? 'bg-[#211D1A] text-[#F4F0EA] border border-[#2A2420]'
                    : 'bg-[#EFECE6] text-[#141210] border border-[#E2DDD5]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="truncate">Gestión</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Navegación Superior en Tablet / PC (>= 768px) */}
        <div className="hidden md:flex max-w-7xl mx-auto px-6 py-2.5 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {coreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`min-h-[48px] px-6 rounded-full flex items-center gap-2.5 text-base font-medium transition cursor-pointer select-none ${
                    isActive
                      ? isDark
                        ? 'bg-[#EFECE6] text-[#141210] font-semibold shadow-sm'
                        : 'bg-[#141210] text-[#FAF8F5] font-semibold shadow-sm'
                      : isDark
                      ? 'text-[#9A9086] hover:text-[#F4F0EA] hover:bg-[#211D1A]'
                      : 'text-[#6E665E] hover:text-[#141210] hover:bg-[#EFECE6]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {isAdminOrSupervisor && (
            <div ref={adminMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                className={`min-h-[48px] px-5 rounded-full border flex items-center gap-2.5 text-base font-medium transition cursor-pointer select-none ${
                  isActiveAdminRoute || isAdminMenuOpen
                    ? isDark
                      ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                      : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                    : isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>Gestión</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isAdminMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Sheet / Modal Quiet Luxury de "Gestión" (Accesible en Móvil y Desktop para roles administrativos) */}
      {isAdminOrSupervisor && isAdminMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsAdminMenuOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 border-t sm:border shadow-2xl transition-colors ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Indicador superior móvil */}
            <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto sm:hidden" />

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
                  Selecciona un módulo administrativo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen(false)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setIsAdminMenuOpen(false);
                    }}
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
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
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
                    <div className="min-w-0">
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
                onClick={() => {
                  setIsAdminMenuOpen(false);
                  setIsQAModalOpen(true);
                }}
                className={`sm:col-span-2 min-h-[56px] p-4 rounded-2xl border text-left flex items-center justify-between gap-3.5 transition cursor-pointer select-none active:scale-[0.99] ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
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
        </div>
      )}

      {isAdminOrSupervisor && (
        <QADiagnosticModal isOpen={isQAModalOpen} onClose={() => setIsQAModalOpen(false)} />
      )}
    </>
  );
};
