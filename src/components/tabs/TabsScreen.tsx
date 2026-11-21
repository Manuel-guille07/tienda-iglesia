import React, { useState } from 'react';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Search, Plus, MessageSquareShare, CreditCard, Banknote, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SurfaceCard } from '../ui/SurfaceCard';
import { CustomerTab } from '../../types';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';
import { NewCustomerModal } from './NewCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { formatCurrency, parseMoneyInput, roundMoney, toCents } from '../../utils/finance';
import { cn } from '../../lib/cn';
import toast from 'react-hot-toast';

export const TabsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { customers, addPrepaidBalance, payDebt } = useTabStore();

  const [search, setSearch] = useState('');
  const [cust, setCust] = useState<CustomerTab | null>(null);
  const [action, setAction] = useState<'balance' | 'pay' | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastAbonoAmount, setLastAbonoAmount] = useState<number | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [amountDraft, setAmountDraft] = useState<string>('10');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'datafono'>('efectivo');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.churchGroup && c.churchGroup.toLowerCase().includes(q)) ||
      (c.congregation && c.congregation.toLowerCase().includes(q)) ||
      (c.ministry && c.ministry.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const handleAction = async () => {
    if (isSubmitting) return;
    if (!cust) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    const cleanParsed = parseMoneyInput(amountDraft);
    const effectiveAmount = cleanParsed ?? amount;
    if (!Number.isFinite(effectiveAmount) || isNaN(effectiveAmount) || effectiveAmount <= 0) {
      toast.error('El monto abonado o cargado debe ser un número válido estrictamente mayor a 0');
      return;
    }

    const cleanAmount = roundMoney(effectiveAmount);
    const currentDebt = roundMoney(cust.debt || 0);

    if (action === 'pay') {
      if (toCents(currentDebt) <= 0) {
        toast.error('Este cliente no tiene deuda pendiente por saldar');
        return;
      }
      if (toCents(cleanAmount) > toCents(currentDebt)) {
        toast.error(
          `El abono (${formatCurrency(cleanAmount)}) no puede superar la deuda actual del cliente (${formatCurrency(currentDebt)})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (action === 'balance') {
        const res = await addPrepaidBalance(
          cust.id,
          cleanAmount,
          'Recarga de saldo prepago',
          paymentMethod
        );
        if (!res.success) {
          toast.error(res.error || 'No se pudo guardar la recarga en Supabase');
          return;
        }
        const updated = res.customer || useTabStore.getState().customers.find((c) => c.id === cust.id);
        if (updated) setCust(updated);
        toast.success(t('toast.balanceUpdated'));
        setAction(null);
      } else if (action === 'pay') {
        const res = await payDebt(
          cust.id,
          cleanAmount,
          'Abono de deuda pendiente',
          paymentMethod
        );
        if (!res.success) {
          toast.error(res.error || 'No se pudo registrar el abono en Supabase');
          return;
        }
        const updated = res.customer || useTabStore.getState().customers.find((c) => c.id === cust.id);
        if (updated) setCust(updated);
        setLastAbonoAmount(cleanAmount);
        toast.success('Abono registrado con éxito');
        setAction(null);
        setIsReceiptOpen(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Cabecera compacta */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 text-[var(--ql-text-primary)]">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[var(--ql-text-secondary)]" />
            <span className="truncate">{t('tabs.title')}</span>
          </h2>
          <p className="text-xs sm:text-sm mt-0.5 text-[var(--ql-text-secondary)]">
            {t('tabs.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewOpen(true)}
          className="shrink-0"
        >
          <span className="hidden sm:inline">{t('tabs.newCustomer')}</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Buscador Quiet Luxury */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ql-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('tabs.search')}
          className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-full text-sm sm:text-base font-medium border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] placeholder:text-[var(--ql-text-muted)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-sm)] focus:outline-none focus:border-[var(--ql-hairline-strong)] transition-colors"
        />
      </div>

      {/* Tarjetas de Clientes Quiet Luxury */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filtered.map((c) => {
          const groupLabel =
            [c.congregation, c.ministry].filter(Boolean).join(' · ') ||
            c.churchGroup ||
            'Congregación';
          const phoneLabel = c.phone && c.phone.trim() ? c.phone.trim() : 'Sin teléfono';

          return (
            <SurfaceCard key={c.id} padding="md" radius="xl" className="space-y-3.5">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold leading-snug break-words text-[var(--ql-text-primary)]">
                    {c.name}
                  </h3>
                  <span className="text-xs font-medium block mt-0.5 text-[var(--ql-text-secondary)]">
                    {groupLabel} · {phoneLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Editar Perfil"
                    title="Editar Perfil"
                    onClick={() => {
                      setCust(c);
                      setIsEditOpen(true);
                    }}
                    className="h-9 px-2.5 rounded-full border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] hover:border-[var(--ql-hairline-strong)] flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ql-focus-ring"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Enviar recibo por WhatsApp"
                    title="Enviar recibo por WhatsApp"
                    onClick={() => {
                      setCust(c);
                      setLastAbonoAmount(null);
                      setIsReceiptOpen(true);
                    }}
                    className="w-9 h-9 rounded-full border border-[var(--ql-hairline)] bg-[var(--ql-tone-sage-soft)] text-[var(--ql-tone-sage)] hover:border-[var(--ql-hairline-strong)] flex items-center justify-center transition-colors cursor-pointer shrink-0 ql-focus-ring"
                  >
                    <MessageSquareShare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)]">
                <div>
                  <span className="text-[11px] font-medium block text-[var(--ql-text-secondary)]">
                    Saldo Prepago
                  </span>
                  <span
                    className={cn(
                      'text-lg font-semibold ql-num block mt-0.5',
                      c.balance > 0
                        ? 'text-[var(--ql-tone-sage)]'
                        : 'text-[var(--ql-text-muted)]'
                    )}
                  >
                    {formatCurrency(c.balance)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium block text-[var(--ql-text-secondary)]">
                    Deuda Pendiente
                  </span>
                  <span
                    className={cn(
                      'text-lg font-semibold ql-num block mt-0.5',
                      c.debt > 0
                        ? 'text-[var(--ql-tone-terracotta)]'
                        : 'text-[var(--ql-text-muted)]'
                    )}
                  >
                    {formatCurrency(c.debt)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-0.5">
                <Button
                  variant="subtle"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setCust(c);
                    setAction('balance');
                    setAmount(10);
                    setAmountDraft('10');
                    setPaymentMethod('efectivo');
                  }}
                >
                  + Cargar Saldo
                </Button>
                {c.debt > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setCust(c);
                      setAction('pay');
                      setAmount(c.debt);
                      setAmountDraft(String(c.debt));
                      setPaymentMethod('efectivo');
                    }}
                  >
                    Abonar
                  </Button>
                )}
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      <WhatsAppReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setLastAbonoAmount(null);
        }}
        customer={cust}
        abonoAmount={lastAbonoAmount}
      />
      <NewCustomerModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
      <EditCustomerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customer={cust}
        onUpdated={(updated) => setCust(updated)}
      />

      <Modal
        isOpen={!!action}
        onClose={() => !isSubmitting && setAction(null)}
        title={action === 'balance' ? `Cargar Saldo · ${cust?.name || ''}` : `Abonar Deuda · ${cust?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium block mb-1.5 text-[var(--ql-text-secondary)]">
              {action === 'pay' ? 'Monto a Abonar (€)' : 'Monto a Cargar (€)'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountDraft}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setAmountDraft('');
                  setAmount(0);
                  return;
                }
                if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
                setAmountDraft(raw);
                const parsed = parseMoneyInput(raw);
                if (parsed !== null) {
                  setAmount(parsed);
                }
              }}
              onBlur={() => {
                const parsed = parseMoneyInput(amountDraft);
                const safeVal = parsed ?? 0;
                setAmountDraft(String(safeVal));
                setAmount(safeVal);
              }}
              className="w-full min-h-[52px] rounded-2xl px-4 py-3 text-2xl font-semibold ql-num border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)] transition-colors"
            />
            {action === 'pay' && cust && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 ql-num">
                <p className="text-xs text-[var(--ql-text-secondary)]">
                  Deuda actual pendiente:{' '}
                  <strong className="text-[var(--ql-tone-terracotta)]">
                    {formatCurrency(cust.debt)}
                  </strong>
                </p>
                {toCents(amount) > toCents(cust.debt) && (
                  <span className="text-xs text-[var(--ql-tone-terracotta)] font-semibold">
                    Excede la deuda máxima ({formatCurrency(cust.debt)})
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium block mb-2 text-[var(--ql-text-secondary)]">
              Método de Cobro Recibido
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
                { id: 'datafono' as const, label: 'Datáfono', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      'min-h-[46px] py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ql-focus-ring',
                      active
                        ? 'bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] border-transparent font-semibold [box-shadow:var(--ql-shadow-sm)]'
                        : 'bg-[var(--ql-bg-elevated)] border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
                    )}
                  >
                    <Icon className="w-4 h-4" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            variant="primary"
            size="xl"
            disabled={
              isSubmitting ||
              toCents(amount) <= 0 ||
              (action === 'pay' && !!cust && toCents(amount) > toCents(cust.debt))
            }
            isLoading={isSubmitting}
            className="w-full"
            onClick={handleAction}
          >
            {action === 'pay' ? 'Confirmar Abono y Generar Recibo' : 'Confirmar Carga'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
