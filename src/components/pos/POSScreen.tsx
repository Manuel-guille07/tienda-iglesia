import React, { useState } from 'react';
import { QuickCafeteriaKeypad } from './QuickCafeteriaKeypad';
import { ProductCatalog } from './ProductCatalog';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { usePOSStore } from '../../store/usePOSStore';
import { ShoppingBag } from 'lucide-react';

export const POSScreen: React.FC = () => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const { cart } = usePOSStore();

  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Products Area (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          <QuickCafeteriaKeypad />
          <ProductCatalog />
        </div>

        {/* Desktop / Tablet Cart Area (4 cols on lg) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-18 left-4 right-4 z-30">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-400/40 cursor-pointer animate-bounce-subtle"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-black/20 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <span>{totalCount} {totalCount === 1 ? 'producto' : 'productos'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold">{totalAmount.toFixed(2)}€</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">Ver Carrito</span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Modal/Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">Carrito Actual</h3>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                onOpenPayment={() => {
                  setIsMobileCartOpen(false);
                  setIsPaymentOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
    </div>
  );
};
