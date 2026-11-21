import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { WifiOff, LogOut, Sun, Moon } from 'lucide-react';
import { Badge } from '../ui/Badge';
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

  const roleLabel =
    currentUser?.role === 'super_admin' ? 'Admin' : currentUser?.role || '';

  return (
    <header className="w-full max-w-full sticky top-0 z-40 ql-glass border-b border-[var(--ql-hairline)] transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto h-[52px] px-3 sm:px-6 flex items-center justify-between gap-2 min-w-0">
        {/* Marca sobria en una sola línea */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-[10px] bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] flex items-center justify-center shrink-0 [box-shadow:var(--ql-shadow-sm)]">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="w-[20px] h-[20px]"
              aria-hidden="true"
            >
              <path d="M16 48H44" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <path
                d="M19 25H41V34C41 40.0751 36.0751 45 30 45C23.9249 45 19 40.0751 19 34V25Z"
                fill="currentColor"
              />
              <path
                d="M41 27.5H44.5C47.5376 27.5 50 29.9624 50 33C50 36.0376 47.5376 38.5 44.5 38.5H41"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse
                cx="30"
                cy="34.5"
                rx="4.2"
                ry="5.8"
                transform="rotate(-18 30 34.5)"
                fill="var(--ql-accent-bg)"
              />
              <path
                d="M28.6 29.5C29.8 32.3 29.4 35.8 31.4 39.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M25 16.5C25 18.5 27 19 27 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M33 15C33 17.5 35 18.2 35 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] sm:text-base font-semibold tracking-tight leading-none text-[var(--ql-text-primary)] truncate">
            El Chiringuito
          </span>
        </div>

        {/* Controles derechos compactos */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
          {!isOnline && (
            <Badge variant="danger" size="sm" dot className="shrink-0">
              <WifiOff className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </Badge>
          )}

          {/* Toggle Tema Claro / Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] hover:border-[var(--ql-hairline-strong)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] flex items-center justify-center transition-colors duration-150 active:scale-[0.95] cursor-pointer select-none shrink-0 ql-focus-ring"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Badge neutro de usuario/rol + Salir discreto */}
          {currentUser && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Badge
                variant="default"
                size="md"
                className="h-8 sm:h-9 pl-1.5 pr-2.5 gap-1.5 max-w-[145px] sm:max-w-[210px] min-w-0"
              >
                <UserAvatarIcon icon={currentUser.avatar} size="xs" tone="neutral" />
                <span className="text-xs font-medium text-[var(--ql-text-primary)] truncate">
                  <span className="sm:hidden">{firstName}</span>
                  <span className="hidden sm:inline">{currentUser.name}</span>
                </span>
                {roleLabel && (
                  <span className="hidden md:inline text-[11px] font-normal text-[var(--ql-text-muted)] capitalize shrink-0">
                    · {roleLabel}
                  </span>
                )}
              </Badge>

              <button
                type="button"
                onClick={logout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border border-transparent hover:border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-tone-terracotta)] hover:bg-[var(--ql-tone-terracotta-soft)] flex items-center justify-center gap-1.5 text-xs font-medium transition-colors duration-150 active:scale-[0.96] cursor-pointer select-none shrink-0 ql-focus-ring"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
