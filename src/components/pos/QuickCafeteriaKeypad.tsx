import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { Category, Product, QuickColor } from '../../types';
import { SurfaceCard } from '../ui/SurfaceCard';
import { formatCurrencyParts } from '../../utils/finance';
import { QL_SPRING_TACTILE } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { AlertTriangle, Ban } from 'lucide-react';

type MineralTone = 'sage' | 'slate' | 'amber' | 'plum' | 'terracotta' | 'neutral';

const TONE_CSS_VAR: Record<MineralTone, string> = {
  sage: 'var(--ql-tone-sage)',
  slate: 'var(--ql-tone-slate)',
  amber: 'var(--ql-tone-amber)',
  plum: 'var(--ql-tone-plum)',
  terracotta: 'var(--ql-tone-terracotta)',
  neutral: 'var(--ql-text-muted)',
};

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function resolveCategoryTone(category?: Category | string): MineralTone {
  const cat = String(category || '')
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
  return 'neutral';
}

/**
 * Resuelve el color de acento (barra vertical 3 px + borde tintado sutil)
 * priorizando el color HEX extraído de la imagen 3D / elegido, y respaldando
 * en el tono mineral semántico de la categoría.
 */
export function resolveQuickAccentColor(
  quickColor?: QuickColor,
  category?: Category | string
): string {
  const raw = String(quickColor || '').trim();
  if (HEX_COLOR_REGEX.test(raw)) {
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
    }
    return raw.toUpperCase();
  }

  const lower = raw.toLowerCase();
  if (lower === 'sage') return TONE_CSS_VAR.sage;
  if (lower === 'slate') return TONE_CSS_VAR.slate;
  if (lower === 'amber') return TONE_CSS_VAR.amber;
  if (lower === 'mauve' || lower === 'plum') return TONE_CSS_VAR.plum;
  if (lower === 'terracotta') return TONE_CSS_VAR.terracotta;

  return TONE_CSS_VAR[resolveCategoryTone(category)];
}

export interface QuickButtonPreviewProps {
  name: string;
  price: number;
  category?: Category;
  quickColor?: QuickColor;
  imageUrl?: string;
}

/**
 * Vista previa en vivo idéntica al Botón Rápido real (usada por super_admin al editar/subir imagen 3D).
 */
