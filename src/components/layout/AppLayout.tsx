import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../common/Header';
import { Navigation } from '../common/Navigation';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <Header />
      <Navigation />
      <main className="flex-1 pb-20 md:pb-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
