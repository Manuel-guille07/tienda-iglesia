import React, { useState, useMemo } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useLanguage } from '../../context/LanguageContext';
import { Sale, PaymentMethod, VoidAuditRecord } from '../../types';
import {
  History,
  Search,
  RotateCcw,
  AlertTriangle,
  Receipt,
  CreditCard,
  Banknote,
  BookOpen,
  Heart,
  Calendar,
  ShieldAlert,
  Trash2,
  FileText,
  Boxes,
  UserCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

export const SalesHistoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const { sales, voidSale } = usePOSStore();
  const { currentUser } = useAuthStore();
  const { voidAudits, addVoidAudit } = useCloseoutStore();

  const [activeTab, setActiveTab] = useState<'tickets' | 'audits'>('tickets');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de anulación
  const [selectedSaleToVoid, setSelectedSaleToVoid] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Fecha de hoy en formato YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtrado de ventas
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Filtro de fecha
      if (dateFilter === 'today') {
        const saleDate = sale.timestamp ? sale.timestamp.split('T')[0] : '';
        if (saleDate !== todayStr) return false;
      }

      // Filtro de método de pago
      if (methodFilter !== 'all' && sale.paymentMethod !== methodFilter) {
        return false;
      }

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const seller = (sale.sellerName || '').toLowerCase();
        const customer = (sale.customerName || '').toLowerCase();
        const id = (sale.id || '').toLowerCase();
        const method = (sale.paymentMethod || '').toLowerCase();
        if (!seller.includes(query) && !customer.includes(query) && !id.includes(query) && !method.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [sales, dateFilter, methodFilter, searchQuery, todayStr]);

  // Métricas del día (o del filtro seleccionado)
  const stats = useMemo(() => {
    const list = dateFilter === 'today'
      ? sales.filter((s) => s.timestamp && s.timestamp.split('T')[0] === todayStr)
      : sales;

    const total = list.reduce((acc, s) => acc + (s.total || 0), 0);
    const cash = list.filter((s) => s.paymentMethod === 'efectivo').reduce((acc, s) => acc + (s.total || 0), 0);
    const card = list.filter((s) => s.paymentMethod === 'datafono').reduce((acc, s) => acc + (s.total || 0), 0);
    const tabs = list.filter((s) => s.paymentMethod === 'fiado').reduce((acc, s) => acc + (s.total || 0), 0);
    const count = list.length;

    return { total, cash, card, tabs, count };
  }, [sales, dateFilter, todayStr]);

  const handleOpenVoidModal = (sale: Sale) => {
    setSelectedSaleToVoid(sale);
    setVoidReason('');
  };

  const handleConfirmVoid = async () => {
    if (!selectedSaleToVoid) return;

    const trimmedReason = voidReason.trim();
    if (!trimmedReason) {
      toast.error(t('history.voidReasonRequired'));
      return;
    }

    setIsVoiding(true);
    const toastId = toast.loading('Anulando venta y revirtiendo stock...');

    try {
      // 1. Extraer lista de productos devueltos
      const returnedItems = (selectedSaleToVoid.items || []).map((it) => ({
        name: it.product?.name || 'Producto',
        quantity: it.quantity,
      }));

      // 2. Ejecutar anulación en db y Zustand (devolviendo stock a raw_materials y eliminando de sales)
      const result = await voidSale(selectedSaleToVoid.id);
      toast.dismiss(toastId);

      if (result.success) {
        // 3. Generar registro de auditoría
        addVoidAudit({
          saleId: selectedSaleToVoid.id,
          voidedBy: currentUser?.name || 'Usuario',
          voidedByRole: currentUser?.role || 'Vendedor',
          timestamp: new Date().toISOString(),
          reason: trimmedReason,
          returnedItems,
          returnedAmount: selectedSaleToVoid.total,
          paymentMethod: selectedSaleToVoid.paymentMethod,
        });

        toast.success(t('history.voidSuccess'));
        setSelectedSaleToVoid(null);
        setVoidReason('');
      } else {
        toast.error(result.error || 'No se pudo anular la venta');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Error al procesar la anulación');
    } finally {
      setIsVoiding(false);
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'efectivo':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
            <Banknote className="w-3 h-3" />
            Efectivo
          </span>
        );
      case 'datafono':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
            <CreditCard className="w-3 h-3" />
            Datáfono
          </span>
        );
      case 'fiado':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            <BookOpen className="w-3 h-3" />
            Fiado
          </span>
        );
      case 'donativo':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
            <Heart className="w-3 h-3" />
            Donativo
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">
            {method}
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return iso;
    }
  };

  const quickReasons = [
    'Error de digitación / Cobro duplicado',
    'Cliente canceló el pedido',
    'Producto devuelto / Merma',
    'Cambio de método de pago',
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {t('history.title')}
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded">
                  ELARX Ledger
                </span>
              </h1>
              <p className="text-xs text-slate-400">{t('history.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* View Selection Tabs (Tickets vs Auditoría) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            {t('history.tab.tickets')}
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full">
              {filteredSales.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              activeTab === 'audits'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {t('history.tab.audits')}
            {voidAudits.length > 0 && (
              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-full">
                {voidAudits.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <>
          {/* KPI Stats Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('history.totalToday')}
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                {stats.total.toFixed(2)}€
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Total recaudado</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                {t('history.cashToday')}
              </span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {stats.cash.toFixed(2)}€
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Caja en efectivo</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                {t('history.cardToday')}
              </span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">
                {stats.card.toFixed(2)}€
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Terminales / TPV</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {t('history.tabsToday')}
              </span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {stats.tabs.toFixed(2)}€
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Cuentas pendientes</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 col-span-2 lg:col-span-1 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                {t('history.ordersCount')}
              </span>
              <div className="text-2xl font-bold text-indigo-300 mt-1">
                {stats.count}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Operaciones registradas</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('history.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Date filter & Payment Method Tabs */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    dateFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('history.filter.today')}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    dateFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('history.filter.all')}
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'efectivo', label: 'Efectivo' },
                  { id: 'datafono', label: 'Datáfono' },
                  { id: 'fiado', label: 'Fiados' },
                  { id: 'donativo', label: 'Donativos' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethodFilter(m.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                      methodFilter === m.id
                        ? 'bg-indigo-600/25 border border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket List */}
          {filteredSales.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-semibold text-white text-base">{t('history.empty')}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No se han registrado transacciones con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  {/* Ticket Details */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <Receipt className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          #{sale.id.slice(0, 8)}
                        </span>
                        {getMethodBadge(sale.paymentMethod)}
                        <span className="text-[11px] text-slate-500">
                          {formatTimestamp(sale.timestamp)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Atendido por: <strong className="text-slate-200">{sale.sellerName}</strong>
                        </span>
                        {sale.customerName && (
                          <span className="text-amber-400">
                            · Cliente: <strong>{sale.customerName}</strong>
                          </span>
                        )}
                      </div>

                      {/* Purchased Items if available */}
                      {sale.items && sale.items.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {sale.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded"
                            >
                              {item.quantity}x {item.product?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount and Void Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Total</span>
                      <span className="text-xl font-bold text-emerald-400">
                        {sale.total.toFixed(2)}€
                      </span>
                    </div>

                    {/* Void Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5 text-rose-400" />}
                      className="hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold"
                      onClick={() => handleOpenVoidModal(sale)}
                      title="Anular venta y devolver stock"
                    >
                      {t('history.voidButton')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* AUDITORÍA DE ANULACIONES VIEW */
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Registro de Auditoría de Ventas Anuladas</h3>
                <p className="text-xs text-slate-400">
                  Control de seguridad, motivos y trazabilidad de productos reincorporados al inventario
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
              {voidAudits.length} anulaciones
            </span>
          </div>

          {voidAudits.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-semibold text-white text-base">{t('history.auditsEmpty')}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No se ha registrado ninguna anulación de venta en el terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {voidAudits.map((audit) => (
                <div
                  key={audit.id}
                  className="bg-slate-900 border border-rose-500/20 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                        ANULADO
                      </span>
                      <span className="font-mono text-xs text-slate-300">
                        Ticket #{audit.saleId.slice(0, 8)}
                      </span>
                      {getMethodBadge(audit.paymentMethod)}
                      <span className="text-[11px] text-slate-500">
                        {formatTimestamp(audit.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('history.voidedBy')}: <strong>{audit.voidedBy}</strong> ({audit.voidedByRole})</span>
                    </div>

                    {/* Motivo de anulación destacado */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 block mb-0.5">
                        Motivo registrado:
                      </span>
                      <p className="italic font-medium">"{audit.reason}"</p>
                    </div>

                    {/* Productos devueltos */}
                    {audit.returnedItems && audit.returnedItems.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Boxes className="w-3 h-3 text-emerald-400" />
                          {t('history.returnedItems')}:
                        </span>
                        {audit.returnedItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-2 py-0.5 rounded font-mono"
                          >
                            +{item.quantity} {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Monto Revertido</span>
                    <span className="text-xl font-bold text-rose-400">
                      -{audit.returnedAmount.toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal to Void Sale with Mandatory Reason */}
      {selectedSaleToVoid && (
        <Modal
          isOpen={true}
          onClose={() => !isVoiding && setSelectedSaleToVoid(null)}
          title={t('history.confirmVoid')}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-rose-200">
                  {t('history.voidWarning')}
                </p>
                <p className="text-rose-300/80">
                  Ticket #{selectedSaleToVoid.id.slice(0, 8)} por un importe de{' '}
                  <strong className="text-white">{selectedSaleToVoid.total.toFixed(2)}€</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Método de pago:</span>
                <span className="font-semibold uppercase text-slate-200">{selectedSaleToVoid.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Atendido por:</span>
                <span className="text-slate-200">{selectedSaleToVoid.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y Hora:</span>
                <span className="text-slate-200">{formatTimestamp(selectedSaleToVoid.timestamp)}</span>
              </div>
            </div>

            {/* Motivo de anulación OBLIGATORIO */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white block flex items-center justify-between">
                <span>{t('history.voidReason')} *</span>
                <span className="text-[10px] text-rose-400 font-normal">Requerido para auditoría</span>
              </label>

              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t('history.voidReasonPlaceholder')}
                className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />

              {/* Botones de motivo rápido */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {quickReasons.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => setVoidReason(qr)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-700/60 transition cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                disabled={isVoiding}
                onClick={() => setSelectedSaleToVoid(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isVoiding || !voidReason.trim()}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmVoid}
              >
                {isVoiding ? 'Anulando...' : 'Confirmar Anulación y Devolver Stock'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
