import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PaymentMethod, Sale } from '../../types';
import { ChangeCalculator } from './ChangeCalculator';
import { formatCurrency, toCents, fromCents, roundMoney } from '../../utils/finance';
import { QL_EASE_OUT, QL_SPRING_SNAPPY, QL_SPRING_TACTILE } from '../../lib/motion';
import { cn } from '../../lib/cn';
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

const METHOD_TONE_VAR: Record<PaymentMethod, string> = {
  efectivo: 'var(--ql-tone-sage)',
  datafono: 'var(--ql-tone-slate)',
  fiado: 'var(--ql-tone-amber)',
  donativo: 'var(--ql-tone-plum)',
  consumo_interno: 'var(--ql-text-primary)',
};

const METHOD_SOFT_VAR: Record<PaymentMethod, string> = {
  efectivo: 'var(--ql-tone-sage-soft)',
  datafono: 'var(--ql-tone-slate-soft)',
  fiado: 'var(--ql-tone-amber-soft)',
  donativo: 'var(--ql-tone-plum-soft)',
  consumo_interno: 'var(--ql-bg-muted)',
};

export const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

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
      const res = await addCustomer(trimmedName, '', 'Congregación', '', '');
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

  const getMethodButtonStyle = (id: PaymentMethod, active: boolean): React.CSSProperties => {
    const toneVar = METHOD_TONE_VAR[id];
    const softVar = METHOD_SOFT_VAR[id];
    if (id === 'consumo_interno') {
      return active
        ? {
            backgroundColor: 'var(--ql-accent-bg)',
            color: 'var(--ql-accent-text)',
            borderColor: 'var(--ql-accent-bg)',
          }
        : {};
    }
    if (active) {
      return {
        backgroundColor: softVar,
        borderColor: `color-mix(in srgb, ${toneVar} 55%, var(--ql-hairline-strong))`,
        color: 'var(--ql-text-primary)',
      };
    }
    return {
      borderColor: `color-mix(in srgb, ${toneVar} 18%, var(--ql-hairline))`,
    };
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
      toast.error(`El importe a cobrar debe ser mayor a ${formatCurrency(0)}`);
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
          `Efectivo insuficiente: faltan ${formatCurrency(
            fromCents(toCents(total) - toCents(tendered))
          )} para cubrir el total`
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
      <AnimatePresence mode="wait" initial={false}>
        {sale ? (
          <motion.div
            key="payment-success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={QL_SPRING_SNAPPY}
            className="text-center py-4 space-y-4"
          >
            <motion.div
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={QL_SPRING_SNAPPY}
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-[var(--ql-tone-sage-soft)] text-[var(--ql-tone-sage)] border border-[var(--ql-hairline)]"
            >
              <CheckCircle className="w-7 h-7" />
            </motion.div>
            <h3 className="text-base font-semibold text-[var(--ql-text-secondary)] ql-num">
              Venta #{sale.id.slice(-6)}
            </h3>
            <p className="text-4xl font-semibold ql-num tracking-tight text-[var(--ql-text-primary)]">
              {formatCurrency(sale.total)}
            </p>
            {sale.paymentMethod === 'efectivo' && sale.changeGiven ? (
              <p className="text-sm sm:text-base text-[var(--ql-text-secondary)] ql-num">
                Cambio a entregar:{' '}
                <strong className="font-semibold text-[var(--ql-text-primary)]">
                  {formatCurrency(sale.changeGiven)}
                </strong>
              </p>
            ) : null}
            {donatedChange !== null && (
              <p className="text-sm flex items-center justify-center gap-1.5 font-medium text-[var(--ql-tone-plum)] ql-num">
                <Heart className="w-4 h-4" />
                Donativo registrado: <strong>{formatCurrency(donatedChange)}</strong>
              </p>
            )}
            <div className="flex gap-3 pt-3">
              <a
                href={
                  sale.paymentMethod === 'fiado' && customer
                    ? getWhatsAppShareUrl(customer.phone || '', generateReceiptText(customer, sale))
                    : getWhatsAppShareUrl('', generateReceiptText(null, sale))
                }
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-h-[50px] px-4 rounded-full bg-[var(--ql-tone-sage)] hover:opacity-92 text-[#FAF8F5] font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-opacity"
              >
                <Share2 className="w-4 h-4" /> Recibo WhatsApp
              </a>
              <Button variant="primary" size="lg" className="flex-1" onClick={handleClose}>
                Listo
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="payment-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={QL_EASE_OUT}
            className="space-y-4"
          >
            {/* Importe Total Destacado */}
            <div className="p-4 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] flex justify-between items-center">
              <span className="text-sm font-medium text-[var(--ql-text-secondary)]">
                {t('payment.amountToPay')}
              </span>
              <span className="text-2xl sm:text-3xl font-semibold ql-num tracking-tight text-[var(--ql-text-primary)]">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Métodos de Cobro Habituales (superficie neutra + micro-acento mineral) */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ql-text-muted)] block mb-2">
                Método de Cobro
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'efectivo' as PaymentMethod, label: 'Efectivo', icon: Banknote },
                  { id: 'datafono' as PaymentMethod, label: 'Datáfono', icon: CreditCard },
                  { id: 'fiado' as PaymentMethod, label: 'Fiado', icon: BookOpen },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      whileTap={{ scale: 0.96 }}
                      transition={QL_SPRING_TACTILE}
                      onClick={() => setMethod(m.id)}
                      style={getMethodButtonStyle(m.id, active)}
                      className={cn(
                        'min-h-[66px] p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 ql-focus-ring',
                        active
                          ? 'font-semibold [box-shadow:var(--ql-shadow-sm)]'
                          : 'bg-[var(--ql-bg-elevated)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
                      )}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: METHOD_TONE_VAR[m.id] }}
                      />
                      <span className="text-xs sm:text-sm">{m.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Registros Especiales */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'donativo' as PaymentMethod, label: 'Donativo', icon: Heart },
                { id: 'consumo_interno' as PaymentMethod, label: 'Cortesía / Interno', icon: Coffee },
              ].map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    whileTap={{ scale: 0.97 }}
                    transition={QL_SPRING_TACTILE}
                    onClick={() => setMethod(m.id)}
                    style={getMethodButtonStyle(m.id, active)}
                    className={cn(
                      'min-h-[46px] px-3.5 py-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 ql-focus-ring',
                      active
                        ? 'font-semibold [box-shadow:var(--ql-shadow-sm)]'
                        : 'bg-[var(--ql-bg-elevated)] border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
                    )}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={
                        m.id === 'donativo' ? { color: METHOD_TONE_VAR[m.id] } : undefined
                      }
                    />
                    <span>{m.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {method === 'efectivo' && (
                <motion.div
                  key="method-efectivo"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={QL_EASE_OUT}
                  className="space-y-2.5"
                >
                  <ChangeCalculator total={total} tendered={tendered} onTenderedChange={setTendered} />
                  {toCents(tendered) > toCents(total) && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      isLoading={busy}
                      className="w-full ql-num"
                      onClick={handleConvertChangeToDonation}
                      icon={<Heart className="w-4 h-4 text-[var(--ql-tone-plum)]" />}
                    >
                      Convertir cambio ({formatCurrency(fromCents(toCents(tendered) - toCents(total)))}) en Donativo
                    </Button>
                  )}
                </motion.div>
              )}

              {method === 'datafono' && (
                <motion.div
                  key="method-datafono"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={QL_EASE_OUT}
                  className="p-4 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-tone-slate-soft)] flex items-center justify-between text-sm text-[var(--ql-text-primary)]"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <CreditCard className="w-4 h-4 shrink-0 text-[var(--ql-tone-slate)]" />
                    Cobro con Datáfono / Tarjeta
                  </span>
                  <strong className="text-base font-semibold ql-num">{formatCurrency(total)}</strong>
                </motion.div>
              )}

              {method === 'fiado' && (
                <motion.div
                  key="method-fiado"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={QL_EASE_OUT}
                  className="p-4 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-tone-amber-soft)] space-y-2.5 text-[var(--ql-text-primary)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-semibold block">Seleccionar Hermano / Cliente</label>
                    {!isCreatingCustomer && (
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        disabled={busy || isSavingCustomer}
                        icon={<UserPlus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setIsCreatingCustomer(true);
                          setNewCustomerName('');
                        }}
                      >
                        Nuevo Hermano
                      </Button>
                    )}
                  </div>

                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={busy || isSavingCustomer}
                    className="w-full min-h-[46px] rounded-xl px-3 text-sm sm:text-base font-medium border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)]"
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
                            {c.name} ({c.churchGroup}) · Saldo: {formatCurrency(custCredit)}
                            {c.debt > 0 ? ` · Deuda: ${formatCurrency(c.debt)}` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>

                  {isCreatingCustomer && (
                    <div className="p-3 rounded-xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">Nuevo Hermano / Cliente</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCustomer(false);
                            setNewCustomerName('');
                          }}
                          aria-label="Cancelar creación de hermano"
                          className="p-1 rounded-lg text-[var(--ql-text-muted)] hover:text-[var(--ql-text-primary)] transition-colors cursor-pointer"
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
                          className="flex-1 min-h-[42px] rounded-xl px-3.5 text-sm font-medium border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)]"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isSavingCustomer || !newCustomerName.trim()}
                          isLoading={isSavingCustomer}
                          onClick={handleSaveNewCustomer}
                          className="shrink-0"
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  )}

                  {customer && availableCredit > 0 && (
                    <div className="p-3 rounded-xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-xs space-y-1 ql-num">
                      <div className="flex justify-between text-[var(--ql-text-secondary)]">
                        <span>Cubierto con saldo a favor ({formatCurrency(availableCredit)} disp.)</span>
                        <strong className="text-[var(--ql-tone-sage)]">
                          -{formatCurrency(prepaidUsedForSale)}
                        </strong>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-[var(--ql-hairline)]">
                        <span>Nueva deuda generada en caja</span>
                        <strong>{formatCurrency(netTabDebtForSale ?? 0)}</strong>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {(method === 'donativo' || method === 'consumo_interno') && (
                <motion.div
                  key={`method-${method}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={QL_EASE_OUT}
                  className={cn(
                    'p-4 rounded-2xl border border-[var(--ql-hairline)] space-y-2',
                    method === 'donativo'
                      ? 'bg-[var(--ql-tone-plum-soft)]'
                      : 'bg-[var(--ql-bg-elevated)]'
                  )}
                >
                  <label className="text-xs sm:text-sm font-semibold block text-[var(--ql-text-primary)]">
                    {method === 'donativo' ? 'Nota de Donativo (Opcional)' : 'Motivo / Autorizado por'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escribir nota..."
                    className="w-full min-h-[46px] rounded-xl px-3.5 text-sm sm:text-base border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="primary"
              size="xl"
              disabled={busy}
              isLoading={busy}
              className="w-full ql-num"
              onClick={handleConfirm}
            >
              {method === 'consumo_interno'
                ? 'Registrar Cortesía / Consumo'
                : method === 'donativo'
                ? 'Confirmar Donativo'
                : `${t('payment.confirm')} · ${formatCurrency(total)}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
