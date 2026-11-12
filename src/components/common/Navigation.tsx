import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../context/ThemeContext';
import {
  ShoppingBag,
  Users,
  Calculator,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';

export function isUserAdminOrSupervisor(role?: string): boolean {
  const normRole = (role || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return (
    normRole === 'super_admin' ||
    normRole === 'admin' ||
    normRole === 'tesoreria' ||
    normRole === 'pastor'
  );
}

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { isGestionOpen, setIsGestionOpen, toggleGestionOpen } = useUIStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isAdminOrSupervisor = isUserAdminOrSupervisor(currentUser?.role);

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

  const adminPaths = ['/inventory', '/dashboard', '/historial', '/usuarios'];
  const isActiveAdminRoute = adminPaths.includes(location.pathname);

  return (
    <nav
      className={`w-full max-w-full overflow-x-hidden border-b transition-colors duration-200 relative z-30 ${
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
                  setIsGestionOpen(false);
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
                <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
                <span className="truncate pointer-events-none">{item.label}</span>
              </button>
            );
          })}

          {/* 4º Botón "Gestión" en Móvil (Exclusivo para super_admin, pastor, tesoreria; 100% oculto para vendedor) */}
          {isAdminOrSupervisor && (
            <button
              type="button"
              onClick={() => toggleGestionOpen()}
              aria-expanded={isGestionOpen}
              aria-label="Abrir menú de Gestión"
              className={`min-h-[46px] px-2 py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer select-none min-w-0 active:scale-[0.98] ${
                isActiveAdminRoute || isGestionOpen
                  ? isDark
                    ? 'bg-[#EFECE6] text-[#141210] shadow-sm'
                    : 'bg-[#141210] text-[#FAF8F5] shadow-sm'
                  : isDark
                  ? 'bg-[#211D1A] text-[#F4F0EA] border border-[#2A2420]'
                  : 'bg-[#EFECE6] text-[#141210] border border-[#E2DDD5]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="truncate pointer-events-none">Gestión</span>
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
                onClick={() => {
                  setIsGestionOpen(false);
                  navigate(item.path);
                }}
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
                <Icon className="w-5 h-5 shrink-0 pointer-events-none" />
                <span className="pointer-events-none">{item.label}</span>
              </button>
            );
          })}
        </div>

        {isAdminOrSupervisor && (
          <button
            type="button"
            onClick={() => toggleGestionOpen()}
            aria-expanded={isGestionOpen}
            className={`min-h-[48px] px-5 rounded-full border flex items-center gap-2.5 text-base font-medium transition cursor-pointer select-none ${
              isActiveAdminRoute || isGestionOpen
                ? isDark
                  ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                  : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                : isDark
                ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0 pointer-events-none" />
            <span className="pointer-events-none">Gestión</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform pointer-events-none ${
                isGestionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>
    </nav>
  );
};
