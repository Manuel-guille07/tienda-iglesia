import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { Product, QuickColor } from '../../types';
import { SurfaceCard } from '../ui/SurfaceCard';
import { formatCurrencyParts } from '../../utils/finance';
import { QL_SPRING_TACTILE } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { AlertTriangle, Ban } from 'lucide-react';

type MineralTone = 'sage' | 'slate' | 'amber' | 'plum' | 'terracotta' | 'neutral';

const TONE_DOT_COLOR: Record<MineralTone, string> = {
  sage: 'var(--ql-tone-sage)',
  slate: 'var(--ql-tone-slate)',
  amber: 'var(--ql-tone-amber)',
  plum: 'var(--ql-tone-plum)',
  terracotta: 'var(--ql-tone-terracotta)',
  neutral: 'var(--ql-text-muted)',
};

function resolveProductTone(product: Product): MineralTone {
  const rawColor = String(product.quickColor || product.quick_color || '')
    .trim()
    .toLowerCase() as QuickColor;

  if (rawColor === 'sage') return 'sage';
  if (rawColor === 'slate') return 'slate';
  if (rawColor === 'amber') return 'amber';
  if (rawColor === 'mauve' || rawColor === 'plum') return 'plum';
  if (rawColor === 'terracotta') return 'terracotta';

  const cat = String(product.category || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (cat === 'cafes') return 'amber';
  if (cat === 'bebidas') return 'slate';
  if (cat === 'cafeteria') return 'sage';
  if (cat === 'snacks') return 'plum';
  if (cat === 'donativos') return 'terracotta';
  if (cat === 'merchandising') return 'slate';

  // Mapeo discreto para colores hex personalizados previos sin pintar bloques chillones
  if (rawColor.startsWith('#')) {
    if (rawColor.includes('0596') || rawColor.includes('10b9') || rawColor.includes('16a3')) return 'sage';
    if (rawColor.includes('0284') || rawColor.includes('2563') || rawColor.includes('0ea5')) return 'slate';
    if (rawColor.includes('d977') || rawColor.includes('f59e') || rawColor.includes('ea58')) return 'amber';
    if (rawColor.includes('7c3a') || rawColor.includes('9333') || rawColor.includes('8b5c')) return 'plum';
    if (rawColor.includes('e11d') || rawColor.includes('dc26') || rawColor.includes('f43f')) return 'terracotta';
  }

  return 'neutral';
}

export const QuickCafeteriaKeypad: React.FC = () => {
  const { products, rawMaterials, cart, addToCart } = usePOSStore();
  const [tappedId, setTappedId] = useState<string | null>(null);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const sellableProducts = products.filter((p) => p.isSellable !== false);
  const explicitPresets = sellableProducts.filter((p) => p.isQuickAccess || p.isPreset);
  const presets = explicitPresets.length > 0 ? explicitPresets : sellableProducts.slice(0, 8);

  const getCartQuantity = (productId: string) => {
    const item = cart.find((c) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleQuickAdd = (product: Product) => {
    addToCart(product);
    setTappedId(product.id);
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = window.setTimeout(() => {
      setTappedId((prev) => (prev === product.id ? null : prev));
    }, 200);
  };

  if (presets.length === 0) {
    return (
      <SurfaceCard variant="default" padding="lg" radius="xl" className="text-center">
        <p className="text-sm font-medium text-[var(--ql-text-secondary)]">
          No hay productos rápidos disponibles.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard variant="elevated" padding="none" radius="xl" className="p-2.5 sm:p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
        {presets.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';
          const qtyInCart = getCartQuantity(product.id);
          const tone = resolveProductTone(product);
          const priceParts = formatCurrencyParts(product.price);
          const isFlashing = tappedId === product.id;

          return (
            <motion.button
              key={product.id}
              type="button"
              disabled={isOut}
              whileTap={isOut ? undefined : { scale: 0.97 }}
              transition={QL_SPRING_TACTILE}
              onClick={() => handleQuickAdd(product)}
              aria-label={`Añadir ${product.name}, ${priceParts.full}`}
              className={cn(
                'group relative rounded-[14px] sm:rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[104px] sm:min-h-[112px] border transition-colors duration-150 select-none ql-focus-ring',
                isOut
                  ? 'bg-[var(--ql-bg-card)]/60 border-[var(--ql-hairline)] text-[var(--ql-text-muted)] opacity-50 cursor-not-allowed'
                  : cn(
                      'bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)] cursor-pointer',
                      isFlashing
                        ? 'border-[var(--ql-text-primary)]/50'
                        : qtyInCart > 0
                        ? 'border-[var(--ql-hairline-strong)] ring-1 ring-[var(--ql-text-primary)]/20'
                        : 'border-[var(--ql-hairline)] hover:border-[var(--ql-hairline-strong)]'
                    )
              )}
            >
              {/* Fila superior: micro-indicador mineral + nombre (máx. 2 líneas) + badge vivo de cantidad */}
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="min-w-0 flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]"
                    style={{ backgroundColor: isOut ? 'var(--ql-text-muted)' : TONE_DOT_COLOR[tone] }}
                  />
                  <span className="text-[14px] sm:text-[15px] font-medium leading-snug tracking-tight line-clamp-2 text-[var(--ql-text-primary)]">
                    {product.name}
                  </span>
                </div>

                <AnimatePresence mode="popLayout">
                  {qtyInCart > 0 && (
                    <motion.span
                      key={qtyInCart}
                      initial={{ scale: 0.72, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.72, opacity: 0 }}
                      transition={QL_SPRING_TACTILE}
                      className="shrink-0 min-w-[24px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold ql-num bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] [box-shadow:var(--ql-shadow-sm)]"
                    >
                      ×{qtyInCart}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Fila inferior: precio editorial tabular-nums + aviso discreto de stock si aplica */}
              <div className="flex items-end justify-between gap-2 w-full mt-3 pt-1">
                <span
                  aria-hidden="true"
                  className="ql-num text-lg sm:text-[20px] font-semibold leading-none text-[var(--ql-text-primary)]"
                >
                  {priceParts.integer}
                  <span className="text-[0.76em] font-medium text-[var(--ql-text-secondary)]">
                    {priceParts.decimal}
                  </span>
                  <span className="text-[0.7em] font-medium text-[var(--ql-text-muted)] ml-0.5">
                    {priceParts.symbol}
                  </span>
                </span>

                {isOut ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ql-tone-terracotta)] shrink-0">
                    <Ban className="w-3 h-3" />
                    Agotado
                  </span>
                ) : isLow ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ql-tone-amber)] ql-num shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    {stockInfo.availableUnits}
                  </span>
                ) : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </SurfaceCard>
  );
};
