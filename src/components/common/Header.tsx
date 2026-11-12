import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { WifiOff, LogOut, Sun, Moon } from 'lucide-react';
import { UserAvatarIcon } from '../ui/UserAvatarIcon';
import toast from 'react-hot-toast';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
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

  return (
    <header
      className={`sticky top-0 z-40 px-4 py-3 sm:px-6 border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#171412]/95 border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5]/95 border-[#E2DDD5] text-[#141210]'
      } backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Clean Architectural Brand Mark */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-serif text-base font-bold tracking-tight ${
              isDark
                ? 'bg-[#EFECE6] text-[#141210]'
                : 'bg-[#141210] text-[#FAF8F5]'
            }`}
          >
            EX
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight block leading-none">
              ELARX
            </span>
            <span
              className={`text-xs font-medium block mt-1 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
              Cafetería & Salón
            </span>
          </div>
        </div>

        {/* Right Controls: Offline alert (only if offline), Theme Toggle (Light/Dark), User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </div>
          )}

          {/* Dual Theme Switcher (Light: Piedra Alabastro / Dark: Obsidiana Café) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
            className={`min-h-[48px] px-4 rounded-full border flex items-center gap-2 text-sm font-medium transition cursor-pointer select-none ${
              isDark
                ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#141210] shrink-0" />
                <span className="hidden sm:inline">Oscuro</span>
              </>
            )}
          </button>

          {/* Active User & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div
                className={`min-h-[48px] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
                }`}
              >
                <UserAvatarIcon icon={currentUser.avatar} size="sm" />
                <div className="text-left pr-1">
                  <p className="text-sm font-semibold leading-tight truncate max-w-[110px] sm:max-w-[160px]">
                    {currentUser.name}
                  </p>
                  <p
                    className={`text-xs leading-tight capitalize ${
                      isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                    }`}
                  >
                    {currentUser.role === 'super_admin' ? 'Admin' : currentUser.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className={`min-h-[48px] min-w-[48px] px-3.5 rounded-full border flex items-center justify-center gap-1.5 text-sm font-medium transition cursor-pointer ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:bg-rose-950/60 hover:border-rose-700/60 hover:text-rose-200'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:bg-rose-100 hover:border-rose-300 hover:text-rose-900'
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
