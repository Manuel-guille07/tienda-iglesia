import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Delete, Lock, User as UserIcon, ChevronDown } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { users, selectedUserForPin, setSelectedUserForPin, loginWithPin, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');

  // Si ya está autenticado por persistencia, redirigir directo al POS
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Soporte para teclado físico (numérico y estándar)
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
    const target = selectedUserForPin || users[0];
    const toastId = toast.loading('Autenticando...');
    const result = await loginWithPin(pinToTest);
    toast.dismiss(toastId);

    if (result.success) {
      toast.success(t('auth.welcome', { name: target?.name || 'Usuario' }));
      navigate('/pos', { replace: true });
    } else {
      toast.error(result.message || t('auth.incorrectPin'));
      setPin('');
    }
  };

  const currentSelected = selectedUserForPin || users[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center">
        {/* ELARX Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-white">
                ELARX
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">ELARX POS</h1>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
              v1.2 Core
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Terminal de Ventas & Gestión Híbrida</p>
        </div>

        {/* Únicamente un <select> estilizado con branding ELARX para elegir usuario */}
        <div className="w-full mb-6">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
            {t('auth.selectUser')}
          </label>

          <div className="relative">
            <select
              value={currentSelected.id}
              onChange={(e) => {
                const found = users.find((u) => u.id === e.target.value);
                if (found) {
                  setSelectedUserForPin(found);
                  setPin('');
                }
              }}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-2xl text-sm font-semibold text-white appearance-none transition cursor-pointer shadow-inner"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white py-2">
                  {u.avatar || '👤'} {u.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex flex-col items-center mb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            PIN de Seguridad (4 dígitos)
          </span>
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > index
                    ? 'bg-indigo-500 scale-125 shadow-lg shadow-indigo-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigitInput(digit)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-indigo-600 border border-slate-700/60 text-xl font-bold text-white shadow transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700/60 text-xs font-bold text-slate-400 hover:text-rose-400 shadow transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            CLEAR
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigitInput('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-indigo-600 border border-slate-700/60 text-xl font-bold text-white shadow transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-750 border border-slate-700/60 text-slate-300 shadow transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Helper footer */}
        <div className="text-center text-[10px] text-slate-500">
          Usa el selector desplegable y introduce el PIN de 4 dígitos
        </div>
      </div>
    </div>
  );
};
