import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none';

  const variants = {
    primary: isDark
      ? 'bg-[#EFECE6] hover:bg-[#FAF8F5] text-[#141210] shadow-md border border-[#EFECE6]'
      : 'bg-[#141210] hover:bg-[#2A2420] text-[#FAF8F5] shadow-md border border-[#141210]',
    secondary: isDark
      ? 'bg-[#211D1A] hover:bg-[#2A2420] text-[#F4F0EA] border border-[#2A2420]'
      : 'bg-[#EFECE6] hover:bg-[#E2DDD5] text-[#141210] border border-[#E2DDD5]',
    success: isDark
      ? 'bg-[#EFECE6] hover:bg-[#FAF8F5] text-[#141210] shadow-md border border-[#EFECE6]'
      : 'bg-[#141210] hover:bg-[#2A2420] text-[#FAF8F5] shadow-md border border-[#141210]',
    danger: isDark
      ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-100 border border-rose-700/60'
      : 'bg-rose-700 hover:bg-rose-800 text-white border border-rose-800',
    warning: isDark
      ? 'bg-amber-950/90 hover:bg-amber-900 text-amber-100 border border-amber-700/60'
      : 'bg-amber-700 hover:bg-amber-800 text-white border border-amber-800',
    outline: isDark
      ? 'bg-transparent border border-[#2A2420] text-[#F4F0EA] hover:bg-[#211D1A]'
      : 'bg-transparent border border-[#E2DDD5] text-[#141210] hover:bg-[#EFECE6]',
    ghost: isDark
      ? 'text-[#9A9086] hover:text-[#F4F0EA] hover:bg-[#211D1A]'
      : 'text-[#6E665E] hover:text-[#141210] hover:bg-[#EFECE6]',
  };

  const sizes = {
    sm: 'min-h-[44px] text-sm px-4 py-2 gap-1.5',
    md: 'min-h-[48px] text-base px-5 py-2.5 gap-2',
    lg: 'min-h-[52px] text-base px-6 py-3 gap-2.5 font-semibold',
    xl: 'min-h-[56px] text-lg px-7 py-3.5 gap-3 font-semibold',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
