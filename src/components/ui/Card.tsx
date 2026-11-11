import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx('bg-slate-900 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden', className)
      )}
      {...props}
    >
      {children}
    </div>
  );
};
