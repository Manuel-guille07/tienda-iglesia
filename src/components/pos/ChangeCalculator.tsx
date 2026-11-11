import React from 'react';

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
  const change = Math.max(0, Number((tendered - total).toFixed(2)));

  return (
    <div className="p-3 bg-slate-800/40 border border-slate-700 rounded-xl space-y-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onTenderedChange(total)}
          className="flex-1 py-1 bg-slate-700 hover:bg-slate-650 text-xs font-bold rounded text-white"
        >
          Exacto ({total.toFixed(2)}€)
        </button>
        {[5, 10, 20, 50].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => onTenderedChange(amt)}
            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded"
          >
            {amt}€
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Efectivo recibido:</label>
          <input
            type="number"
            step="0.10"
            value={tendered || ''}
            onChange={(e) => onTenderedChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Cambio a devolver:</label>
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded px-2 py-1 text-sm font-extrabold text-emerald-400">
            {change.toFixed(2)}€
          </div>
        </div>
      </div>
    </div>
  );
};
