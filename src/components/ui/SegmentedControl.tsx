import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { QL_SPRING_SNAPPY } from '../../lib/motion';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  variant?: 'surface' | 'accent';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  variant = 'surface',
  size = 'md',
  fullWidth = false,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center p-1 rounded-full bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] [box-shadow:inset_0_1px_2px_rgba(20,18,16,0.04)]',
        fullWidth && 'flex w-full',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150 cursor-pointer select-none whitespace-nowrap ql-focus-ring disabled:opacity-40 disabled:pointer-events-none',
              fullWidth && 'flex-1',
              size === 'sm' ? 'min-h-[34px] px-3 text-xs' : 'min-h-[40px] px-4 text-sm',
              isActive
                ? variant === 'accent'
                  ? 'text-[var(--ql-accent-text)] font-semibold'
                  : 'text-[var(--ql-text-primary)] font-semibold'
                : 'text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={QL_SPRING_SNAPPY}
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 -z-10 rounded-full',
                  variant === 'accent'
                    ? 'bg-[var(--ql-accent-bg)] [box-shadow:var(--ql-shadow-sm)]'
                    : 'bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)]'
                )}
              />
            )}
            {option.icon && (
              <span className="shrink-0 flex items-center" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span className="truncate">{option.label}</span>
            {option.badge !== undefined && option.badge !== null && option.badge !== '' && (
              <span
                className={cn(
                  'ql-num text-[11px] leading-none px-1.5 py-0.5 rounded-full',
                  isActive && variant === 'accent'
                    ? 'bg-[var(--ql-accent-text)]/15 text-[var(--ql-accent-text)]'
                    : 'bg-[var(--ql-bg-muted)] text-[var(--ql-text-secondary)]'
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
