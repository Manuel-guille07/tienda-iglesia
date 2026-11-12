import React, { useState } from 'react';
import { ProductCatalog } from './ProductCatalog';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { usePOSStore } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { ArrowRight, X } from 'lucide-react';

export const POSScreen: React.FC = () => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const { cart } = usePOSStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Área Principal del Mostrador POS Tipográfico (8 cols en lg) */}
        <div className="lg:col-span-8">
          <ProductCatalog />
        </div>

        {/* Panel del Carrito Fijo en Columna Derecha (Tablets horizontales y PC >= 1024px) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-24">
          <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
        </div>
      </div>

      {/* Cápsula Flotante Fija Inferior (Sticky Bottom Pill) en Móviles (< 1024px) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[76px] md:bottom-4 left-4 right-4 z-30 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className={`pointer-events-auto w-full max-w-lg h-14 px-6 rounded-full flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer select-none shadow-2xl ${
              isDark
                ? 'bg-[#EFECE6] text-[#141210] shadow-black/70'
                : 'bg-[#141210] text-[#FAF8F5] shadow-black/25'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-sm font-bold tabular-nums ${
                  isDark
                    ? 'bg-[#141210] text-[#EFECE6]'
                    : 'bg-[#FAF8F5] text-[#141210]'
                }`}
              >
                {totalCount} {totalCount === 1 ? 'art.' : 'arts.'}
              </span>
              <span className="text-base font-medium">Ver pedido</span>
            </div>

            <div className="flex items-center gap-2 text-base font-semibold tabular-nums">
              <span>Cobrar · {totalAmount.toFixed(2)} €</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Bottom Sheet / Cajón Deslizante del Carrito en Móviles (< 1024px) */}
      {isMobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-t-3xl p-5 sm:p-6 shadow-2xl max-h-[88vh] flex flex-col border-t transition-colors ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Indicador superior de arrastre y botón cerrar */}
            <div className="w-12 h-1.5 rounded-full bg-current/20 mx-auto mb-3" />
            <div className="flex justify-end -mt-2 mb-1">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                aria-label="Cerrar carrito"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isDark
                    ? 'text-[#9A9086] hover:text-[#F4F0EA] hover:bg-[#211D1A]'
                    : 'text-[#6E665E] hover:text-[#141210] hover:bg-[#EFECE6]'
                }`}
              >
                <X className="w-5 h-5" />
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
          </div>
        </div>
      )}

      {/* Modal de Cobro */}
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
    </div>
  );
};
