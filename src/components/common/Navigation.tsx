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

  // Herramientas administrativas (OCULTAS por completo para rol 'vendedor')
  const adminItems = isAdminOrSupervisor
    ? [
        {
          id: 'inventory',
          label: 'Inventario',
          path: '/inventory',
          icon: Boxes,
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          path: '/dashboard',
          icon: BarChart3,
        },
        {
          id: 'history',
          label: 'Historial',
          path: '/historial',
          icon: History,
        },
        ...(isSuperAdmin
          ? [
              {
                id: 'users',
                label: 'Usuarios',
                path: '/usuarios',
                icon: UserCog,
              },
            ]
          : []),
      ]
    : [];

  const isActiveAdminRoute = adminItems.some((item) => location.pathname === item.path);

  return (
    <>
      {/* Barra de Navegación Superior (Tablet / PC >= 768px) */}
      <nav
        className={`hidden md:block border-b transition-colors duration-200 ${
          isDark
            ? 'bg-[#171412] border-[#2A2420]'
            : 'bg-[#FAF8F5] border-[#E2DDD5]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          {/* 3 Vistas Operativas Principales */}
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

          {/* Dock Administrativo Limpio (Exclusivo para super_admin, pastor, tesoreria) */}
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
                <span>Administración</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isAdminMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAdminMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-3xl p-2 shadow-2xl border z-50 ${
                    isDark
                      ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                      : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                  }`}
                >
                  <div className="space-y-1">
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
                          className={`w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 text-base font-medium transition cursor-pointer ${
                            isActive
                              ? isDark
                                ? 'bg-[#EFECE6] text-[#141210] font-semibold'
                                : 'bg-[#141210] text-[#FAF8F5] font-semibold'
                              : isDark
                              ? 'text-[#F4F0EA] hover:bg-[#211D1A]'
                              : 'text-[#141210] hover:bg-[#EFECE6]'
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    {isSuperAdmin && (
                      <div
                        className={`pt-1 mt-1 border-t ${
                          isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsAdminMenuOpen(false);
                            setIsQAModalOpen(true);
                          }}
                          className={`w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 text-base font-medium transition cursor-pointer ${
                            isDark
                              ? 'text-[#F4F0EA] hover:bg-[#211D1A]'
                              : 'text-[#141210] hover:bg-[#EFECE6]'
                          }`}
                        >
                          <Activity className="w-5 h-5 shrink-0" />
                          <span>Autodiagnóstico QA</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Barra de Navegación Inferior Móvil (< 768px) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 border-t px-3 py-1.5 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-[#171412]/95 border-[#2A2420]'
            : 'bg-[#FAF8F5]/95 border-[#E2DDD5]'
        }`}
      >
        <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
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
                className={`flex-1 min-h-[52px] rounded-2xl flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition cursor-pointer select-none ${
                  isActive
                    ? isDark
                      ? 'bg-[#EFECE6] text-[#141210] font-semibold'
                      : 'bg-[#141210] text-[#FAF8F5] font-semibold'
                    : isDark
                    ? 'text-[#9A9086] hover:text-[#F4F0EA]'
                    : 'text-[#6E665E] hover:text-[#141210]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Botón de Menú Admin en Móvil (SOLO visible para super_admin, pastor, tesoreria) */}
          {isAdminOrSupervisor && (
            <button
              type="button"
              onClick={() => setIsAdminMenuOpen((prev) => !prev)}
              className={`min-h-[52px] px-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-sm font-medium transition cursor-pointer select-none ${
                isActiveAdminRoute || isAdminMenuOpen
                  ? isDark
                    ? 'bg-[#EFECE6] text-[#141210] font-semibold'
                    : 'bg-[#141210] text-[#FAF8F5] font-semibold'
                  : isDark
                  ? 'text-[#9A9086] hover:text-[#F4F0EA]'
                  : 'text-[#6E665E] hover:text-[#141210]'
              }`}
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </nav>

      {/* Bottom Sheet de Herramientas Administrativas en Móvil */}
      {isAdminOrSupervisor && isAdminMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setIsAdminMenuOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-t-3xl p-5 space-y-3 border-t shadow-2xl ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-current/10">
              <span className="text-base font-semibold">Herramientas de Gestión</span>
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
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
                    className={`min-h-[56px] p-3.5 rounded-2xl border flex items-center gap-3 text-base font-medium transition cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                          : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                        : isDark
                        ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                        : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMenuOpen(false);
                    setIsQAModalOpen(true);
                  }}
                  className={`col-span-2 min-h-[56px] p-3.5 rounded-2xl border flex items-center justify-center gap-3 text-base font-medium transition cursor-pointer ${
                    isDark
                      ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                      : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
                  }`}
                >
                  <Activity className="w-5 h-5 shrink-0" />
                  <span>Autodiagnóstico QA</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <QADiagnosticModal isOpen={isQAModalOpen} onClose={() => setIsQAModalOpen(false)} />
      )}
    </>
  );
};