export const QuickButtonCardPreview: React.FC<QuickButtonPreviewProps> = ({
  name,
  price,
  category,
  quickColor,
  imageUrl,
}) => {
  const accentColor = resolveQuickAccentColor(quickColor, category);
  const priceParts = formatCurrencyParts(Number.isFinite(price) ? price : 0);
  const cleanImg = (imageUrl || '').trim();
  const hasImage = cleanImg.length > 0;

  return (
    <div
      style={{
        borderColor: `color-mix(in srgb, ${accentColor} 22%, var(--ql-hairline))`,
      }}
      className="relative overflow-hidden rounded-[14px] sm:rounded-2xl pl-4 pr-3 py-3 text-left flex flex-col justify-between min-h-[94px] sm:min-h-[104px] border bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)] select-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1.5 top-2.5 bottom-2.5 w-[3px] rounded-full"
        style={{ backgroundColor: accentColor, opacity: 0.86 }}
      />

      {hasImage && (
        <img
          src={cleanImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-2 -bottom-2 w-[66px] h-[66px] sm:w-[74px] sm:h-[74px] object-contain opacity-95 drop-shadow-[0_6px_10px_rgba(20,18,16,0.2)]"
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-2 w-full">
        <span
          className={cn(
            'text-[13.5px] sm:text-[14.5px] font-medium leading-snug tracking-tight line-clamp-2 text-[var(--ql-text-primary)]',
            hasImage && 'pr-9'
          )}
        >
          {name.trim() || 'Nombre del producto'}
        </span>
      </div>

      <div
        className={cn(
          'relative z-10 flex items-end justify-between gap-2 w-full mt-2.5 pt-1',
          hasImage && 'pr-12'
        )}
      >
        <span className="ql-num text-[17px] sm:text-[19px] font-semibold leading-none text-[var(--ql-text-primary)]">
          {priceParts.integer}
          <span className="text-[0.76em] font-medium text-[var(--ql-text-secondary)]">
            {priceParts.decimal}
          </span>
          <span className="text-[0.7em] font-medium text-[var(--ql-text-muted)] ml-0.5">
            {priceParts.symbol}
          </span>
        </span>
      </div>
    </div>
  );
};

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
    }, 180);
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
    <SurfaceCard variant="elevated" padding="none" radius="xl" className="p-2 sm:p-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {presets.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';
          const qtyInCart = getCartQuantity(product.id);
          const accentColor = resolveQuickAccentColor(
            (product.quickColor || product.quick_color) as QuickColor | undefined,
            product.category
          );
          const priceParts = formatCurrencyParts(product.price);
          const isFlashing = tappedId === product.id;
          const imageUrl = (product.imageUrl || product.image_url || '').trim();
          const hasImage = imageUrl.length > 0;

          const tintedBorderStyle: React.CSSProperties | undefined =
            !isOut && !isFlashing
              ? {
                  borderColor:
                    qtyInCart > 0
                      ? `color-mix(in srgb, ${accentColor} 42%, var(--ql-hairline-strong))`
                      : `color-mix(in srgb, ${accentColor} 20%, var(--ql-hairline))`,
                }
              : undefined;

          return (
            <motion.button
              key={product.id}
              type="button"
              disabled={isOut}
              whileTap={isOut ? undefined : { scale: 0.97 }}
              transition={QL_SPRING_TACTILE}
              onClick={() => handleQuickAdd(product)}
              aria-label={`Añadir ${product.name}, ${priceParts.full}`}
              style={tintedBorderStyle}
              className={cn(
                'will-change-transform group relative overflow-hidden rounded-[14px] sm:rounded-2xl pl-4 pr-3 py-3 text-left flex flex-col justify-between min-h-[94px] sm:min-h-[104px] border transition-colors duration-150 select-none ql-focus-ring',
                isOut
                  ? 'bg-[var(--ql-bg-card)]/60 border-[var(--ql-hairline)] text-[var(--ql-text-muted)] opacity-50 cursor-not-allowed'
                  : cn(
                      'bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)] cursor-pointer',
                      isFlashing
                        ? 'border-[var(--ql-text-primary)]/55'
                        : qtyInCart > 0
                        ? 'border-[var(--ql-hairline-strong)] ring-1 ring-[var(--ql-text-primary)]/18'
                        : 'border-[var(--ql-hairline)] hover:border-[var(--ql-hairline-strong)]'
                    )
              )}
            >
              {/* Barra vertical izquierda de 3 px */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1.5 top-2.5 bottom-2.5 w-[3px] rounded-full transition-opacity duration-150"
                style={{
                  backgroundColor: isOut ? 'var(--ql-text-muted)' : accentColor,
                  opacity: isOut ? 0.35 : qtyInCart > 0 ? 0.95 : 0.82,
                }}
              />

              {/* Imagen 3D recortada (PNG/WebP transparente) anclada a esquina inferior derecha */}
              {hasImage && (
                <img
                  src={imageUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className={cn(
                    'pointer-events-none select-none absolute -right-2 -bottom-2 w-[66px] h-[66px] sm:w-[74px] sm:h-[74px] object-contain transition-transform duration-200 will-change-transform',
                    isOut
                      ? 'opacity-35 grayscale'
                      : 'opacity-95 drop-shadow-[0_6px_10px_rgba(20,18,16,0.2)] group-hover:scale-[1.04]'
                  )}
                />
              )}

              {/* Fila superior (z-10): nombre despejado + badge vivo de cantidad */}
              <div className="relative z-10 flex items-start justify-between gap-1.5 w-full">
                <span
                  className={cn(
                    'text-[13.5px] sm:text-[14.5px] font-medium leading-snug tracking-tight line-clamp-2 text-[var(--ql-text-primary)]',
                    hasImage && qtyInCart === 0 && 'pr-8'
                  )}
                >
                  {product.name}
                </span>

                <AnimatePresence mode="popLayout">
                  {qtyInCart > 0 && (
                    <motion.span
                      key={qtyInCart}
                      initial={{ scale: 0.72, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.72, opacity: 0 }}
                      transition={QL_SPRING_TACTILE}
                      className="will-change-transform shrink-0 min-w-[23px] h-[21px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold ql-num bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] [box-shadow:var(--ql-shadow-sm)]"
                    >
                      ×{qtyInCart}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Fila inferior (z-10): precio editorial despejado a la izquierda */}
              <div
                className={cn(
                  'relative z-10 flex items-end justify-between gap-2 w-full mt-2.5 pt-0.5',
                  hasImage && 'pr-12'
                )}
              >
                <span
                  aria-hidden="true"
                  className="ql-num text-[17px] sm:text-[19px] font-semibold leading-none text-[var(--ql-text-primary)]"
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
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--ql-tone-terracotta)] shrink-0">
                    <Ban className="w-3 h-3" />
                    Agotado
                  </span>
                ) : isLow ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--ql-tone-amber)] ql-num shrink-0">
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
