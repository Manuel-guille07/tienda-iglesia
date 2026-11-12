import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { QuickColor } from '../../types';
import { Plus, AlertTriangle, Ban, Zap } from 'lucide-react';

function getQuickButtonStyles(color: QuickColor | undefined, isDark: boolean, qtyInCart: number) {
  const key = color || 'default';

  const palette: Record<
    QuickColor,
    {
      light: string;
      dark: string;
      plusLight: string;
      plusDark: string;
    }
  > = {
    default: {
      light: 'bg-[#EFECE6] text-[#141210] border-[#E2DDD5] hover:border-[#CFC8BC]',
      dark: 'bg-[#211D1A] text-[#F4F0EA] border-[#2A2420] hover:border-[#3D352F]',
      plusLight: 'bg-[#141210] text-[#FAF8F5]',
      plusDark: 'bg-[#EFECE6] text-[#141210]',
    },
    sage: {
      light:
        'bg-emerald-500/15 text-emerald-950 border-emerald-600/25 hover:border-emerald-600/45',
      dark: 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30 hover:border-emerald-400/50',
      plusLight: 'bg-emerald-900 text-emerald-50',
      plusDark: 'bg-emerald-200 text-emerald-950',
    },
    slate: {
      light: 'bg-sky-500/15 text-sky-950 border-sky-600/25 hover:border-sky-600/45',
      dark: 'bg-sky-500/20 text-sky-100 border-sky-500/30 hover:border-sky-400/50',
      plusLight: 'bg-sky-900 text-sky-50',
      plusDark: 'bg-sky-200 text-sky-950',
    },
    terracotta: {
      light: 'bg-rose-500/15 text-rose-950 border-rose-600/25 hover:border-rose-600/45',
      dark: 'bg-rose-500/20 text-rose-100 border-rose-500/30 hover:border-rose-400/50',
      plusLight: 'bg-rose-900 text-rose-50',
      plusDark: 'bg-rose-200 text-rose-950',
    },
    amber: {
      light: 'bg-amber-500/15 text-amber-950 border-amber-600/25 hover:border-amber-600/45',
      dark: 'bg-amber-500/20 text-amber-100 border-amber-500/30 hover:border-amber-400/50',
      plusLight: 'bg-amber-900 text-amber-50',
      plusDark: 'bg-amber-200 text-amber-950',
    },
    mauve: {
      light:
        'bg-purple-500/15 text-purple-950 border-purple-600/25 hover:border-purple-600/45',
      dark: 'bg-purple-500/20 text-purple-100 border-purple-500/30 hover:border-purple-400/50',
      plusLight: 'bg-purple-900 text-purple-50',
      plusDark: 'bg-purple-200 text-purple-950',
    },
  };

  const selected = palette[key] || palette.default;
  const surface = isDark ? selected.dark : selected.light;
  const activeRing =
    qtyInCart > 0
      ? isDark
        ? 'ring-2 ring-[#EFECE6]'
        : 'ring-2 ring-[#141210]'
      : '';

  return {
    cardClass: `${surface} ${activeRing}`,
    plusClass: isDark ? selected.plusDark : selected.plusLight,
  };
}

export const QuickCafeteriaKeypad: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { products, rawMaterials, cart, addToCart } = usePOSStore();

  const sellableProducts = products.filter((p) => p.isSellable !== false);
  const explicitPresets = sellableProducts.filter((p) => p.isQuickAccess || p.isPreset);
  const presets = explicitPresets.length > 0 ? explicitPresets : sellableProducts.slice(0, 8);

  const getCartQuantity = (productId: string) => {
    const item = cart.find((c) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  if (presets.length === 0) {
    return (
      <div
        className={`rounded-3xl p-8 text-center border ${
          isDark
            ? 'bg-[#171412] border-[#2A2420] text-[#9A9086]'
            : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#6E665E]'
        }`}
      >
        <p className="text-base font-medium">No hay productos rápidos disponibles.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border transition-colors ${
        isDark
          ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#EFECE6] text-[#141210]'
                : 'bg-[#141210] text-[#FAF8F5]'
            }`}
          >
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight leading-none">
              Botones Rápidos
            </h2>
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
              Cobro directo con 1 toque para productos estrella
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          {presets.length} directos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {presets.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';
          const qtyInCart = getCartQuantity(product.id);
          const { cardClass, plusClass } = getQuickButtonStyles(
            (product.quickColor || product.quick_color) as QuickColor | undefined,
            isDark,
            qtyInCart
          );

          return (
            <button
              key={product.id}
              type="button"
              disabled={isOut}
              onClick={() => addToCart(product)}
              className={`group relative rounded-3xl p-4 text-left flex flex-col justify-between min-h-[132px] border transition-all duration-150 select-none ${
                isOut
                  ? isDark
                    ? 'bg-[#171412]/50 border-[#2A2420] opacity-45 cursor-not-allowed'
                    : 'bg-[#FAF8F5]/60 border-[#E2DDD5] opacity-50 cursor-not-allowed'
                  : `${cardClass} active:scale-[0.98] cursor-pointer`
              }`}
            >
              {/* Fila superior: Nombre del producto + Insignia de cantidad en carrito */}
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-base sm:text-lg font-medium leading-snug line-clamp-2 pr-1">
                  {product.name}
                </span>

                {qtyInCart > 0 && (
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                      isDark
                        ? 'bg-[#EFECE6] text-[#141210]'
                        : 'bg-[#141210] text-[#FAF8F5]'
                    }`}
                  >
                    x{qtyInCart}
                  </span>
                )}
              </div>

              {/* Fila inferior: Precio grande + Estado de stock + Botón + */}
              <div className="flex items-end justify-between gap-2 w-full mt-3 pt-2">
                <div>
                  <span className="text-xl font-semibold tracking-tight tabular-nums block">
                    {product.price.toFixed(2)} €
                  </span>

                  {isOut ? (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-rose-500">
                      <Ban className="w-3.5 h-3.5" />
                      Agotado
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Quedan {stockInfo.availableUnits}
                    </span>
                  ) : null}
                </div>

                <span
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isOut
                      ? isDark
                        ? 'bg-[#171412] text-[#9A9086]'
                        : 'bg-[#FAF8F5] text-[#6E665E]'
                      : plusClass
                  }`}
                >
                  {isOut ? <Ban className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
