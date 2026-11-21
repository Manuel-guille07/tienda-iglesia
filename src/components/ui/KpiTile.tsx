import React from 'react';
import { cn } from '../../lib/cn';
import { formatCurrencyParts } from '../../utils/finance';

export type KpiTone = 'neutral' | 'sage' | 'slate' | 'amber' | 'plum' | 'terracotta';

export interface KpiTileProps {
  label: string;
  /** Importe numérico formateado automáticamente en '0,00 €' con jerarquía editorial */
  money?: number;
  /** Valor alternativo cuando no es importe (p. ej. contadores) */
  value?: React.ReactNode;
  showSign?: boolean;
  sublabel?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: KpiTone;
  featured?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const TONE_ICON_STYLES: Record<KpiTone, string> = {
  neutral: 'bg-[var(--ql-bg-elevated)] text-[var(--ql-text-secondary)]',
  sage: 'bg-[var(--ql-tone-sage-soft)] text-[var(--ql-tone-sage)]',
  slate: 'bg-[var(--ql-tone-slate-soft)] text-[var(--ql-tone-slate)]',
  amber: 'bg-[var(--ql-tone-amber-soft)] text-[var(--ql-tone-amber)]',
  plum: 'bg-[var(--ql-tone-plum-soft)] text-[var(--ql-tone-plum)]',
  terracotta: 'bg-[var(--ql-tone-terracotta-soft)] text-[var(--ql-tone-terracotta)]',
};

const TONE_DOT_STYLES: Record<KpiTone, string> = {
  neutral: 'bg-[var(--ql-text-muted)]',
  sage: 'bg-[var(--ql-tone-sage)]',
  slate: 'bg-[var(--ql-tone-slate)]',
  amber: 'bg-[var(--ql-tone-amber)]',
  plum: 'bg-[var(--ql-tone-plum)]',
  terracotta: 'bg-[var(--ql-tone-terracotta)]',
};

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  money,
  value,
  showSign = false,
  sublabel,
  icon,
  tone = 'neutral',
  featured = false,
  compact = false,
  onClick,
  className,
}) => {
  const parts = money !== undefined ? formatCurrencyParts(money, { showSign }) : null;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'w-full text-left rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow)] transition-all duration-150',
        featured ? 'p-4 sm:p-5' : compact ? 'p-3.5' : 'p-4',
        onClick &&
          'cursor-pointer select-none hover:border-[var(--ql-hairline-strong)] active:scale-[0.985] ql-focus-ring',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!icon && tone !== 'neutral' && (
            <span
              aria-hidden="true"
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', TONE_DOT_STYLES[tone])}
            />
          )}
          <span className="text-xs font-medium text-[var(--ql-text-secondary)] truncate">
            {label}
          </span>
        </div>

        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 flex items-center justify-center rounded-lg border border-[var(--ql-hairline)]',
              compact ? 'w-7 h-7' : 'w-8 h-8',
              TONE_ICON_STYLES[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <div className={cn(featured ? 'mt-2.5' : compact ? 'mt-2' : 'mt-2.5')}>
        {parts ? (
          <p
            aria-label={parts.full}
            className={cn(
              'ql-num font-semibold text-[var(--ql-text-primary)] leading-none tracking-tight',
              featured
                ? 'text-3xl sm:text-[2rem]'
                : compact
                ? 'text-xl sm:text-2xl'
                : 'text-2xl'
            )}
          >
            {parts.sign}
            {parts.integer}
            <span className="text-[0.72em] font-medium text-[var(--ql-text-secondary)]">
              {parts.decimal}
            </span>
            <span className="text-[0.68em] font-medium text-[var(--ql-text-muted)] ml-1">
              {parts.symbol}
            </span>
          </p>
        ) : (
          <p
            className={cn(
              'ql-num font-semibold text-[var(--ql-text-primary)] leading-none tracking-tight',
              featured
                ? 'text-3xl sm:text-[2rem]'
                : compact
                ? 'text-xl sm:text-2xl'
                : 'text-2xl'
            )}
          >
            {value}
          </p>
        )}
      </div>

      {sublabel && (
        <p className="mt-2 text-[11px] leading-snug text-[var(--ql-text-muted)] truncate ql-num">
          {sublabel}
        </p>
      )}
    </Wrapper>
  );
};
