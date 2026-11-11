import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Coffee, Wifi, WifiOff, LogOut, UserCheck, Globe, Shield } from 'lucide-react';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { language, setLanguage, t } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión a internet restablecida');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('¡Conexión perdida! Trabajando en Modo Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'success';
      case 'Pastor':
        return 'purple';
      case 'Tesorería':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-xs tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-white">
                ELARX
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              ELARX POS
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                v1.2 Core
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Realtime
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">Retail, Chiringuito & POS Management</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden md:inline">{t('online')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">{t('offline')}</span>
              </>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700/60 cursor-pointer transition"
            title="Cambiar idioma"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="uppercase">{language}</span>
          </button>

          {/* Current User & Role */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 py-1 px-2.5 rounded-xl">
                <span className="text-lg leading-none">{currentUser.avatar || '👤'}</span>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-indigo-400 leading-tight">{currentUser.role}</p>
                </div>
                <Badge variant={getRoleBadgeVariant(currentUser.role)} size="sm">
                  {currentUser.role}
                </Badge>
              </div>

              {/* Logout / Switch User */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/30 cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
