import React from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] border-[var(--ql-hairline)]',
  subtle: 'bg-[var(--ql-bg-muted)]/75 text-[var(--ql-text-secondary)] border-[var(--ql-hairline)]',
  success: 'bg-[var(--ql-tone-sage-soft)] text-[var(--ql-tone-sage)] border-[var(--ql-hairline)]',
  warning: 'bg-[var(--ql-tone-amber-soft)] text-[var(--ql-tone-amber)] border-[var(--ql-hairline)]',
  danger:
    'bg-[var(--ql-tone-terracotta-soft)] text-[var(--ql-tone-terracotta)] border-[var(--ql-hairline)]',
  info: 'bg-[var(--ql-tone-slate-soft)] text-[var(--ql-tone-slate)] border-[var(--ql-hairline)]',
  purple: 'bg-[var(--ql-tone-plum-soft)] text-[var(--ql-tone-plum)] border-[var(--ql-hairline)]',
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[11px] leading-tight px-2 py-0.5 gap-1.5',
  md: 'text-xs leading-tight px-2.5 py-1 gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shrink-0 whitespace-nowrap',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {dot && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current opacity-85" />}
      {children}
    </span>
  );
};
