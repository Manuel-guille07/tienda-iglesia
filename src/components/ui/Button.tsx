import React from 'react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'subtle'
    | 'success'
    | 'danger'
    | 'warning'
    | 'outline'
    | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--ql-accent-bg)] hover:bg-[var(--ql-accent-hover)] text-[var(--ql-accent-text)] border border-transparent [box-shadow:var(--ql-shadow-sm)]',
  success:
    'bg-[var(--ql-accent-bg)] hover:bg-[var(--ql-accent-hover)] text-[var(--ql-accent-text)] border border-transparent [box-shadow:var(--ql-shadow-sm)]',
  secondary:
    'bg-[var(--ql-bg-elevated)] hover:bg-[var(--ql-bg-muted)] text-[var(--ql-text-primary)] border border-[var(--ql-hairline)] [box-shadow:var(--ql-inner-highlight)]',
  subtle:
    'bg-[var(--ql-bg-card)] hover:bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] border border-[var(--ql-hairline)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)]',
  outline:
    'bg-transparent hover:bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] border border-[var(--ql-hairline-strong)]',
  ghost:
    'bg-transparent text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] hover:bg-[var(--ql-bg-elevated)] border border-transparent',
  danger:
    'bg-[var(--ql-tone-terracotta)] hover:opacity-90 text-[#FAF8F5] border border-transparent [box-shadow:var(--ql-shadow-sm)]',
  warning:
    'bg-[var(--ql-tone-amber)] hover:opacity-90 text-[#FAF8F5] border border-transparent [box-shadow:var(--ql-shadow-sm)]',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'min-h-[34px] text-xs px-3 py-1.5 gap-1.5',
  sm: 'min-h-[42px] text-sm px-4 py-2 gap-1.5',
  md: 'min-h-[46px] text-sm sm:text-base px-5 py-2.5 gap-2',
  lg: 'min-h-[52px] text-base px-6 py-3 gap-2.5 font-semibold',
  xl: 'min-h-[56px] text-lg px-7 py-3.5 gap-3 font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-[0.975] disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none whitespace-nowrap ql-focus-ring',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
