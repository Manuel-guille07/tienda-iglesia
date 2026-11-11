import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/useAuthStore';
import { ShoppingCart, LogIn, AlertOctagon, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export const NotFound404: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Glowing 404 Badge */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-lg shadow-indigo-500/10">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-indigo-400 uppercase tracking-widest mb-3">
          Error 404
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          {t('404.title')}
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-8 max-w-xs">
          {t('404.subtitle')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {isAuthenticated ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center text-sm font-semibold py-3"
              icon={<ShoppingCart className="w-4 h-4" />}
              onClick={() => navigate('/pos')}
            >
              {t('404.backPos')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center text-sm font-semibold py-3"
              icon={<LogIn className="w-4 h-4" />}
              onClick={() => navigate('/')}
            >
              {t('404.backLogin')}
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            className="w-full justify-center text-xs text-slate-400"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate(-1)}
          >
            Regresar a la pantalla anterior
          </Button>
        </div>

        {/* ELARX Brand Stamp */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>ELARX SECURE POS</span>
          <span>HTTP_STATUS_404</span>
        </div>
      </div>
    </div>
  );
};
