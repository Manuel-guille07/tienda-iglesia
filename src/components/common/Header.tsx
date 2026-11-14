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

  const firstName = currentUser?.name
    ? currentUser.name.trim().split(/\s+/)[0]
    : '';

  return (
    <header
      className={`w-full max-w-full overflow-x-hidden sticky top-0 z-40 px-2.5 py-2.5 sm:px-6 sm:py-3 border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#171412]/95 border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5]/95 border-[#E2DDD5] text-[#141210]'
      } backdrop-blur-md`}
    >
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-0">
        {/* Fila Superior Izquierda: Logo El Chiringuito */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#EFECE6] text-[#141210]'
                : 'bg-[#141210] text-[#EFECE6]'
            }`}
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="w-6 h-6 sm:w-7 sm:h-7"
              aria-hidden="true"
            >
              <path d="M16 48H44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path
                d="M19 25H41V34C41 40.0751 36.0751 45 30 45C23.9249 45 19 40.0751 19 34V25Z"
                fill="currentColor"
              />
              <path
                d="M41 27.5H44.5C47.5376 27.5 50 29.9624 50 33C50 36.0376 47.5376 38.5 44.5 38.5H41"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse
                cx="30"
                cy="34.5"
                rx="4.2"
                ry="5.8"
                transform="rotate(-18 30 34.5)"
                fill={isDark ? '#EFECE6' : '#141210'}
              />
              <path
                d="M28.6 29.5C29.8 32.3 29.4 35.8 31.4 39.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M25 16.5C25 18.5 27 19 27 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M33 15C33 17.5 35 18.2 35 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="text-sm sm:text-lg font-semibold tracking-tight block leading-none truncate">
              El Chiringuito
            </span>
            <span
              className={`hidden sm:block text-xs font-medium mt-1 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
              Cafetería & Salón
            </span>
          </div>
        </div>

        {/* Fila Superior Derecha: Controles Compactos (Tema Claro/Oscuro, Usuario truncado y Botón Salir visible) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          {!isOnline && (
            <div
              title={t('offline')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{t('offline')}</span>
            </div>
          )}

          {/* Interruptor Tema Claro / Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
            className={`h-10 w-10 sm:h-11 sm:w-auto sm:px-3.5 rounded-full border flex items-center justify-center gap-2 text-xs sm:text-sm font-medium transition cursor-pointer select-none shrink-0 ${
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

          {/* Insignia Compacta del Usuario Activo + Botón Salir */}
          {currentUser && (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div
                className={`h-10 sm:h-11 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 rounded-full border min-w-0 ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
                }`}
              >
                <UserAvatarIcon icon={currentUser.avatar} size="sm" />
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-tight truncate max-w-[78px] sm:max-w-[110px] md:max-w-[150px]">
                    <span className="sm:hidden">{firstName}</span>
                    <span className="hidden sm:inline">{currentUser.name}</span>
                  </p>
                  <p
                    className={`hidden sm:block text-[11px] leading-tight capitalize truncate ${
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
                className={`h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-full border flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:bg-rose-950/60 hover:border-rose-700/60 hover:text-rose-200'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:bg-rose-100 hover:border-rose-300 hover:text-rose-900'
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
