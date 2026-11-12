import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Delete, Lock, User as UserIcon, Sun, Moon } from 'lucide-react';
import { UserSelectDropdown } from '../ui/UserSelectDropdown';

export const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const {
    users,
    selectedUserForPin,
    setSelectedUserForPin,
    loginWithPin,
    isLoading,
    isLoadingProfiles,
    isAuthenticated,
  } = useAuthStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          triggerLogin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUserForPin]);

  const handleDigitInput = (num: string) => {
    if (pin.length < 4 && !isLoading) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        triggerLogin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const triggerLogin = async (pinToTest: string) => {
    if (!selectedUserForPin) {
      toast.error(t('auth.selectUser'));
      return;
    }

    const toastId = toast.loading('Autenticando...');
    const result = await loginWithPin(pinToTest);
    toast.dismiss(toastId);

    if (result.success) {
      toast.success(t('auth.welcome', { name: selectedUserForPin.name || 'Usuario' }));
      navigate('/pos', { replace: true });
    } else {
      toast.error(result.message || t('auth.incorrectPin'));
      setPin('');
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200 ${
        isDark ? 'bg-[#0E0C0B] text-[#F4F0EA]' : 'bg-[#EFECE6] text-[#141210]'
      }`}
    >
      {/* Interruptor de Tema en esquina superior derecha */}
      <div className="fixed top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className={`min-h-[48px] px-4 rounded-full border flex items-center gap-2 text-sm font-medium transition cursor-pointer ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-300" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#141210]" />
              <span>Modo Oscuro</span>
            </>
          )}
        </button>
      </div>

      {/* Tarjeta Central Quiet Luxury */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-xl flex flex-col items-center transition-colors ${
          isDark
            ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
            : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
        }`}
      >
        {/* Cabecera Arquitectónica ELARX */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 font-serif text-xl font-bold tracking-tight ${
              isDark ? 'bg-[#EFECE6] text-[#141210]' : 'bg-[#141210] text-[#FAF8F5]'
            }`}
          >
            EX
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('app.title')}</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
            {t('auth.subtitle')}
          </p>
        </div>

        {/* Selector de Perfil */}
        <div className="w-full mb-6">
          <label
            className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2 ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            {t('auth.selectUser')}
          </label>

          {isLoadingProfiles ? (
            <div
              className={`w-full min-h-[56px] px-4 py-3 rounded-3xl border flex items-center justify-center gap-2 text-sm ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#6E665E]'
              }`}
            >
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{t('auth.loadingProfiles')}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="w-full min-h-[56px] px-4 py-3 rounded-3xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500 text-center">
              {t('auth.noUsers')}
            </div>
          ) : (
            <UserSelectDropdown
              users={users}
              selectedUser={selectedUserForPin}
              disabled={isLoading}
              onSelect={(user) => {
                setSelectedUserForPin(user);
                setPin('');
              }}
            />
          )}
        </div>

        {/* Indicador de PIN de 4 dígitos */}
        <div className="flex flex-col items-center mb-6">
          <span
            className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            {t('auth.enterPin')}
          </span>
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3].map((index) => {
              const filled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    filled
                      ? isDark
                        ? 'bg-[#EFECE6] scale-125'
                        : 'bg-[#141210] scale-125'
                      : isDark
                      ? 'bg-[#211D1A] border border-[#3D352F]'
                      : 'bg-[#EFECE6] border border-[#CFC8BC]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Teclado Táctil de Alto Contraste (Botones de 60px para máxima comodidad táctil) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigitInput(digit)}
              className={`h-15 rounded-2xl border text-2xl font-semibold tabular-nums transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none disabled:opacity-50 ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F] active:bg-[#EFECE6] active:text-[#141210]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC] active:bg-[#141210] active:text-[#FAF8F5]'
              }`}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClear}
            className={`h-15 rounded-2xl border text-xs font-bold tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none ${
              isDark
                ? 'bg-[#211D1A]/60 border-[#2A2420] text-[#9A9086] hover:text-rose-300'
                : 'bg-[#EFECE6]/60 border-[#E2DDD5] text-[#6E665E] hover:text-rose-700'
            }`}
          >
            Borrar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigitInput('0')}
            className={`h-15 rounded-2xl border text-2xl font-semibold tabular-nums transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none disabled:opacity-50 ${
              isDark
                ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F] active:bg-[#EFECE6] active:text-[#141210]'
                : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC] active:bg-[#141210] active:text-[#FAF8F5]'
            }`}
          >
            0
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDelete}
            aria-label="Borrar último dígito"
            className={`h-15 rounded-2xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none ${
              isDark
                ? 'bg-[#211D1A]/60 border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#EFECE6]/60 border-[#E2DDD5] text-[#141210]'
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
