import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { SegmentedControl, type SegmentedOption } from '../ui/SegmentedControl';
import { QL_SPRING_SNAPPY, QL_SPRING_TACTILE } from '../../lib/motion';
import { cn } from '../../lib/cn';
import {
  ShoppingBag,
  Users,
  Calculator,
  LayoutGrid,
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

type NavId = 'pos' | 'tabs' | 'closeout' | 'gestion';

const ADMIN_PATHS = ['/inventory', '/dashboard', '/historial', '/usuarios'];

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { isGestionOpen, setIsGestionOpen, toggleGestionOpen } = useUIStore();

  const isAdminOrSupervisor = isUserAdminOrSupervisor(currentUser?.role);
  const isActiveAdminRoute = ADMIN_PATHS.includes(location.pathname);

  // 3 Vistas operativas principales (Visibles para Vendedor y todos los roles)
  const coreItems = [
    {
      id: 'pos' as const,
      label: 'Vender',
      path: '/pos',
      icon: ShoppingBag,
    },
    {
      id: 'tabs' as const,
      label: 'Fiados',
      path: '/tabs',
      icon: Users,
    },
    {
      id: 'closeout' as const,
      label: 'Caja',
      path: '/closeout',
      icon: Calculator,
    },
  ];

  const activeNavId: NavId =
    isAdminOrSupervisor && (isGestionOpen || isActiveAdminRoute)
      ? 'gestion'
      : location.pathname === '/tabs'
      ? 'tabs'
      : location.pathname === '/closeout'
      ? 'closeout'
      : 'pos';

  const handleSelectNav = (id: NavId) => {
    if (id === 'gestion') {
      if (isAdminOrSupervisor) {
        toggleGestionOpen();
      }
      return;
    }
    const target = coreItems.find((item) => item.id === id);
    if (target) {
      setIsGestionOpen(false);
      navigate(target.path);
    }
  };

  const desktopOptions: SegmentedOption<NavId>[] = [
    ...coreItems.map((item) => {
      const Icon = item.icon;
      return {
        value: item.id,
        label: item.label,
        icon: <Icon className="w-4 h-4" />,
      };
    }),
    ...(isAdminOrSupervisor
      ? [
          {
            value: 'gestion' as const,
            label: 'Gestión',
            icon: <LayoutGrid className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Tablet / Desktop (>= 768px): SegmentedControl compacto integrado arriba */}
      <nav
        aria-label="Navegación principal"
        className="hidden md:block w-full sticky top-[52px] z-30 ql-glass border-b border-[var(--ql-hairline)] transition-colors duration-200"
      >
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
          <SegmentedControl
            options={desktopOptions}
            value={activeNavId}
            onChange={handleSelectNav}
            layoutId="ql-desktop-nav-pill"
            variant="accent"
            size="sm"
            ariaLabel="Secciones de la aplicación"
          />

          {isAdminOrSupervisor && isActiveAdminRoute && (
            <span className="text-xs font-medium text-[var(--ql-text-muted)]">
              Vista administrativa
            </span>
          )}
        </div>
      </nav>

      {/* Móvil (< 768px): Floating Glass Dock */}
      <nav
        aria-label="Navegación inferior"
        style={{
          paddingBottom: 'calc(var(--ql-safe-bottom) + var(--ql-mobile-dock-gap))',
        }}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3.5 pointer-events-none"
      >
        <div
          className={cn(
            'pointer-events-auto mx-auto max-w-md h-[var(--ql-mobile-nav-h)] rounded-[26px] ql-dock-glass px-1.5 grid items-center',
            isAdminOrSupervisor ? 'grid-cols-4' : 'grid-cols-3'
          )}
        >
          {coreItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavId === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={QL_SPRING_TACTILE}
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative h-[50px] flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer select-none ql-focus-ring rounded-[20px] transition-colors duration-150',
                  isActive
                    ? 'text-[var(--ql-accent-text)]'
                    : 'text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="ql-mobile-dock-pill"
                    transition={QL_SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute inset-0.5 rounded-[19px] bg-[var(--ql-accent-bg)] [box-shadow:var(--ql-shadow-sm)]"
                  />
                )}
                <Icon
                  className="relative z-10 w-[18px] h-[18px] shrink-0"
                  strokeWidth={isActive ? 2.15 : 1.8}
                />
                <span
                  className={cn(
                    'relative z-10 text-[10.5px] leading-none truncate max-w-full',
                    isActive ? 'font-semibold' : 'font-medium'
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}

          {/* 4º Botón "Gestión" exclusivo para roles admin/supervisor (oculto para Vendedor) */}
          {isAdminOrSupervisor && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={QL_SPRING_TACTILE}
              onClick={() => handleSelectNav('gestion')}
              aria-expanded={isGestionOpen}
              aria-label="Abrir menú de Gestión"
              className={cn(
                'relative h-[50px] flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer select-none ql-focus-ring rounded-[20px] transition-colors duration-150',
                activeNavId === 'gestion'
                  ? 'text-[var(--ql-accent-text)]'
                  : 'text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
              )}
            >
              {activeNavId === 'gestion' && (
                <motion.span
                  layoutId="ql-mobile-dock-pill"
                  transition={QL_SPRING_SNAPPY}
                  aria-hidden="true"
                  className="absolute inset-0.5 rounded-[19px] bg-[var(--ql-accent-bg)] [box-shadow:var(--ql-shadow-sm)]"
                />
              )}
              <LayoutGrid
                className="relative z-10 w-[18px] h-[18px] shrink-0"
                strokeWidth={activeNavId === 'gestion' ? 2.15 : 1.8}
              />
              <span
                className={cn(
                  'relative z-10 text-[10.5px] leading-none truncate max-w-full',
                  activeNavId === 'gestion' ? 'font-semibold' : 'font-medium'
                )}
              >
                Gestión
              </span>
            </motion.button>
          )}
        </div>
      </nav>
    </>
  );
};
