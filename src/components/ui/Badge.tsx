import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const variants = {
    default: isDark
      ? 'bg-[#211D1A] text-[#F4F0EA] border-[#2A2420]'
      : 'bg-[#EFECE6] text-[#141210] border-[#E2DDD5]',
    success: isDark
      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
      : 'bg-emerald-100/90 text-emerald-900 border-emerald-300',
    warning: isDark
      ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
      : 'bg-amber-100/90 text-amber-900 border-amber-300',
    danger: isDark
      ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
      : 'bg-rose-100/90 text-rose-900 border-rose-300',
    info: isDark
      ? 'bg-[#211D1A] text-[#F4F0EA] border-[#2A2420]'
      : 'bg-[#EFECE6] text-[#141210] border-[#E2DDD5]',
    purple: isDark
      ? 'bg-[#2A2420] text-[#EFECE6] border-[#3D352F]'
      : 'bg-[#E6E1D8] text-[#141210] border-[#CFC8BC]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-medium rounded-full border shrink-0',
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
