import { Toaster as HotToaster } from 'react-hot-toast';

export const Toaster = () => {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        className: 'bg-slate-800 text-slate-100 border border-slate-700',
        success: {
          style: {
            background: '#1e293b',
            color: '#22c55e',
          },
        },
        error: {
          style: {
            background: '#1e293b',
            color: '#ef4444',
          },
        },
      }}
    />
  );
};
