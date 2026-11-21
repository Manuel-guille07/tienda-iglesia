import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ProductCatalog } from './ProductCatalog';
import { QuickCafeteriaKeypad } from './QuickCafeteriaKeypad';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { usePOSStore } from '../../store/usePOSStore';
import { formatCurrency } from '../../utils/finance';
import { QL_EASE_OUT, QL_SPRING_SNAPPY } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { ArrowRight, X, Zap, LayoutGrid } from 'lucide-react';

type PosViewMode = 'quick' | 'catalog';

export const POSScreen: React.FC = () => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PosViewMode>('quick');
  const [pulseTick, setPulseTick] = useState(0);
  const { cart, loadRawMaterials } = usePOSStore();

  useEffect(() => {
    loadRawMaterials();
  }, [loadRawMaterials]);

  useEffect(() => {
    if (!isMobileCartOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileCartOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileCartOpen]);

  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const prevCountRef = useRef(totalCount);
  useEffect(() => {
    if (totalCount > prevCountRef.current) {
      setPulseTick((n) => n + 1);
    }
    prevCountRef.current = totalCount;
  }, [totalCount]);

  return (
    <div
      className={cn(
        'p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden',
        cart.length > 0 && 'pb-24 lg:pb-6'
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Área Principal del Mostrador POS (8 cols en lg) */}
        <div className="lg:col-span-8 space-y-3.5 min-w-0">
          <SegmentedControl<PosViewMode>
            layoutId="ql-pos-view-mode"
            variant="surface"
            size="sm"
            fullWidth
            ariaLabel="Modo de vista del mostrador"
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                value: 'quick',
                label: 'Botones Rápidos',
                icon: <Zap className="w-3.5 h-3.5" />,
              },
              {
                value: 'catalog',
                label: 'Catálogo Completo',
                icon: <LayoutGrid className="w-3.5 h-3.5" />,
              },
            ]}
          />

          {/* Transición fluida entre Botones Rápidos y Catálogo Completo (180 ms) */}
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === 'quick' ? (
              <motion.div
                key="pos-view-quick"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={QL_EASE_OUT}
                className="space-y-4"
              >
                <QuickCafeteriaKeypad />
                <ProductCatalog />
              </motion.div>
            ) : (
              <motion.div
                key="pos-view-catalog"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={QL_EASE_OUT}
              >
                <ProductCatalog />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel del Carrito Fijo en Columna Derecha (Tablets horizontales y PC >= 1024px) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-[116px]">
          <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
        </div>
      </div>

      {/* Cápsula Flotante de Cobro en < 1024px: siempre encima del Floating Glass Dock */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            key="pos-floating-checkout"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={QL_SPRING_SNAPPY}
            className="will-change-transform lg:hidden fixed bottom-[calc(var(--ql-mobile-nav-h)+var(--ql-mobile-dock-gap)+var(--ql-safe-bottom)+10px)] md:bottom-5 left-3.5 right-3.5 z-[45] flex justify-center pointer-events-none"
          >
            <motion.button
              key={`checkout-pulse-${pulseTick}`}
              type="button"
              initial={pulseTick > 0 ? { scale: 1.035 } : false}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.975 }}
              transition={QL_SPRING_SNAPPY}
              onClick={() => setIsMobileCartOpen(true)}
              className="will-change-transform pointer-events-auto w-full max-w-md h-[52px] px-4 sm:px-5 rounded-full flex items-center justify-between gap-3 bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] [box-shadow:var(--ql-shadow-lg)] cursor-pointer select-none ql-focus-ring"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold ql-num shrink-0 bg-[var(--ql-accent-text)]/15 text-[var(--ql-accent-text)]">
                  {totalCount} {totalCount === 1 ? 'art.' : 'arts.'}
                </span>
                <span className="text-sm font-medium truncate">
                  Ver pedido
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm sm:text-base font-semibold ql-num shrink-0">
                <span>Cobrar · {formatCurrency(totalAmount)}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet del Carrito en < 1024px (z-50: encima del Floating Glass Dock z-40) */}
      <AnimatePresence>
        {isMobileCartOpen && (
          <motion.div
            key="pos-cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={QL_EASE_OUT}
            className="lg:hidden fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setIsMobileCartOpen(false)}
          >
            <motion.div
              key="pos-cart-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Resumen del pedido"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={QL_SPRING_SNAPPY}
              className="will-change-transform w-full max-w-lg rounded-t-3xl p-5 sm:p-6 pb-safe max-h-[88vh] flex flex-col border-t border-x border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-lg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--ql-text-muted)]/30 mx-auto mb-3" />
              <div className="flex justify-end -mt-2 mb-1">
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  aria-label="Cerrar carrito"
                  className="w-9 h-9 rounded-full bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] flex items-center justify-center transition-colors cursor-pointer ql-focus-ring"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <CartPanel
                  isBottomSheet
                  onOpenPayment={() => {
                    setIsMobileCartOpen(false);
                    setIsPaymentOpen(true);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cobro */}
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
    </div>
  );
};
