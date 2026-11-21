import { Toaster as HotToaster } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

export const Toaster = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <HotToaster
      position="top-center"
      gutter={8}
      containerStyle={{
        top: 'max(14px, env(safe-area-inset-top, 14px))',
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 2400,
        style: {
          background: 'var(--ql-bg-glass)',
          backdropFilter: 'saturate(160%) blur(18px)',
          WebkitBackdropFilter: 'saturate(160%) blur(18px)',
          color: 'var(--ql-text-primary)',
          border: '1px solid var(--ql-hairline-strong)',
          borderRadius: '14px',
          padding: '10px 14px',
          fontSize: '13.5px',
          fontWeight: 500,
          lineHeight: '1.35',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          maxWidth: 'min(92vw, 420px)',
          boxShadow: 'var(--ql-inner-highlight), var(--ql-shadow-lg)',
        },
        success: {
          duration: 2200,
          iconTheme: {
            primary: isDark ? '#6BB38E' : '#2D6A4F',
            secondary: isDark ? '#171412' : '#FAF8F5',
          },
        },
        error: {
          duration: 3800,
          iconTheme: {
            primary: isDark ? '#DF7A7A' : '#A63A3A',
            secondary: isDark ? '#171412' : '#FAF8F5',
          },
        },
        loading: {
          iconTheme: {
            primary: isDark ? '#EFECE6' : '#141210',
            secondary: isDark ? '#2A2420' : '#E2DDD5',
          },
        },
      }}
    />
  );
};
