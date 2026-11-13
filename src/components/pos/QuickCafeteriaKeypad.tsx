import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { QuickColor } from '../../types';
import { Plus, AlertTriangle, Ban, Zap } from 'lucide-react';

const LEGACY_TOKEN_TO_HEX: Record<string, string> = {
  sage: '#059669',
  slate: '#0284C7',
  terracotta: '#E11D48',
  amber: '#D97706',
  mauve: '#7C3AED',
};

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === 'default' || !trimmed) return null;
  if (LEGACY_TOKEN_TO_HEX[trimmed.toLowerCase()]) {
    return LEGACY_TOKEN_TO_HEX[trimmed.toLowerCase()];
  }
  if (!HEX_REGEX.test(trimmed)) return null;
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getGlassColorTokens(hex: string, isDark: boolean) {
  const lum = getRelativeLuminance(hex);
  // Texto principal con contraste garantizado en claro y oscuro
  const textColor = isDark
    ? lum < 0.14
      ? '#F4F0EA'
      : hex
    : lum > 0.48
    ? '#141210'
    : hex;

  // Contraste del icono '+' sobre el círculo sólido con el color HEX elegido
  const plusIconColor = lum > 0.48 ? '#141210' : '#FFFFFF';

  return {
    backgroundColor: hexToRgba(hex, 0.15),
    borderColor: hexToRgba(hex, 0.3),
    textColor,
    plusBgColor: hex,
    plusIconColor,
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
                isDark ? 'text-[#9A9086]' : 'text-[#4A433D]'
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
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
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
          const hexColor = normalizeHex(
            (product.quickColor || product.quick_color) as QuickColor | undefined
          );
          const glass = hexColor ? getGlassColorTokens(hexColor, isDark) : null;

          const defaultSurfaceClasses = isDark
            ? 'bg-[#211D1A] text-[#F4F0EA] border-[#2A2420] hover:border-[#3D352F] shadow-md shadow-black/40'
            : 'bg-[#EFECE6] text-[#141210] border-[#E2DDD5] hover:border-[#CFC8BC] shadow-sm';

          const activeRingClass =
            qtyInCart > 0
              ? isDark
                ? 'ring-2 ring-[#EFECE6]'
                : 'ring-2 ring-[#141210]'
              : '';

          return (
            <button
              key={product.id}
              type="button"
              disabled={isOut}
              onClick={() => addToCart(product)}
              style={
                !isOut && glass
                  ? {
                      backgroundColor: glass.backgroundColor,
                      borderColor: glass.borderColor,
                      color: glass.textColor,
                    }
                  : undefined
              }
              className={`group relative rounded-3xl p-4 text-left flex flex-col justify-between min-h-[132px] border transition-all duration-150 select-none ${
                isOut
                  ? isDark
                    ? 'bg-[#171412]/60 border-[#2A2420] text-[#9A9086] opacity-45 cursor-not-allowed'
                    : 'bg-[#FAF8F5]/60 border-[#E2DDD5] text-[#6E665E] opacity-50 cursor-not-allowed'
                  : glass
                  ? `backdrop-blur-md shadow-md active:scale-[0.98] cursor-pointer ${activeRingClass}`
                  : `${defaultSurfaceClasses} ${activeRingClass} active:scale-[0.98] cursor-pointer`
              }`}
            >
              {/* Fila superior: Nombre del producto + Insignia de cantidad en carrito */}
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 pr-1">
                  {product.name}
                </span>

                {qtyInCart > 0 && (
                  <span
                    style={
                      !isOut && glass
                        ? {
                            backgroundColor: glass.plusBgColor,
                            color: glass.plusIconColor,
                          }
                        : undefined
                    }
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                      !glass
                        ? isDark
                          ? 'bg-[#EFECE6] text-[#141210]'
                          : 'bg-[#141210] text-[#FAF8F5]'
                        : ''
                    }`}
                  >
                    x{qtyInCart}
                  </span>
                )}
              </div>

              {/* Fila inferior: Precio grande + Estado de stock + Botón + */}
              <div className="flex items-end justify-between gap-2 w-full mt-3 pt-2">
                <div>
                  <span className="text-xl font-bold tracking-tight tabular-nums block">
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
                  style={
                    !isOut && glass
                      ? {
                          backgroundColor: glass.plusBgColor,
                          color: glass.plusIconColor,
                        }
                      : undefined
                  }
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isOut
                      ? isDark
                        ? 'bg-[#171412] text-[#9A9086]'
                        : 'bg-[#FAF8F5] text-[#6E665E]'
                      : !glass
                      ? isDark
                        ? 'bg-[#EFECE6] text-[#141210]'
                        : 'bg-[#141210] text-[#FAF8F5]'
                      : 'shadow-sm'
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
