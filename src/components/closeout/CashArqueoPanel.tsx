import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { parseMoneyInput, toCents } from '../../utils/finance';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 space-y-4 border ${
        isDark
          ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
      }`}
    >
      <h3 className="text-lg font-semibold tracking-tight">Arqueo de Efectivo Físico</h3>

      <div
        className={`p-4 rounded-2xl border space-y-2.5 ${
          isDark ? 'bg-[#211D1A] border-[#2A2420]' : 'bg-[#EFECE6] border-[#E2DDD5]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
          <span className="font-medium whitespace-normal break-words">Efectivo total esperado en caja:</span>
          <strong className="text-lg font-bold tabular-nums">{expectedCash.toFixed(2)} €</strong>
        </div>

        <div
          className={`pt-2 border-t flex flex-col gap-1.5 text-xs text-surface-500 whitespace-normal break-words ${
            isDark ? 'border-[#2A2420] text-[#9A9086]' : 'border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-normal break-words">• Ventas de Hoy (Efectivo):</span>
            <span className="font-medium tabular-nums">{salesCash.toFixed(2)} €</span>
          </div>
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-normal break-words">• Abonos Recibidos (Deudas previas):</span>
            <span className="font-medium tabular-nums">+{tabPaymentsCash.toFixed(2)} €</span>
          </div>
          <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-normal break-words">• Donativos en efectivo:</span>
            <span className="font-medium tabular-nums">+{donativosCash.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div>
        <label
          className={`text-sm font-medium block mb-1.5 ${
            isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
          }`}
        >
          Efectivo físico contado en gaveta (€):
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          placeholder="0.00"
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
          className={`w-full min-h-[52px] rounded-2xl p-3.5 text-2xl font-bold tabular-nums border focus:outline-none ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
          }`}
        />
      </div>

      <div
        className={`p-3.5 rounded-2xl border flex justify-between text-sm items-center ${
          isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
        }`}
      >
        <span>Diferencia / Descuadre:</span>
        <strong
          className={`text-base tabular-nums ${
            difference === 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {difference > 0
            ? `+${difference.toFixed(2)} € (Sobrante)`
            : difference < 0
            ? `${difference.toFixed(2)} € (Faltante)`
            : '0.00 € (Exacto)'}
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
    </div>
  );
};
