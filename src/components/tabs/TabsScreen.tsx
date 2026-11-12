import React, { useState } from 'react';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Search, Plus, MessageSquareShare, CreditCard, Banknote } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { CustomerTab } from '../../types';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';
import { NewCustomerModal } from './NewCustomerModal';
import toast from 'react-hot-toast';

export const TabsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { customers, addPrepaidBalance, payDebt } = useTabStore();

  const [search, setSearch] = useState('');
  const [cust, setCust] = useState<CustomerTab | null>(null);
  const [action, setAction] = useState<'balance' | 'pay' | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'datafono'>('efectivo');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.churchGroup && c.churchGroup.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAction = () => {
    if (isSubmitting) return;
    if (!cust) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
      toast.error('El monto abonado o cargado debe ser un número válido estrictamente mayor a 0');
      return;
    }

    const cleanAmount = Number(amount.toFixed(2));
    const currentDebt = Number((cust.debt || 0).toFixed(2));

    if (action === 'pay') {
      if (currentDebt <= 0) {
        toast.error('Este cliente no tiene deuda pendiente por saldar');
        return;
      }
      if (cleanAmount > currentDebt) {
        toast.error(`El abono (${cleanAmount.toFixed(2)}€) no puede superar la deuda actual del cliente (${currentDebt.toFixed(2)}€)`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (action === 'balance') {
        addPrepaidBalance(cust.id, cleanAmount, 'Recarga de saldo prepago', paymentMethod);
        const updated = useTabStore.getState().customers.find((c) => c.id === cust.id);
        if (updated) setCust(updated);
        toast.success(t('toast.balanceUpdated'));
        setAction(null);
      } else if (action === 'pay') {
        payDebt(cust.id, cleanAmount, 'Abono de deuda pendiente', paymentMethod);
        const updated = useTabStore.getState().customers.find((c) => c.id === cust.id);
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            {t('tabs.title')}
          </h2>
          <p className="text-xs text-slate-400">{t('tabs.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsNewOpen(true)}>
          {t('tabs.newCustomer')}
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('tabs.search')}
          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-white">{c.name}</h3>
                <span className="text-[11px] text-indigo-400">{c.churchGroup}</span>
                <p className="text-[10px] text-slate-500">{c.phone}</p>
              </div>
              <button
                onClick={() => { setCust(c); setIsReceiptOpen(true); }}
                className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              >
                <MessageSquareShare className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 block">Saldo Prepago:</span>
                <span className="text-base font-extrabold text-emerald-400">{c.balance.toFixed(2)}€</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Deuda Pendiente:</span>
                <span className="text-base font-extrabold text-rose-400">{c.debt.toFixed(2)}€</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setCust(c); setAction('balance'); setAmount(10); setPaymentMethod('efectivo'); }}
              >
                + Cargar
              </Button>
              {c.debt > 0 && (
                <Button
                  variant="success"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { setCust(c); setAction('pay'); setAmount(c.debt); setPaymentMethod('efectivo'); }}
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
        title={action === 'balance' ? `Cargar Saldo a ${cust?.name || ''}` : `Abonar Deuda de ${cust?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              {action === 'pay' ? 'Monto a Abonar (€)' : 'Monto a Cargar (€)'}
            </label>
            <input
              type="number"
              step="0.50"
              min="0.01"
              max={action === 'pay' && cust ? cust.debt : undefined}
              value={Number.isFinite(amount) ? amount || '' : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                const safeVal = Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0;
                setAmount(safeVal);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xl font-bold text-white focus:outline-none focus:border-indigo-500"
            />
            {action === 'pay' && cust && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-slate-400">
                  Deuda actual pendiente: <strong className="text-rose-400">{cust.debt.toFixed(2)}€</strong>
                </p>
                {amount > cust.debt && (
                  <span className="text-[11px] text-rose-400 font-semibold">
                    Excede la deuda máxima ({cust.debt.toFixed(2)}€)
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Método de Cobro Recibido:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer ${
                  paymentMethod === 'efectivo'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="w-4 h-4" /> Efectivo 💶
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('datafono')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer ${
                  paymentMethod === 'datafono'
                    ? 'bg-sky-600/30 border-sky-500 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Datáfono 💳
              </button>
            </div>
          </div>

          <Button
            variant="success"
            size="lg"
            disabled={isSubmitting || amount <= 0 || (action === 'pay' && !!cust && amount > cust.debt)}
            isLoading={isSubmitting}
            className="w-full font-bold shadow-lg"
            onClick={handleAction}
          >
            {action === 'pay' ? 'Confirmar Abono y Generar Recibo' : 'Confirmar Carga'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
