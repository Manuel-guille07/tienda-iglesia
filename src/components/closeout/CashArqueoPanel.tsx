import React from 'react';
import { Button } from '../ui/Button';

interface CashArqueoPanelProps {
  expectedCash: number;
  salesCash?: number;
  tabPaymentsCash?: number;
  counted: number;
  onCountedChange: (val: number) => void;
  difference: number;
  onConfirmClose: () => void;
  isSubmitting?: boolean;
}

export const CashArqueoPanel: React.FC<CashArqueoPanelProps> = ({
  expectedCash,
  salesCash = 0,
  tabPaymentsCash = 0,
  counted,
  onCountedChange,
  difference,
  onConfirmClose,
  isSubmitting = false,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-sm text-white">Arqueo de Efectivo Físico</h3>

      <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-medium">Efectivo total esperado:</span>
          <strong className="text-emerald-400 text-sm font-bold">{expectedCash.toFixed(2)}€</strong>
        </div>

        {tabPaymentsCash > 0 && (
          <div className="pt-1.5 border-t border-slate-700/40 text-[11px] text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>• Ventas en mostrador:</span>
              <span className="text-slate-300 font-medium">{salesCash.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span>• Abonos de fiados recibidos:</span>
              <span className="text-amber-400 font-medium">+{tabPaymentsCash.toFixed(2)}€</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Efectivo físico contado en gaveta:</label>
        <input
          type="number"
          step="0.50"
          min="0"
          value={Number.isFinite(counted) ? counted || '' : ''}
          placeholder="0.00"
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            const safeVal = Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0;
            onCountedChange(safeVal);
          }}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xl font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="p-2.5 rounded-xl border border-slate-700 flex justify-between text-xs items-center">
        <span className="text-slate-300">Diferencia / Descuadre:</span>
        <strong className={`text-sm ${difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {difference > 0 ? `+${difference.toFixed(2)}€ (Sobrante)` : difference < 0 ? `${difference.toFixed(2)}€ (Faltante)` : '0.00€ (Exacto)'}
        </strong>
      </div>

      <Button
        variant="success"
        size="lg"
        disabled={isSubmitting || !Number.isFinite(counted) || counted < 0}
        isLoading={isSubmitting}
        className="w-full font-bold shadow-lg"
        onClick={onConfirmClose}
      >
        Confirmar y Cerrar Turno
      </Button>
    </div>
  );
};
