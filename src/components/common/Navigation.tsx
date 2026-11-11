import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/useAuthStore';
import { ShoppingCart, Boxes, Users, Calculator, History, UserCog } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isTesoreriaOrPastor = isSuperAdmin || currentUser?.role === 'Tesorería' || currentUser?.role === 'Pastor';

  const navItems = [
    {
      id: 'pos',
      label: t('nav.pos'),
      path: '/pos',
      icon: ShoppingCart,
      allowed: true,
    },
    {
      id: 'history',
      label: t('nav.history'),
      path: '/historial',
      icon: History,
      allowed: true,
    },
    {
      id: 'inventory',
      label: t('nav.inventory'),
      path: '/inventory',
      icon: Boxes,
      allowed: isTesoreriaOrPastor,
      roleBadge: !isTesoreriaOrPastor ? 'Admin' : undefined,
    },
    {
      id: 'tabs',
      label: t('nav.tabs'),
      path: '/tabs',
      icon: Users,
      allowed: true,
    },
    {
      id: 'closeout',
      label: t('nav.closeout'),
      path: '/closeout',
      icon: Calculator,
      allowed: true,
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'users',
            label: t('nav.users'),
            path: '/usuarios',
            icon: UserCog,
            allowed: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Desktop / Tablet Nav Bar (top subheader) */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border-b border-slate-800 px-6 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.allowed) navigate(item.path);
              }}
              disabled={!item.allowed}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : item.allowed
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.roleBadge && (
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                  {item.roleBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Bottom Navigation Bar (fixed bottom for mobile-first) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.allowed) navigate(item.path);
              }}
              disabled={!item.allowed}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : item.allowed
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-indigo-600/20' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
