import React, { useState } from 'react';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Users, Search, Plus, MessageSquareShare, CreditCard, Banknote } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { CustomerTab } from '../../types';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';
import { NewCustomerModal } from './NewCustomerModal';
import { parseMoneyInput, roundMoney, toCents } from '../../utils/finance';
import toast from 'react-hot-toast';

export const TabsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { customers, addPrepaidBalance, payDebt } = useTabStore();

  const [search, setSearch] = useState('');
  const [cust, setCust] = useState<CustomerTab | null>(null);
  const [action, setAction] = useState<'balance' | 'pay' | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [amountDraft, setAmountDraft] = useState<string>('10');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'datafono'>('efectivo');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.churchGroup && c.churchGroup.toLowerCase().includes(search.toLowerCase()))
  );

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
          `El abono (${cleanAmount.toFixed(2)}€) no puede superar la deuda actual del cliente (${currentDebt.toFixed(2)}€)`
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
        toast.success('Abono registrado con éxito');
        setAction(null);
        setIsReceiptOpen(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6" />
            {t('tabs.title')}
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
            {t('tabs.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewOpen(true)}
        >
          {t('tabs.newCustomer')}
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search
          className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${
            isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
          }`}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('tabs.search')}
          className={`w-full min-h-[52px] pl-12 pr-4 py-3 rounded-full text-base font-medium border focus:outline-none ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] placeholder-[#9A9086] focus:border-[#EFECE6]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]'
          }`}
        />
      </div>

      {/* Tarjetas de Clientes Quiet Luxury */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`rounded-3xl p-5 space-y-4 border transition ${
              isDark
                ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="text-lg font-medium leading-snug">{c.name}</h3>
                <span className={`text-xs font-medium block mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
                  {c.churchGroup} · {c.phone}
                </span>
              </div>
              <button
                type="button"
                aria-label="Enviar recibo por WhatsApp"
                onClick={() => {
                  setCust(c);
                  setIsReceiptOpen(true);
                }}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-[#211D1A] border-[#2A2420] text-emerald-400 hover:border-emerald-500'
                    : 'bg-[#EFECE6] border-[#E2DDD5] text-emerald-800 hover:border-emerald-600'
                }`}
              >
                <MessageSquareShare className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`grid grid-cols-2 gap-3 p-3.5 rounded-2xl border ${
                isDark ? 'bg-[#211D1A] border-[#2A2420]' : 'bg-[#EFECE6] border-[#E2DDD5]'
              }`}
            >
              <div>
                <span className={`text-xs block ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
                  Saldo Prepago
                </span>
                <span className="text-lg font-semibold tabular-nums text-emerald-500">
                  {c.balance.toFixed(2)} €
                </span>
              </div>
              <div>
                <span className={`text-xs block ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
                  Deuda Pendiente
                </span>
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    c.debt > 0 ? 'text-rose-500' : isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                  }`}
                >
                  {c.debt.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <Button
                variant="outline"
                size="md"
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
                  size="md"
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
          </div>
        ))}
      </div>

      <WhatsAppReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} customer={cust} />
      <NewCustomerModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />

      <Modal
        isOpen={!!action}
        onClose={() => !isSubmitting && setAction(null)}
        title={action === 'balance' ? `Cargar Saldo · ${cust?.name || ''}` : `Abonar Deuda · ${cust?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label
              className={`text-sm font-medium block mb-1.5 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
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
              className={`w-full min-h-[52px] rounded-2xl p-3.5 text-2xl font-bold tabular-nums border focus:outline-none ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
              }`}
            />
            {action === 'pay' && cust && (
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
                  Deuda actual pendiente: <strong className="text-rose-500">{cust.debt.toFixed(2)} €</strong>
                </p>
                {toCents(amount) > toCents(cust.debt) && (
                  <span className="text-xs text-rose-500 font-semibold">
                    Excede la deuda máxima ({cust.debt.toFixed(2)} €)
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label
              className={`text-sm font-medium block mb-2 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
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
                    className={`min-h-[48px] py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-base font-medium transition cursor-pointer disabled:opacity-50 ${
                      active
                        ? isDark
                          ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                          : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                        : isDark
                        ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086]'
                        : 'bg-[#EFECE6] border-[#E2DDD5] text-[#6E665E]'
                    }`}
                  >
                    <Icon className="w-5 h-5" /> {m.label}
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
