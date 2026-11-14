import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PaymentMethod, Sale } from '../../types';
import { ChangeCalculator } from './ChangeCalculator';
import { toCents, fromCents, roundMoney } from '../../utils/finance';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Share2,
  Banknote,
  CreditCard,
  BookOpen,
  Heart,
  Coffee,
  UserPlus,
  X,
} from 'lucide-react';

export const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { currentUser } = useAuthStore();
  const { cart, processSale, processDonationSale, isProcessingSale } = usePOSStore();
  const {
    customers,
    addCustomer,
    isMutatingTab,
    chargeSaleToTab,
    generateReceiptText,
    getWhatsAppShareUrl,
  } = useTabStore();

  const total = fromCents(
    cart.reduce((acc, item) => acc + toCents(item.product.price) * item.quantity, 0)
  );

  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [tendered, setTendered] = useState<number>(total);
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [isSavingCustomer, setIsSavingCustomer] = useState<boolean>(false);
  const [donationSubMethod] = useState<'efectivo' | 'datafono'>('efectivo');
  const [notes, setNotes] = useState<string>('');
  const [sale, setSale] = useState<Sale | null>(null);
  const [donatedChange, setDonatedChange] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setTendered(total);
      setIsSubmitting(false);
      setIsCreatingCustomer(false);
      setNewCustomerName('');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, total]);

  React.useEffect(() => {
    if (isOpen && !customerId && customers[0]?.id) {
      setCustomerId(customers[0].id);
    }
  }, [isOpen, customers, customerId]);

  const handleSaveNewCustomer = async () => {
    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      toast.error('Introduce el nombre del hermano/a');
      return;
    }
    if (isSavingCustomer || isMutatingTab) return;

    setIsSavingCustomer(true);
    try {
      const res = await addCustomer(trimmedName, '', 'Congregación');
      if (res.success && res.customer) {
        setCustomerId(res.customer.id);
        setNewCustomerName('');
        setIsCreatingCustomer(false);
        toast.success(`Hermano/a "${res.customer.name}" añadido y seleccionado`);
      } else {
        toast.error(res.error || 'No se pudo registrar al nuevo hermano/a');
      }
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const busy = isSubmitting || isProcessingSale;
  const customer = customers.find((c) => c.id === customerId);

  const availableCredit = customer
    ? roundMoney(
        Math.max(0, Number(customer.balance || 0)) +
          (Number(customer.debt || 0) < 0 ? Math.abs(Number(customer.debt || 0)) : 0)
      )
    : 0;
  const prepaidUsedForSale =
    method === 'fiado' && customer ? roundMoney(Math.min(availableCredit, total)) : 0;
  const netTabDebtForSale =
    method === 'fiado' ? roundMoney(Math.max(0, total - prepaidUsedForSale)) : undefined;

  // Estilos de Color Semántico Sutil Quiet Luxury por Método de Pago (10%-15% opacidad, alto contraste)
  const getMethodSemanticClasses = (id: PaymentMethod, active: boolean) => {
    switch (id) {
      case 'efectivo':
        // Verde Salvia / Esmeralda
        return active
          ? isDark
            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100 ring-1 ring-emerald-400 font-semibold'
            : 'bg-emerald-500/20 border-emerald-800 text-emerald-950 ring-1 ring-emerald-800 font-semibold'
          : isDark
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200 hover:bg-emerald-500/20'
          : 'bg-emerald-500/10 border-emerald-600/25 text-emerald-900 hover:bg-emerald-500/15';

      case 'datafono':
        // Azul Pizarra / Índigo
        return active
          ? isDark
            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-100 ring-1 ring-indigo-400 font-semibold'
            : 'bg-indigo-500/20 border-indigo-800 text-indigo-950 ring-1 ring-indigo-800 font-semibold'
          : isDark
          ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-200 hover:bg-indigo-500/20'
          : 'bg-indigo-500/10 border-indigo-600/25 text-indigo-900 hover:bg-indigo-500/15';

      case 'fiado':
        // Ámbar / Naranja quemado
        return active
          ? isDark
            ? 'bg-amber-500/25 border-amber-400 text-amber-100 ring-1 ring-amber-400 font-semibold'
            : 'bg-amber-500/20 border-amber-800 text-amber-950 ring-1 ring-amber-800 font-semibold'
          : isDark
          ? 'bg-amber-500/10 border-amber-500/25 text-amber-200 hover:bg-amber-500/20'
          : 'bg-amber-500/10 border-amber-600/25 text-amber-900 hover:bg-amber-500/15';

      case 'donativo':
        // Malva / Púrpura
        return active
          ? isDark
            ? 'bg-purple-500/25 border-purple-400 text-purple-100 ring-1 ring-purple-400 font-semibold'
            : 'bg-purple-500/20 border-purple-800 text-purple-950 ring-1 ring-purple-800 font-semibold'
          : isDark
          ? 'bg-purple-500/10 border-purple-500/25 text-purple-200 hover:bg-purple-500/20'
          : 'bg-purple-500/10 border-purple-600/25 text-purple-900 hover:bg-purple-500/15';

      default:
        // Neutral Quiet Luxury (Piedra / Espresso)
        return active
          ? isDark
            ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
            : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
          : isDark
          ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
          : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:border-[#CFC8BC]';
    }
  };

  const handleConvertChangeToDonation = async () => {
    if (!currentUser || busy) return;
    if (!Number.isFinite(tendered) || isNaN(tendered) || toCents(tendered) <= toCents(total)) {
      toast.error('El importe entregado debe ser mayor al total para donar el cambio');
      return;
    }

    const change = fromCents(Math.max(0, toCents(tendered) - toCents(total)));
    if (change <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await processSale({
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
        const donationRes = await processDonationSale({
          amount: change,
          sellerName: currentUser.name,
          sellerRole: currentUser.role,
          notes: notes.trim() || undefined,
          donationSubMethod: 'efectivo',
          relatedSaleId: res.sale.id,
        });

        setSale(res.sale);
        if (donationRes.success) {
          setDonatedChange(change);
          toast.success(t('payment.success'));
        } else {
          toast.error(
            donationRes.error || 'Venta cobrada, pero hubo un error al guardar el donativo del cambio'
          );
        }
      } else {
        toast.error(res.error || 'Error al procesar venta');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!currentUser || busy) return;

    if (!cart || cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!Number.isFinite(total) || isNaN(total) || total < 0) {
      toast.error('Importe total inválido en el carrito');
      return;
    }

    if (method !== 'consumo_interno' && total <= 0) {
      toast.error('El importe a cobrar debe ser mayor a 0.00€');
      return;
    }

    const hasInvalidQty = cart.some(
      (item) =>
        !Number.isFinite(item.quantity) ||
        isNaN(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.product.price) ||
        item.product.price < 0
    );
    if (hasInvalidQty) {
      toast.error('La cantidad y precio de los productos deben ser válidos y mayores a 0');
      return;
    }

    if (!method) {
      toast.error('Debe seleccionar un método de pago');
      return;
    }

    if (method === 'efectivo') {
      if (!Number.isFinite(tendered) || isNaN(tendered) || tendered < 0) {
        toast.error('Introduce un monto de efectivo válido');
        return;
      }
      if (toCents(tendered) < toCents(total)) {
        toast.error(
          `Efectivo insuficiente: faltan ${fromCents(toCents(total) - toCents(tendered)).toFixed(2)}€ para cubrir el total`
        );
        return;
      }
    }

    if (method === 'fiado' && !customerId) {
      toast.error('Debe seleccionar un cliente para la cuenta fiada');
      return;
    }

    setIsSubmitting(true);
    try {
      const change = fromCents(Math.max(0, toCents(tendered) - toCents(total)));

      const res = await processSale({
        paymentMethod: method,
        amountTendered: method === 'efectivo' ? tendered : total,
        changeGiven: method === 'efectivo' ? change : 0,
        customerTabId: method === 'fiado' ? customerId : undefined,
        customerName: method === 'fiado' ? customer?.name : undefined,
        sellerName: currentUser.name,
        sellerRole: currentUser.role,
        notes: notes.trim() || undefined,
        donationSubMethod: method === 'donativo' ? donationSubMethod : undefined,
        prepaidUsed: method === 'fiado' ? prepaidUsedForSale : undefined,
        netTabDebt: method === 'fiado' ? netTabDebtForSale : undefined,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (busy || isSavingCustomer) return;
    setSale(null);
    setDonatedChange(null);
    setNotes('');
    setIsSubmitting(false);
    setIsCreatingCustomer(false);
    setNewCustomerName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={sale ? '¡Cobro Completado!' : t('payment.title')}>
      {sale ? (
        <div className="text-center py-4 space-y-4">
          <div
            className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
              isDark ? 'bg-[#EFECE6] text-[#141210]' : 'bg-[#141210] text-[#FAF8F5]'
            }`}
          >
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">Venta #{sale.id.slice(-6)}</h3>
          <p className="text-4xl font-bold tabular-nums">{sale.total.toFixed(2)} €</p>
          {sale.paymentMethod === 'efectivo' && sale.changeGiven ? (
            <p className={`text-base ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
              Cambio a entregar: <strong className="font-bold">{sale.changeGiven.toFixed(2)} €</strong>
            </p>
          ) : null}
          {donatedChange !== null && (
            <p className="text-sm flex items-center justify-center gap-1.5 font-medium">
              <Heart className="w-4 h-4" />
              Donativo registrado: <strong>{donatedChange.toFixed(2)} €</strong>
            </p>
          )}
          <div className="flex gap-3 pt-3">
            {customer && (
              <a
                href={getWhatsAppShareUrl(customer.phone, generateReceiptText(customer, sale))}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-h-[52px] px-4 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" /> Recibo WhatsApp
              </a>
            )}
            <Button variant="primary" size="lg" className="flex-1" onClick={handleClose}>
              Listo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Importe Total Destacado (Neutral Quiet Luxury: Piedra / Espresso) */}
          <div
            className={`p-4 rounded-3xl border flex justify-between items-center ${
              isDark ? 'bg-[#211D1A] border-[#2A2420]' : 'bg-[#EFECE6] border-[#E2DDD5]'
            }`}
          >
            <span className={`text-sm font-medium ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
              {t('payment.amountToPay')}
            </span>
            <span className="text-3xl font-bold tabular-nums">{total.toFixed(2)} €</span>
          </div>

          {/* Métodos de Cobro Habituales con Color Semántico Sutil */}
          <div>
            <label
              className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
              Método de Cobro
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'efectivo' as PaymentMethod, label: 'Efectivo', icon: Banknote },
                { id: 'datafono' as PaymentMethod, label: 'Datáfono', icon: CreditCard },
                { id: 'fiado' as PaymentMethod, label: 'Fiado', icon: BookOpen },
              ].map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setMethod(m.id)}
                    className={`min-h-[68px] p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer select-none disabled:opacity-50 ${getMethodSemanticClasses(
                      m.id,
                      active
                    )}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registros Especiales (Donativo Malva / Cortesía Neutral) */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'donativo' as PaymentMethod, label: 'Donativo', icon: Heart },
              { id: 'consumo_interno' as PaymentMethod, label: 'Cortesía / Interno', icon: Coffee },
            ].map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setMethod(m.id)}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border flex items-center justify-center gap-2 text-sm transition cursor-pointer select-none disabled:opacity-50 ${getMethodSemanticClasses(
                    m.id,
                    active
                  )}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {method === 'efectivo' && (
            <div className="space-y-2.5">
              <ChangeCalculator total={total} tendered={tendered} onTenderedChange={setTendered} />
              {toCents(tendered) > toCents(total) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  isLoading={busy}
                  className="w-full"
                  onClick={handleConvertChangeToDonation}
                  icon={<Heart className="w-4 h-4" />}
                >
                  Convertir cambio ({fromCents(toCents(tendered) - toCents(total)).toFixed(2)} €) en Donativo
                </Button>
              )}
            </div>
          )}

          {method === 'datafono' && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${
                isDark
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-100'
                  : 'bg-indigo-500/12 border-indigo-600/25 text-indigo-950'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <CreditCard className="w-4 h-4 shrink-0" />
                Cobro con Datáfono / Tarjeta:
              </span>
              <strong className="text-base font-bold tabular-nums">{total.toFixed(2)} €</strong>
            </div>
          )}

          {method === 'fiado' && (
            <div
              className={`p-4 rounded-2xl border space-y-2.5 ${
                isDark
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-100'
                  : 'bg-amber-500/12 border-amber-600/25 text-amber-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold block">Seleccionar Hermano / Cliente</label>
                {!isCreatingCustomer && (
                  <button
                    type="button"
                    disabled={busy || isSavingCustomer}
                    onClick={() => {
                      setIsCreatingCustomer(true);
                      setNewCustomerName('');
                    }}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer select-none ${
                      isDark
                        ? 'bg-[#171412]/90 border-amber-400/40 text-amber-100 hover:bg-[#211D1A]'
                        : 'bg-[#FAF8F5] border-amber-800/30 text-amber-950 hover:bg-[#EFECE6]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>+ Nuevo Hermano</span>
                  </button>
                )}
              </div>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={busy || isSavingCustomer}
                className={`w-full min-h-[48px] rounded-xl px-3 text-base font-medium border ${
                  isDark
                    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                }`}
              >
                {customers.length === 0 ? (
                  <option value="">Sin hermanos registrados — crea uno nuevo</option>
                ) : (
                  customers.map((c) => {
                    const custCredit =
                      Math.max(0, Number(c.balance || 0)) +
                      (Number(c.debt || 0) < 0 ? Math.abs(Number(c.debt || 0)) : 0);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.churchGroup}) · Saldo: {custCredit.toFixed(2)} €
                        {c.debt > 0 ? ` · Deuda: ${c.debt.toFixed(2)} €` : ''}
                      </option>
                    );
                  })
                )}
              </select>

              {isCreatingCustomer && (
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDark
                      ? 'bg-[#171412]/90 border-[#2A2420] text-[#F4F0EA]'
                      : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">Nuevo Hermano / Cliente</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCustomer(false);
                        setNewCustomerName('');
                      }}
                      aria-label="Cancelar creación de hermano"
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-[#9A9086] hover:text-[#F4F0EA]' : 'text-[#6E665E] hover:text-[#141210]'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveNewCustomer();
                        }
                      }}
                      placeholder="Nombre y apellido..."
                      autoFocus
                      disabled={isSavingCustomer}
                      className={`flex-1 min-h-[44px] rounded-xl px-3.5 text-sm font-medium border focus:outline-none ${
                        isDark
                          ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
                          : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
                      }`}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isSavingCustomer || !newCustomerName.trim()}
                      isLoading={isSavingCustomer}
                      onClick={handleSaveNewCustomer}
                      className="min-h-[44px] px-4 shrink-0"
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {customer && availableCredit > 0 && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 tabular-nums ${
                    isDark
                      ? 'bg-[#171412]/80 border-amber-500/30 text-amber-100'
                      : 'bg-[#FAF8F5] border-amber-600/25 text-amber-950'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Cubierto con saldo a favor ({availableCredit.toFixed(2)} € disp.):</span>
                    <strong className="font-mono">-{prepaidUsedForSale.toFixed(2)} €</strong>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-amber-500/20">
                    <span>Nueva deuda generada en caja:</span>
                    <strong className="font-mono">{(netTabDebtForSale ?? 0).toFixed(2)} €</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {(method === 'donativo' || method === 'consumo_interno') && (
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                method === 'donativo'
                  ? isDark
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-100'
                    : 'bg-purple-500/12 border-purple-600/25 text-purple-950'
                  : isDark
                  ? 'bg-[#211D1A] border-[#2A2420]'
                  : 'bg-[#EFECE6] border-[#E2DDD5]'
              }`}
            >
              <label className="text-sm font-semibold block">
                {method === 'donativo' ? 'Nota de Donativo (Opcional)' : 'Motivo / Autorizado por'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribir nota..."
                className={`w-full min-h-[48px] rounded-xl px-3.5 text-base border ${
                  isDark
                    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                }`}
              />
            </div>
          )}

          <Button
            variant="primary"
            size="xl"
            disabled={busy}
            isLoading={busy}
            className="w-full"
            onClick={handleConfirm}
          >
            {method === 'consumo_interno'
              ? 'Registrar Cortesía / Consumo'
              : method === 'donativo'
              ? 'Confirmar Donativo'
              : `${t('payment.confirm')} · ${total.toFixed(2)} €`}
          </Button>
        </div>
      )}
    </Modal>
  );
};
