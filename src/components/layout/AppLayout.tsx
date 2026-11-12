import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../common/Header';
import { Navigation } from '../common/Navigation';
import { useTheme } from '../../context/ThemeContext';

export const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col antialiased transition-colors duration-200 ${
        isDark ? 'bg-[#0E0C0B] text-[#F4F0EA]' : 'bg-[#EFECE6] text-[#141210]'
      }`}
    >
      <Header />
      <Navigation />
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-24 lg:pb-10">
        <Outlet />
      </main>
    </div>
  );
};
