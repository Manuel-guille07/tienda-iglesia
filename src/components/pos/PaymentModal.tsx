import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PaymentMethod, Sale } from '../../types';
import { ChangeCalculator } from './ChangeCalculator';
import toast from 'react-hot-toast';
import { CheckCircle, Share2, Banknote, CreditCard, BookOpen, Heart, Coffee } from 'lucide-react';

export const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuthStore();
  const { cart, processSale, products } = usePOSStore();
  const { customers, chargeSaleToTab, generateReceiptText, getWhatsAppShareUrl } = useTabStore();

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [tendered, setTendered] = useState<number>(total);
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [donationSubMethod, setDonationSubMethod] = useState<'efectivo' | 'datafono'>('efectivo');
  const [notes, setNotes] = useState<string>('');
  const [sale, setSale] = useState<Sale | null>(null);
  const [donatedChange, setDonatedChange] = useState<number | null>(null);

  const customer = customers.find((c) => c.id === customerId);

  const handleConvertChangeToDonation = () => {
    if (!currentUser) return;
    const change = Math.max(0, Number((tendered - total).toFixed(2)));
    if (change <= 0) return;

    // 1. Registra la venta por su valor real
    const res = processSale({
      paymentMethod: 'efectivo',
      amountTendered: total,
      changeGiven: 0,
      customerTabId: undefined,
      customerName: undefined,
      sellerName: currentUser.name,
      sellerRole: currentUser.role,
      notes: notes.trim() || undefined,
    });

    if (res.success && res.sale) {
      // 2. Añade la diferencia (el cambio) como un ingreso por Donativo en la caja
      const donativoProduct = products.find((p) => p.category === 'donativos');

      const donationSale: Sale = {
        id: `sale-${Date.now()}-donativo`,
        timestamp: new Date().toISOString(),
        items: [
          {
            product: donativoProduct
              ? { ...donativoProduct, price: change }
              : {
                  id: 'prod-donativo-cambio',
                  name: 'Donativo (Cambio de compra)',
                  price: change,
                  category: 'donativos',
                  description: 'Cambio voluntario convertido en donativo para la obra',
                },
            quantity: 1,
          },
        ],
        total: change,
        paymentMethod: 'donativo',
        donationSubMethod: 'efectivo',
        amountTendered: change,
        changeGiven: 0,
        sellerName: currentUser.name,
        sellerRole: currentUser.role,
        notes: notes.trim()
          ? `Donativo por cambio de compra: ${notes.trim()}`
          : `Donativo por cambio de compra (Venta #${res.sale.id.slice(-6)})`,
      };

      usePOSStore.setState((state) => ({
        sales: [donationSale, ...state.sales],
      }));

      setDonatedChange(change);
      setSale(res.sale);
      toast.success(t('payment.success'));
    } else {
      toast.error(res.error || 'Error al procesar venta');
    }
  };

  const handleConfirm = () => {
    if (!currentUser) return;

    // Validación estricta POS
    if (!cart || cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    const hasInvalidQty = cart.some((item) => item.quantity <= 0);
    if (hasInvalidQty) {
      toast.error('La cantidad de los productos debe ser mayor a 0');
      return;
    }

    if (!method) {
      toast.error('Debe seleccionar un método de pago');
      return;
    }

    if (method === 'fiado' && !customerId) {
      toast.error('Debe seleccionar un cliente para la cuenta fiada');
      return;
    }

    const change = Math.max(0, Number((tendered - total).toFixed(2)));

    const res = processSale({
      paymentMethod: method,
      amountTendered: method === 'efectivo' ? tendered : total,
      changeGiven: method === 'efectivo' ? change : 0,
      customerTabId: method === 'fiado' ? customerId : undefined,
      customerName: method === 'fiado' ? customer?.name : undefined,
      sellerName: currentUser.name,
      sellerRole: currentUser.role,
      notes: notes.trim() || undefined,
    });

    if (res.success && res.sale) {
      if (method === 'fiado' && customerId) {
        chargeSaleToTab(customerId, res.sale);
      }
      setSale(res.sale);
      toast.success(t('payment.success'));
    } else {
      toast.error(res.error || 'Error al procesar venta');
    }
  };

  const handleClose = () => {
    setSale(null);
    setDonatedChange(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={sale ? '¡Cobro Exitoso!' : t('payment.title')}>
      {sale ? (
        <div className="text-center py-2 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Venta #{sale.id.slice(-6)}</h3>
          <p className="text-3xl font-black text-emerald-400">{sale.total.toFixed(2)}€</p>
          {sale.paymentMethod === 'efectivo' && sale.changeGiven ? (
            <p className="text-xs text-slate-300">Cambio: <strong className="text-emerald-400">{sale.changeGiven.toFixed(2)}€</strong></p>
          ) : null}
          {donatedChange !== null && (
            <p className="text-xs text-pink-300 flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              Donativo registrado: <strong className="text-pink-300">{donatedChange.toFixed(2)}€</strong>
            </p>
          )}
          <div className="flex gap-2 pt-2">
            {customer && (
              <a
                href={getWhatsAppShareUrl(customer.phone, generateReceiptText(customer, sale))}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" /> Recibo WhatsApp
              </a>
            )}
            <Button variant="primary" className="flex-1" onClick={handleClose}>Listo</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center">
            <span className="text-xs text-slate-300">{t('payment.amountToPay')}</span>
            <span className="text-2xl font-black text-emerald-400">{total.toFixed(2)}€</span>
          </div>

          {/* Métodos de Cobro Habituales */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Métodos de Cobro Habituales
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('efectivo')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'efectivo'
                    ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span className="text-xs">Efectivo 💶</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('datafono')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'datafono'
                    ? 'bg-sky-600/30 border-sky-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span className="text-xs">Datáfono 💳</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('fiado')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'fiado'
                    ? 'bg-amber-600/30 border-amber-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="text-xs">Fiado / Saldo 📜</span>
              </button>
            </div>
          </div>

          {/* Registros Especiales Separados: Donativo vs Cortesía / Consumo Interno */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Registros Especiales (Separados)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('donativo')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  method === 'donativo'
                    ? 'bg-pink-600/30 border-pink-500 text-white ring-1 ring-pink-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Heart className={`w-5 h-5 shrink-0 mt-0.5 ${method === 'donativo' ? 'text-pink-400' : 'text-pink-500/70'}`} />
                <div>
                  <div className="text-xs font-bold text-pink-300">🕊️ Registrar Donativo</div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Ofrenda voluntaria a fondos de la iglesia.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('consumo_interno')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  method === 'consumo_interno'
                    ? 'bg-purple-600/30 border-purple-500 text-white ring-1 ring-purple-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Coffee className={`w-5 h-5 shrink-0 mt-0.5 ${method === 'consumo_interno' ? 'text-purple-400' : 'text-purple-500/70'}`} />
                <div>
                  <div className="text-xs font-bold text-purple-300">☕ Cortesía / Consumo</div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Equipo o mermas (sin cobro monetario).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {method === 'efectivo' && (
            <div className="space-y-2">
              <ChangeCalculator total={total} tendered={tendered} onTenderedChange={setTendered} />
              {tendered > total && (
                <Button
                  type="button"
                  title="Convertir cambio en Donativo"
                  variant="outline"
                  className="w-full border-pink-500/60 bg-pink-950/20 hover:bg-pink-900/30 text-pink-300 hover:text-pink-200 font-bold transition flex items-center justify-center gap-2"
                  onClick={handleConvertChangeToDonation}
                >
                  <Heart className="w-4 h-4 text-pink-400 shrink-0" aria-hidden="true" />
                  Convertir cambio en Donativo
                </Button>
              )}
            </div>
          )}

          {method === 'datafono' && (
            <div className="p-3 bg-sky-950/20 border border-sky-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300">Cobro con Datáfono / Tarjeta:</span>
              <strong className="text-sky-300 font-bold text-sm">{total.toFixed(2)}€</strong>
            </div>
          )}

          {method === 'fiado' && (
            <div className="p-2.5 bg-slate-800/40 border border-slate-700 rounded-xl space-y-1.5">
              <label className="text-xs text-slate-300">Hermano / Cliente de Fiados</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.churchGroup}) - Saldo: {c.balance.toFixed(2)}€</option>
                ))}
              </select>
            </div>
          )}

          {method === 'donativo' && (
            <div className="p-3 bg-pink-950/20 border border-pink-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                <Heart className="w-4 h-4 text-pink-400" />
                Ofrenda / Donación a la Obra
              </div>
              <p className="text-[11px] text-slate-300">
                Se registrará un ingreso de <strong className="text-pink-300">{total.toFixed(2)}€</strong> como donativo pro-fondos.
              </p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota opcional (ej. Ofrenda pro-templo, donativo libre)..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              />
            </div>
          )}

          {method === 'consumo_interno' && (
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                <Coffee className="w-4 h-4 text-purple-400" />
                Cortesía / Consumo Interno Autorizado
              </div>
              <p className="text-[11px] text-slate-300">
                No se requiere dinero en caja. Los insumos se descuentan del stock para consumo del equipo de turno o merma autorizada.
              </p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo / Autorizado por (ej. Equipo de alabanza, limpieza)..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              />
            </div>
          )}

          <Button variant="success" size="lg" className="w-full font-bold shadow-lg" onClick={handleConfirm}>
            {method === 'consumo_interno'
              ? 'Registrar Cortesía / Consumo'
              : method === 'donativo'
              ? 'Confirmar Registro de Donativo'
              : t('payment.confirm')}
          </Button>
        </div>
      )}
    </Modal>
  );
};
