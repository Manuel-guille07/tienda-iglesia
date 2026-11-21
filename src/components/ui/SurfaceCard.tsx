import React from 'react';
import { cn } from '../../lib/cn';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'md' | 'lg' | 'xl';
  interactive?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<SurfaceCardProps['variant']>, string> = {
  default:
    'bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow)]',
  elevated:
    'bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] [box-shadow:var(--ql-inner-highlight)]',
  subtle:
    'bg-[var(--ql-bg-muted)]/60 border border-[var(--ql-hairline)]',
  glass:
    'ql-glass border [box-shadow:var(--ql-shadow-sm)]',
};

const PADDING_CLASSES: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

const RADIUS_CLASSES: Record<NonNullable<SurfaceCardProps['radius']>, string> = {
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
};

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'none',
      radius = 'lg',
      interactive = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'text-[var(--ql-text-primary)] overflow-hidden transition-colors duration-150',
          VARIANT_CLASSES[variant],
          PADDING_CLASSES[padding],
          RADIUS_CLASSES[radius],
          interactive &&
            'cursor-pointer select-none hover:border-[var(--ql-hairline-strong)] active:scale-[0.985] transition-transform',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SurfaceCard.displayName = 'SurfaceCard';
