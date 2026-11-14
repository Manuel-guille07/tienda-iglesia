import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { ShoppingCart, LogIn, AlertOctagon, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export const NotFound404: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors ${
        isDark ? 'bg-[#0E0C0B] text-[#F4F0EA]' : 'bg-[#EFECE6] text-[#141210]'
      }`}
    >
      <div
        className={`relative w-full max-w-md border rounded-3xl p-8 shadow-xl text-center flex flex-col items-center ${
          isDark
            ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
            : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-6 ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
          }`}
        >
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div
          className={`inline-block px-3 py-1 rounded-full border text-[11px] font-mono uppercase tracking-widest mb-3 ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          Error 404
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          {t('404.title')}
        </h1>
        <p className={`text-xs leading-relaxed mb-8 max-w-xs ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
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
            className="w-full justify-center text-xs"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate(-1)}
          >
            Regresar a la pantalla anterior
          </Button>
        </div>

        {/* El Chiringuito Brand Stamp */}
        <div
          className={`mt-8 pt-4 border-t w-full flex items-center justify-between text-[10px] font-mono ${
            isDark ? 'border-[#2A2420] text-[#9A9086]' : 'border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          <span>EL CHIRINGUITO POS</span>
          <span>HTTP_STATUS_404</span>
        </div>
      </div>
    </div>
  );
};
