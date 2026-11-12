import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Trash2, Plus, Minus, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const CartPanel: React.FC<{ onOpenPayment: () => void; isBottomSheet?: boolean }> = ({
  onOpenPayment,
  isBottomSheet = false,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { cart, updateQuantity, removeFromCart, clearCart, updateItemNote } = usePOSStore();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div
      className={`flex flex-col h-full transition-colors ${
        isBottomSheet
          ? ''
          : `rounded-3xl p-5 sm:p-6 border ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
            }`
      }`}
    >
      {/* Cabecera del Carrito */}
      <div
        className={`flex items-center justify-between pb-4 border-b ${
          isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-5 h-5 shrink-0" />
          <h2 className="text-lg font-semibold tracking-tight">{t('pos.cart.title')}</h2>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
              isDark ? 'bg-[#EFECE6] text-[#141210]' : 'bg-[#141210] text-[#FAF8F5]'
            }`}
          >
            {totalCount}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className={`min-h-[40px] px-3 rounded-full text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
              isDark
                ? 'text-[#9A9086] hover:text-rose-300 hover:bg-[#211D1A]'
                : 'text-[#6E665E] hover:text-rose-700 hover:bg-[#EFECE6]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('pos.cart.clear')}</span>
          </button>
        )}
      </div>

      {/* Lista de Artículos */}
      <div
        className={`flex-1 overflow-y-auto py-4 space-y-3 ${
          isBottomSheet ? 'max-h-[52vh]' : 'max-h-[380px] lg:max-h-[460px]'
        }`}
      >
        {cart.length === 0 ? (
          <div
            className={`py-14 text-center flex flex-col items-center ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            <ShoppingBag className="w-10 h-10 mb-3 opacity-35" />
            <p className="text-base font-medium">{t('pos.cart.empty')}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className={`rounded-2xl p-3.5 border transition ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                  : 'bg-[#EFECE6]/70 border-[#E2DDD5] text-[#141210]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-medium leading-snug truncate">
                    {item.product.name}
                  </h4>
                  <span
                    className={`text-sm tabular-nums ${
                      isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                    }`}
                  >
                    {item.product.price.toFixed(2)} € / ud.
                  </span>
                </div>

                {/* Controles táctiles grandes (- / + de 44px) para adultos de ~50 años */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Disminuir cantidad"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer active:scale-95 ${
                      isDark
                        ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] hover:border-[#EFECE6]'
                        : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] hover:border-[#141210]'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="text-base font-semibold tabular-nums w-7 text-center">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer active:scale-95 ${
                      isDark
                        ? 'bg-[#EFECE6] border-[#EFECE6] text-[#141210]'
                        : 'bg-[#141210] border-[#141210] text-[#FAF8F5]'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-base font-semibold tabular-nums min-w-[64px] text-right">
                  {(item.product.price * item.quantity).toFixed(2)} €
                </span>
              </div>

              {/* Fila de Nota y Eliminar */}
              <div
                className={`mt-2.5 pt-2 border-t flex items-center justify-between text-xs ${
                  isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
                }`}
              >
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
                    className={`w-full rounded-xl px-3 py-1.5 text-sm border focus:outline-none ${
                      isDark
                        ? 'bg-[#171412] border-[#EFECE6] text-[#F4F0EA]'
                        : 'bg-[#FAF8F5] border-[#141210] text-[#141210]'
                    }`}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(item.product.id)}
                      className={`py-1 flex items-center gap-1.5 font-medium cursor-pointer ${
                        isDark
                          ? 'text-[#9A9086] hover:text-[#F4F0EA]'
                          : 'text-[#6E665E] hover:text-[#141210]'
                      }`}
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
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        isDark
                          ? 'text-[#9A9086] hover:text-rose-400'
                          : 'text-[#6E665E] hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pie de Total y Botón de Cobro */}
      <div
        className={`pt-4 border-t mt-auto space-y-3 ${
          isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span
            className={`text-base font-medium ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            {t('pos.cart.total')}
          </span>
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {total.toFixed(2)} €
          </span>
        </div>
        <Button
          variant="primary"
          size="xl"
          className="w-full font-semibold"
          disabled={cart.length === 0}
          onClick={onOpenPayment}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          {t('pos.cart.checkout')} · {total.toFixed(2)} €
        </Button>
      </div>
    </div>
  );
};
