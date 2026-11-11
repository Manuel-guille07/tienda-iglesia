import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Trash2, Plus, Minus, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const CartPanel: React.FC<{ onOpenPayment: () => void }> = ({ onOpenPayment }) => {
  const { t } = useLanguage();
  const { cart, updateQuantity, removeFromCart, clearCart, updateItemNote } = usePOSStore();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">{t('pos.cart.title')}</h2>
          <span className="text-xs bg-indigo-600/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
            {totalCount}
          </span>
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('pos.cart.clear')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[350px] lg:max-h-[460px]">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
            <p className="text-sm">{t('pos.cart.empty')}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{item.product.name}</h4>
                  <span className="text-xs text-slate-400">{item.product.price.toFixed(2)}€</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs font-bold text-white w-12 text-right">
                  {(item.product.price * item.quantity).toFixed(2)}€
                </span>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                {editingNoteId === item.product.id ? (
                  <input
                    type="text"
                    defaultValue={item.notes || ''}
                    placeholder="Nota (ej. sin azúcar)..."
                    autoFocus
                    onBlur={(e) => {
                      updateItemNote(item.product.id, e.target.value);
                      setEditingNoteId(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingNoteId(null)}
                    className="w-full bg-slate-900 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white"
                  />
                ) : (
                  <>
                    <button onClick={() => setEditingNoteId(item.product.id)} className="text-slate-400 hover:text-indigo-300 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{item.notes ? `Nota: ${item.notes}` : '+ Nota'}</span>
                    </button>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-slate-800 mt-auto space-y-2">
        <div className="flex items-center justify-between text-sm font-bold text-white">
          <span>{t('pos.cart.total')}</span>
          <span className="text-2xl text-emerald-400 font-extrabold">{total.toFixed(2)}€</span>
        </div>
        <Button
          variant="success"
          size="lg"
          className="w-full font-bold shadow-emerald-600/30"
          disabled={cart.length === 0}
          onClick={onOpenPayment}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          {t('pos.cart.checkout')}
        </Button>
      </div>
    </div>
  );
};
