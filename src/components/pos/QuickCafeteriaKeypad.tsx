import React from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Coffee, Plus } from 'lucide-react';

export const QuickCafeteriaKeypad: React.FC = () => {
  const { t } = useLanguage();
  const { products, addToCart } = usePOSStore();

  const presets = products.filter((p) => (p.isQuickAccess || p.isPreset) && p.isSellable !== false);

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'from-amber-600/30 to-amber-900/40 border-amber-600/40 hover:border-amber-500 text-amber-200';
      case 'orange':
        return 'from-orange-600/30 to-orange-900/40 border-orange-600/40 hover:border-orange-500 text-orange-200';
      case 'yellow':
        return 'from-yellow-600/30 to-yellow-900/40 border-yellow-600/40 hover:border-yellow-500 text-yellow-200';
      case 'emerald':
        return 'from-emerald-600/30 to-emerald-900/40 border-emerald-600/40 hover:border-emerald-500 text-emerald-200';
      case 'cyan':
        return 'from-cyan-600/30 to-cyan-900/40 border-cyan-600/40 hover:border-cyan-500 text-cyan-200';
      case 'red':
        return 'from-rose-600/30 to-rose-900/40 border-rose-600/40 hover:border-rose-500 text-rose-200';
      default:
        return 'from-indigo-600/30 to-indigo-900/40 border-indigo-600/40 hover:border-indigo-500 text-indigo-200';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Coffee className="w-4 h-4 text-amber-400" />
          {t('pos.quickKeypad')}
        </h2>
        <span className="text-[11px] text-slate-400">1-Toque rápido</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {presets.map((product) => {
          return (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className={`p-3 rounded-xl border bg-gradient-to-br transition-all duration-150 active:scale-95 text-left flex flex-col justify-between h-24 sm:h-26 cursor-pointer relative overflow-hidden shadow group ${getColorClass(
                product.color
              )}`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <span className="font-semibold text-xs sm:text-sm text-white leading-snug line-clamp-2">
                  {product.name}
                </span>
                <span className="p-1 rounded-lg bg-white/10 group-hover:bg-white/20 transition shrink-0">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </span>
              </div>

              <div className="flex items-center justify-between w-full mt-auto pt-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {product.price.toFixed(2)}€
                </span>
                {product.recipe && (
                  <span className="text-[10px] text-slate-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                    ☕ Receta
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {presets.length === 0 && (
          <div className="col-span-full py-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-xs font-semibold text-slate-300">No hay productos en la botonera rápida.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Los botones se generan automáticamente a partir de los insumos descargados de Supabase o creados en Inventario.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
