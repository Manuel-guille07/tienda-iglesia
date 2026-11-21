import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { SurfaceCard } from '../ui/SurfaceCard';
import { formatCurrency, parseMoneyInput, toCents } from '../../utils/finance';
import { cn } from '../../lib/cn';

interface CashArqueoPanelProps {
  expectedCash: number;
  salesCash?: number;
  tabPaymentsCash?: number;
  donativosCash?: number;
  counted: number;
  onCountedChange: (val: number) => void;
  difference: number;
  onConfirmClose: () => void | Promise<void>;
  isSubmitting?: boolean;
}

export const CashArqueoPanel: React.FC<CashArqueoPanelProps> = ({
  expectedCash,
  salesCash = 0,
  tabPaymentsCash = 0,
  donativosCash = 0,
  counted,
  onCountedChange,
  difference,
  onConfirmClose,
  isSubmitting = false,
}) => {
  const [draft, setDraft] = useState<string>(Number.isFinite(counted) ? String(counted) : '');

  useEffect(() => {
    const parsedDraft = parseMoneyInput(draft);
    if (!Number.isFinite(counted)) {
      setDraft('');
    } else if (parsedDraft === null || toCents(parsedDraft) !== toCents(counted)) {
      if (!(draft === '' && toCents(counted) === 0)) {
        setDraft(String(counted));
      }
    }
  }, [counted]);

  const isExact = toCents(difference) === 0;

  return (
    <SurfaceCard padding="md" radius="xl" className="sm:p-6 space-y-4">
      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--ql-text-primary)]">
        Arqueo de Efectivo Físico
      </h3>

      <div className="p-4 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
          <span className="font-medium text-[var(--ql-text-secondary)]">
            Efectivo total esperado en caja
          </span>
          <strong className="text-lg font-semibold ql-num text-[var(--ql-text-primary)]">
            {formatCurrency(expectedCash)}
          </strong>
        </div>

        <div className="pt-2.5 border-t border-[var(--ql-hairline)] flex flex-col gap-1.5 text-xs text-[var(--ql-text-secondary)]">
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span>Ventas del turno (efectivo)</span>
            <span className="font-medium ql-num text-[var(--ql-text-primary)]">
              {formatCurrency(salesCash)}
            </span>
          </div>
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span>Abonos recibidos (deudas previas)</span>
            <span className="font-medium ql-num text-[var(--ql-text-primary)]">
              {formatCurrency(tabPaymentsCash, { showSign: tabPaymentsCash > 0 })}
            </span>
          </div>
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span>Donativos en efectivo</span>
            <span className="font-medium ql-num text-[var(--ql-text-primary)]">
              {formatCurrency(donativosCash, { showSign: donativosCash > 0 })}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs sm:text-sm font-medium text-[var(--ql-text-secondary)] block mb-1.5">
          Efectivo físico contado en gaveta (€)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          placeholder="0,00"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              setDraft('');
              onCountedChange(0);
              return;
            }
            if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
            setDraft(raw);
            const parsed = parseMoneyInput(raw);
            if (parsed !== null) {
              onCountedChange(parsed);
            }
          }}
          onBlur={() => {
            const parsed = parseMoneyInput(draft);
            const safeVal = parsed ?? 0;
            setDraft(String(safeVal));
            onCountedChange(safeVal);
          }}
          className="w-full min-h-[52px] rounded-2xl px-4 py-3 text-2xl font-semibold ql-num border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)] transition-colors"
        />
      </div>

      <div className="px-4 py-3 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)]/60 flex justify-between text-sm items-center gap-2">
        <span className="text-[var(--ql-text-secondary)]">Diferencia / Descuadre</span>
        <strong
          className={cn(
            'text-sm sm:text-base font-semibold ql-num',
            isExact
              ? 'text-[var(--ql-tone-sage)]'
              : 'text-[var(--ql-tone-terracotta)]'
          )}
        >
          {difference > 0
            ? `${formatCurrency(difference, { showSign: true })} (Sobrante)`
            : difference < 0
            ? `${formatCurrency(difference)} (Faltante)`
            : `${formatCurrency(0)} (Exacto)`}
        </strong>
      </div>

      <Button
        variant="primary"
        size="xl"
        disabled={isSubmitting || !Number.isFinite(counted) || counted < 0}
        isLoading={isSubmitting}
        className="w-full"
        onClick={onConfirmClose}
      >
        Confirmar y Cerrar Turno
      </Button>
    </SurfaceCard>
  );
};
