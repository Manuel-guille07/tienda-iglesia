import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Trash2, Plus, Minus, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/finance';
import { QL_SPRING_SNAPPY } from '../../lib/motion';
import { cn } from '../../lib/cn';

export const CartPanel: React.FC<{ onOpenPayment: () => void; isBottomSheet?: boolean }> = ({
  onOpenPayment,
  isBottomSheet = false,
}) => {
  const { t } = useLanguage();
  const { cart, updateQuantity, removeFromCart, clearCart, updateItemNote } = usePOSStore();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div
      className={cn(
        'flex flex-col h-full transition-colors text-[var(--ql-text-primary)]',
        !isBottomSheet &&
          'rounded-3xl p-5 sm:p-6 border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow)]'
      )}
    >
      {/* Cabecera del Carrito */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--ql-hairline)]">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-5 h-5 shrink-0 text-[var(--ql-text-secondary)]" />
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">{t('pos.cart.title')}</h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full ql-num bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)]">
            {totalCount}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="min-h-[36px] px-3 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 text-[var(--ql-text-secondary)] hover:text-[var(--ql-tone-terracotta)] hover:bg-[var(--ql-tone-terracotta-soft)] transition-colors cursor-pointer ql-focus-ring"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('pos.cart.clear')}</span>
          </button>
        )}
      </div>

      {/* Lista de Artículos con reordenamiento y entrada/salida animada */}
      <div
        className={cn(
          'flex-1 overflow-y-auto py-3.5 space-y-2.5',
          isBottomSheet ? 'max-h-[52vh]' : 'max-h-[380px] lg:max-h-[460px]'
        )}
      >
        {cart.length === 0 ? (
          <div className="py-14 text-center flex flex-col items-center text-[var(--ql-text-muted)]">
            <ShoppingBag className="w-9 h-9 mb-3 opacity-35" />
            <p className="text-sm font-medium">{t('pos.cart.empty')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div
                key={item.product.id}
                layout="position"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
                transition={QL_SPRING_SNAPPY}
                className="will-change-transform rounded-2xl p-3.5 border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)]"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-medium leading-snug truncate text-[var(--ql-text-primary)]">
                      {item.product.name}
                    </h4>
                    <span className="text-xs ql-num text-[var(--ql-text-secondary)]">
                      {formatCurrency(item.product.price)} / ud.
                    </span>
                  </div>

                  {/* Controles táctiles cómodos (- / + de 44px) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Disminuir cantidad"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-11 h-11 rounded-full border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] hover:border-[var(--ql-text-primary)] flex items-center justify-center transition-colors cursor-pointer active:scale-95 ql-focus-ring"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-base font-semibold ql-num w-7 text-center text-[var(--ql-text-primary)]">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      aria-label="Aumentar cantidad"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-11 h-11 rounded-full border border-transparent bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] hover:bg-[var(--ql-accent-hover)] flex items-center justify-center transition-colors cursor-pointer active:scale-95 ql-focus-ring"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-sm sm:text-base font-semibold ql-num min-w-[64px] text-right text-[var(--ql-text-primary)]">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>

                {/* Fila de Nota y Eliminar */}
                <div className="mt-2.5 pt-2 border-t border-[var(--ql-hairline)] flex items-center justify-between text-xs">
                  {editingNoteId === item.product.id ? (
                    <input
                      type="text"
                      defaultValue={item.notes || ''}
                      placeholder="Nota (ej. sin azúcar, leche avena)..."
                      autoFocus
                      onBlur={(e) => {
                        updateItemNote(item.product.id, e.target.value);
                        setEditingNoteId(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingNoteId(null)}
                      className="w-full rounded-xl px-3 py-1.5 text-sm border border-[var(--ql-text-primary)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] focus:outline-none"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(item.product.id)}
                        className="py-1 flex items-center gap-1.5 font-medium text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px]">
                          {item.notes ? `Nota: ${item.notes}` : '+ Añadir nota'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label="Eliminar producto"
                        className="p-1.5 rounded-full text-[var(--ql-text-muted)] hover:text-[var(--ql-tone-terracotta)] hover:bg-[var(--ql-tone-terracotta-soft)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pie de Total y Botón de Cobro */}
      <div className="pt-3.5 border-t border-[var(--ql-hairline)] mt-auto space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-[var(--ql-text-secondary)]">
            {t('pos.cart.total')}
          </span>
          <span className="text-2xl font-semibold ql-num tracking-tight text-[var(--ql-text-primary)]">
            {formatCurrency(total)}
          </span>
        </div>
        <Button
          variant="primary"
          size="xl"
          className="w-full font-semibold ql-num"
          disabled={cart.length === 0}
          onClick={onOpenPayment}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          {t('pos.cart.checkout')} · {formatCurrency(total)}
        </Button>
      </div>
    </div>
  );
};
