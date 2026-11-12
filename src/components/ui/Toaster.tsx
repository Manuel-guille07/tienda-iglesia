import { Toaster as HotToaster } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

export const Toaster = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        style: {
          background: isDark ? '#171412' : '#FAF8F5',
          color: isDark ? '#F4F0EA' : '#141210',
          border: isDark ? '1px solid #2A2420' : '1px solid #E2DDD5',
          borderRadius: '9999px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: isDark
            ? '0 14px 36px -10px rgba(0,0,0,0.6)'
            : '0 12px 30px -10px rgba(20,18,16,0.12)',
        },
        success: {
          iconTheme: {
            primary: isDark ? '#EFECE6' : '#141210',
            secondary: isDark ? '#141210' : '#FAF8F5',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FAF8F5',
          },
        },
      }}
    />
  );
};
