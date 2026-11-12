import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Plus, AlertTriangle, Ban } from 'lucide-react';

export const QuickCafeteriaKeypad: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { products, rawMaterials, addToCart } = usePOSStore();

  const presets = products.filter((p) => (p.isQuickAccess || p.isPreset) && p.isSellable !== false);

  if (presets.length === 0) return null;

  return (
    <div
      className={`rounded-3xl p-5 border ${
        isDark
          ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold tracking-tight">{t('pos.quickKeypad')}</h2>
        <span className={`text-xs ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
          Acceso directo
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {presets.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';

          return (
            <button
              key={product.id}
              type="button"
              disabled={isOut}
              onClick={() => addToCart(product)}
              className={`p-4 rounded-3xl border text-left flex flex-col justify-between min-h-[120px] transition active:scale-[0.98] cursor-pointer ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
              }`}
            >
              <span className="text-base font-medium leading-snug line-clamp-2">
                {product.name}
              </span>

              <div className="flex items-end justify-between w-full mt-3">
                <div>
                  <span className="text-lg font-semibold tabular-nums block">
                    {product.price.toFixed(2)} €
                  </span>
                  {isLow && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <AlertTriangle className="w-3 h-3" /> {stockInfo.availableUnits}
                    </span>
                  )}
                </div>
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-[#EFECE6] text-[#141210]' : 'bg-[#141210] text-[#FAF8F5]'
                  }`}
                >
                  {isOut ? <Ban className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
