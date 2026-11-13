import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fromCents, parseMoneyInput, toCents } from '../../utils/finance';

interface ChangeCalculatorProps {
  total: number;
  tendered: number;
  onTenderedChange: (val: number) => void;
}

export const ChangeCalculator: React.FC<ChangeCalculatorProps> = ({
  total,
  tendered,
  onTenderedChange,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [draft, setDraft] = useState<string>(Number.isFinite(tendered) ? String(tendered) : '');

  useEffect(() => {
    const parsedDraft = parseMoneyInput(draft);
    if (!Number.isFinite(tendered)) {
      setDraft('');
    } else if (parsedDraft === null || toCents(parsedDraft) !== toCents(tendered)) {
      if (!(draft === '' && toCents(tendered) === 0)) {
        setDraft(String(tendered));
      }
    }
  }, [tendered]);

  const change = fromCents(Math.max(0, toCents(tendered) - toCents(total)));

  const handleQuickSelect = (amt: number) => {
    const safeAmt = fromCents(Math.max(0, toCents(amt)));
    setDraft(String(safeAmt));
    onTenderedChange(safeAmt);
  };

  return (
    <div
      className={`p-4 rounded-3xl border space-y-3 ${
        isDark
          ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
      }`}
    >
      {/* Botones rápidos de billetes (mínimo 44px de altura) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickSelect(total)}
          className={`flex-1 min-h-[44px] px-3 rounded-full text-sm font-semibold border transition cursor-pointer ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] hover:border-[#EFECE6]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] hover:border-[#141210]'
          }`}
        >
          Exacto ({total.toFixed(2)} €)
        </button>
        {[5, 10, 20, 50].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickSelect(amt)}
            className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border tabular-nums transition cursor-pointer ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] hover:border-[#EFECE6]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] hover:border-[#141210]'
            }`}
          >
            {amt} €
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className={`text-xs font-medium block mb-1 ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            Efectivo recibido (€):
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
                onTenderedChange(0);
                return;
              }
              if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
              setDraft(raw);
              const parsed = parseMoneyInput(raw);
              if (parsed !== null) {
                onTenderedChange(parsed);
              }
            }}
            onBlur={() => {
              const parsed = parseMoneyInput(draft);
              const safeVal = parsed ?? 0;
              setDraft(String(safeVal));
              onTenderedChange(safeVal);
            }}
            className={`w-full min-h-[48px] rounded-2xl px-3.5 py-2 text-lg font-bold tabular-nums border focus:outline-none ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
            }`}
          />
        </div>
        <div>
          <label
            className={`text-xs font-medium block mb-1 ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            Cambio a devolver:
          </label>
          <div
            className={`min-h-[48px] rounded-2xl px-3.5 py-2 flex items-center text-lg font-bold tabular-nums border ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-emerald-400'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-emerald-800'
            }`}
          >
            {change.toFixed(2)} €
          </div>
        </div>
      </div>
    </div>
  );
};
