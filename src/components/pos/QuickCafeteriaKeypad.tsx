import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { Plus, AlertTriangle, Ban, Zap } from 'lucide-react';

export const QuickCafeteriaKeypad: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { products, rawMaterials, cart, addToCart } = usePOSStore();

  const sellableProducts = products.filter((p) => p.isSellable !== false);
  const explicitPresets = sellableProducts.filter((p) => p.isQuickAccess || p.isPreset);
  // Si hay productos marcados como rápidos los usamos; de lo contrario mostramos los primeros 8 productos estrella
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
                  : qtyInCart > 0
                  ? isDark
                    ? 'bg-[#211D1A] border-[#EFECE6] ring-1 ring-[#EFECE6] active:scale-[0.98] cursor-pointer'
                    : 'bg-[#EFECE6] border-[#141210] ring-1 ring-[#141210] active:scale-[0.98] cursor-pointer'
                  : isDark
                  ? 'bg-[#211D1A] border-[#2A2420] hover:border-[#3D352F] active:scale-[0.98] cursor-pointer'
                  : 'bg-[#EFECE6] border-[#E2DDD5] hover:border-[#CFC8BC] active:scale-[0.98] cursor-pointer'
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
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-amber-500">
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
                      : isDark
                      ? 'bg-[#EFECE6] text-[#141210]'
                      : 'bg-[#141210] text-[#FAF8F5]'
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
