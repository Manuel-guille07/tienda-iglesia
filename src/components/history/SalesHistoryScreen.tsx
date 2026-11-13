import React, { useState, useMemo } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Sale, PaymentMethod } from '../../types';
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
  ShieldAlert,
  Trash2,
  Boxes,
  UserCheck,
  Download,
  Printer,
  PackageCheck,
  Coffee,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  PrintableReportModal,
  exportSalesHistoryToCSV,
  calculateSalesAccountingBreakdown,
} from '../common/PrintableReportModal';
import toast from 'react-hot-toast';

export const SalesHistoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { sales, voidSale } = usePOSStore();
  const { currentUser } = useAuthStore();
  const { voidAudits, addVoidAudit } = useCloseoutStore();

  const [activeTab, setActiveTab] = useState<'tickets' | 'audits'>('tickets');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedTicketForPDF, setSelectedTicketForPDF] = useState<Sale | null>(null);

  const [selectedSaleToVoid, setSelectedSaleToVoid] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (dateFilter === 'today') {
        const saleDate = sale.timestamp ? sale.timestamp.split('T')[0] : '';
        if (saleDate !== todayStr) return false;
      }

      if (methodFilter !== 'all' && sale.paymentMethod !== methodFilter) {
        return false;
      }

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

  const stats = useMemo(() => {
    const list =
      dateFilter === 'today'
        ? sales.filter((s) => s.timestamp && s.timestamp.split('T')[0] === todayStr)
        : sales;

    const total = list.reduce((acc, s) => acc + (s.total || 0), 0);
    const cash = list.filter((s) => s.paymentMethod === 'efectivo').reduce((acc, s) => acc + (s.total || 0), 0);
    const card = list.filter((s) => s.paymentMethod === 'datafono').reduce((acc, s) => acc + (s.total || 0), 0);
    const tabs = list.filter((s) => s.paymentMethod === 'fiado').reduce((acc, s) => acc + (s.total || 0), 0);
    const count = list.length;

    return { total, cash, card, tabs, count };
  }, [sales, dateFilter, todayStr]);

  const { totalCafes, totalRestoCafeteria, soldItemsSummary } = useMemo(
    () => calculateSalesAccountingBreakdown(filteredSales),
    [filteredSales]
  );

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
      const returnedItems = (selectedSaleToVoid.items || []).map((it) => ({
        name: it.product?.name || 'Producto',
        quantity: it.quantity,
      }));

      const result = await voidSale(selectedSaleToVoid.id);
      toast.dismiss(toastId);

      if (result.success) {
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
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
              isDark
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-emerald-900 bg-emerald-500/15 border-emerald-600/30'
            }`}
          >
            <Banknote className="w-3 h-3" />
            Efectivo
          </span>
        );
      case 'datafono':
        return (
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
              isDark
                ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
                : 'text-indigo-900 bg-indigo-500/15 border-indigo-600/30'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Datáfono
          </span>
        );
      case 'fiado':
        return (
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
              isDark
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-amber-900 bg-amber-500/15 border-amber-600/30'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Fiado
          </span>
        );
      case 'donativo':
        return (
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
              isDark
                ? 'text-purple-300 bg-purple-500/10 border-purple-500/20'
                : 'text-purple-900 bg-purple-500/15 border-purple-600/30'
            }`}
          >
            <Heart className="w-3 h-3" />
            Donativo
          </span>
        );
      default:
        return (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
              isDark
                ? 'text-[#C2B8AD] bg-[#2A2420] border-[#3D352F]'
                : 'text-[#141210] bg-[#E5E0D8] border-[#D6CFC5]'
            }`}
          >
            {method}
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' · ' +
        date.toLocaleDateString([], { day: '2-digit', month: 'short' })
      );
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

  const primaryText = isDark ? 'text-[#F4F0EA]' : 'text-[#141210]';
  const secondaryText = isDark ? 'text-[#C2B8AD]' : 'text-[#141210]';
  const subtleText = isDark ? 'text-[#9A9086]' : 'text-[#3D352F]';
  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';
  const innerSurface = isDark
    ? 'bg-[#0E0C0B] border-[#2A2420]'
    : 'bg-[#EFECE6] border-[#E2DDD5]';
  const borderSubtle = isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]';

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-6 ${primaryText}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#2A2420] border-[#3D352F] text-[#F4F0EA]'
                : 'bg-[#E5E0D8] border-[#D6CFC5] text-[#141210]'
            }`}
          >
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${primaryText}`}>
              {t('history.title')}
              <span
                className={`text-[10px] font-mono uppercase border px-2 py-0.5 rounded-lg ${
                  isDark
                    ? 'bg-[#2A2420] text-[#C2B8AD] border-[#3D352F]'
                    : 'bg-[#E5E0D8] text-[#141210] border-[#D6CFC5]'
                }`}
              >
                ELARX Ledger
              </span>
            </h1>
            <p className={`text-xs ${subtleText}`}>{t('history.subtitle')}</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => {
              exportSalesHistoryToCSV(
                filteredSales,
                voidAudits,
                dateFilter === 'today' ? 'Hoy' : 'Histórico Completo'
              );
              toast.success(t('export.csvSuccess'));
            }}
          >
            {t('export.csvButton')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => {
              setSelectedTicketForPDF(null);
              setPdfModalOpen(true);
              toast.success(t('export.pdfReady'));
            }}
          >
            {t('export.pdfButton')}
          </Button>

          <div className={`flex items-center border p-1 rounded-2xl ${cardSurface}`}>
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === 'tickets'
                  ? isDark
                    ? 'bg-[#F4F0EA] text-[#141210]'
                    : 'bg-[#141210] text-[#FAF8F5]'
                  : `${secondaryText} hover:opacity-80`
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              {t('history.tab.tickets')}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeTab === 'tickets'
                    ? isDark
                      ? 'bg-[#141210]/15 text-[#141210]'
                      : 'bg-white/20 text-white'
                    : isDark
                    ? 'bg-[#2A2420] text-[#F4F0EA]'
                    : 'bg-[#E5E0D8] text-[#141210]'
                }`}
              >
                {filteredSales.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audits')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === 'audits'
                  ? 'bg-rose-700 text-white'
                  : `${secondaryText} hover:opacity-80`
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {t('history.tab.audits')}
              {voidAudits.length > 0 && (
                <span className="text-[10px] bg-rose-950 text-rose-200 border border-rose-800 px-1.5 py-0.2 rounded-full tabular-nums">
                  {voidAudits.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <>
          {/* KPI Stats Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className={`border rounded-3xl p-4 flex flex-col justify-between ${cardSurface}`}>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${secondaryText}`}>
                {t('history.totalToday')}
              </span>
              <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${primaryText}`}>
                {stats.total.toFixed(2)} €
              </div>
              <span className={`text-[10px] mt-1 ${subtleText}`}>Total recaudado</span>
            </div>

            <div className={`border rounded-3xl p-4 flex flex-col justify-between ${cardSurface}`}>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                {t('history.cashToday')}
              </span>
              <div
                className={`text-2xl font-bold mt-1 font-mono tabular-nums ${
                  isDark ? 'text-emerald-400' : 'text-emerald-900'
                }`}
              >
                {stats.cash.toFixed(2)} €
              </div>
              <span className={`text-[10px] mt-1 ${subtleText}`}>Caja en efectivo</span>
            </div>

            <div className={`border rounded-3xl p-4 flex flex-col justify-between ${cardSurface}`}>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                {t('history.cardToday')}
              </span>
              <div
                className={`text-2xl font-bold mt-1 font-mono tabular-nums ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}
              >
                {stats.card.toFixed(2)} €
              </div>
              <span className={`text-[10px] mt-1 ${subtleText}`}>Terminales / TPV</span>
            </div>

            <div className={`border rounded-3xl p-4 flex flex-col justify-between ${cardSurface}`}>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isDark ? 'text-amber-400' : 'text-amber-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {t('history.tabsToday')}
              </span>
              <div
                className={`text-2xl font-bold mt-1 font-mono tabular-nums ${
                  isDark ? 'text-amber-400' : 'text-amber-900'
                }`}
              >
                {stats.tabs.toFixed(2)} €
              </div>
              <span className={`text-[10px] mt-1 ${subtleText}`}>Cuentas pendientes</span>
            </div>

            <div className={`border rounded-3xl p-4 col-span-2 lg:col-span-1 flex flex-col justify-between ${cardSurface}`}>
              <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${secondaryText}`}>
                <Receipt className="w-3.5 h-3.5" />
                {t('history.ordersCount')}
              </span>
              <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${primaryText}`}>
                {stats.count}
              </div>
              <span className={`text-[10px] mt-1 ${subtleText}`}>Operaciones registradas</span>
            </div>
          </div>

          {/* Resumen de Artículos & Separación Contable del Filtro Activo */}
          {filteredSales.length > 0 && (
            <div className={`border rounded-3xl p-4 space-y-3 ${cardSurface}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4" />
                  Resumen de Artículos ({soldItemsSummary.reduce((a, b) => a + b.quantity, 0)} uds.)
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${innerSurface}`}>
                    <Coffee className="w-3.5 h-3.5" />
                    Cafés: <strong>{totalCafes.toFixed(2)} €</strong>
                  </span>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${innerSurface}`}>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Resto Cafetería: <strong>{totalRestoCafeteria.toFixed(2)} €</strong>
                  </span>
                </div>
              </div>

              {soldItemsSummary.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {soldItemsSummary.map((item) => (
                    <span
                      key={`${item.name}-${item.category || ''}`}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border ${innerSurface}`}
                    >
                      <strong className="font-mono">{item.quantity} ×</strong>
                      <span>{item.name}</span>
                      <span className={`font-mono text-[11px] ${subtleText}`}>
                        ({item.revenue.toFixed(2)} €)
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${subtleText}`}>
                  Sin detalle de líneas individuales en las ventas seleccionadas.
                </p>
              )}
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className={`flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border p-3 rounded-3xl ${cardSurface}`}>
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`} />
              <input
                type="text"
                placeholder={t('history.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-2xl text-xs focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0E0C0B] border-[#2A2420] text-[#F4F0EA] placeholder-[#7C7268] focus:border-[#F4F0EA]'
                    : 'bg-[#EFECE6] border-[#D6CFC5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className={`flex items-center border p-1 rounded-2xl ${innerSurface}`}>
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    dateFilter === 'today'
                      ? isDark
                        ? 'bg-[#F4F0EA] text-[#141210]'
                        : 'bg-[#141210] text-[#FAF8F5]'
                      : secondaryText
                  }`}
                >
                  {t('history.filter.today')}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    dateFilter === 'all'
                      ? isDark
                        ? 'bg-[#F4F0EA] text-[#141210]'
                        : 'bg-[#141210] text-[#FAF8F5]'
                      : secondaryText
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
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition border ${
                      methodFilter === m.id
                        ? isDark
                          ? 'bg-[#F4F0EA] text-[#141210] border-[#F4F0EA]'
                          : 'bg-[#141210] text-[#FAF8F5] border-[#141210]'
                        : isDark
                        ? 'bg-[#0E0C0B] border-[#2A2420] text-[#C2B8AD] hover:text-[#F4F0EA]'
                        : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] hover:bg-[#E5E0D8]'
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
            <div className={`border rounded-3xl p-12 text-center ${cardSurface}`}>
              <Receipt className={`w-12 h-12 mx-auto mb-3 ${subtleText}`} />
              <p className={`font-semibold text-base ${primaryText}`}>{t('history.empty')}</p>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${subtleText}`}>
                No se han registrado transacciones con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className={`border rounded-3xl p-4 transition flex flex-col md:flex-row justify-between md:items-center gap-4 ${cardSurface}`}
                >
                  {/* Ticket Details */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${innerSurface}`}
                    >
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-xs font-bold ${primaryText}`}>
                          #{sale.id.slice(0, 8)}
                        </span>
                        {getMethodBadge(sale.paymentMethod)}
                        <span className={`text-[11px] font-medium ${subtleText}`}>
                          {formatTimestamp(sale.timestamp)}
                        </span>
                      </div>

                      <div className={`text-xs mt-1 flex items-center gap-2 flex-wrap ${secondaryText}`}>
                        <span>
                          Atendido por: <strong className={primaryText}>{sale.sellerName}</strong>
                        </span>
                        {sale.customerName && (
                          <span className={isDark ? 'text-amber-400' : 'text-amber-900'}>
                            · Cliente: <strong>{sale.customerName}</strong>
                          </span>
                        )}
                      </div>

                      {sale.items && sale.items.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {sale.items.map((item, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] border px-2 py-0.5 rounded-lg font-medium ${innerSurface} ${primaryText}`}
                            >
                              {item.quantity}x {item.product?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount, Ticket Preview & Void Action */}
                  <div className={`flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 ${borderSubtle}`}>
                    <div className="text-right">
                      <span className={`text-[10px] uppercase tracking-wider block ${subtleText}`}>
                        Total
                      </span>
                      <span
                        className={`text-xl font-bold font-mono tabular-nums ${
                          isDark ? 'text-emerald-400' : 'text-[#141210]'
                        }`}
                      >
                        {sale.total.toFixed(2)} €
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedTicketForPDF(sale);
                          setPdfModalOpen(true);
                        }}
                        title="Ver Ticket PDF / Resumen de Artículos"
                      >
                        Ticket
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                        className="hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-semibold"
                        onClick={() => handleOpenVoidModal(sale)}
                        title="Anular venta y devolver stock"
                      >
                        {t('history.voidButton')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* AUDITORÍA DE ANULACIONES VIEW */
        <div className="space-y-4">
          <div className={`border p-4 rounded-3xl flex items-center justify-between ${cardSurface}`}>
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <div>
                <h3 className={`text-sm font-bold ${primaryText}`}>
                  Registro de Auditoría de Ventas Anuladas
                </h3>
                <p className={`text-xs ${subtleText}`}>
                  Control de seguridad, motivos y trazabilidad de productos reincorporados al inventario
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
              {voidAudits.length} anulaciones
            </span>
          </div>

          {voidAudits.length === 0 ? (
            <div className={`border rounded-3xl p-12 text-center ${cardSurface}`}>
              <ShieldAlert className={`w-12 h-12 mx-auto mb-3 ${subtleText}`} />
              <p className={`font-semibold text-base ${primaryText}`}>{t('history.auditsEmpty')}</p>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${subtleText}`}>
                No se ha registrado ninguna anulación de venta en el terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {voidAudits.map((audit) => (
                <div
                  key={audit.id}
                  className={`border border-rose-500/25 rounded-3xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 ${cardSurface}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                        ANULADO
                      </span>
                      <span className={`font-mono text-xs font-semibold ${primaryText}`}>
                        Ticket #{audit.saleId.slice(0, 8)}
                      </span>
                      {getMethodBadge(audit.paymentMethod)}
                      <span className={`text-[11px] ${subtleText}`}>
                        {formatTimestamp(audit.timestamp)}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs ${secondaryText}`}>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {t('history.voidedBy')}: <strong>{audit.voidedBy}</strong> ({audit.voidedByRole})
                      </span>
                    </div>

                    <div className={`border rounded-2xl p-2.5 text-xs ${innerSurface} ${primaryText}`}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block mb-0.5">
                        Motivo registrado:
                      </span>
                      <p className="italic font-medium">"{audit.reason}"</p>
                    </div>

                    {audit.returnedItems && audit.returnedItems.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className={`text-[10px] font-semibold flex items-center gap-1 ${subtleText}`}>
                          <Boxes className="w-3 h-3 text-emerald-600" />
                          {t('history.returnedItems')}:
                        </span>
                        {audit.returnedItems.map((item, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] border px-2 py-0.5 rounded font-mono ${
                              isDark
                                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                                : 'bg-emerald-500/15 border-emerald-600/30 text-emerald-900'
                            }`}
                          >
                            +{item.quantity} {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 ${borderSubtle}`}>
                    <span className={`text-[10px] uppercase tracking-wider block ${subtleText}`}>
                      Monto Revertido
                    </span>
                    <span className="text-xl font-bold text-rose-500 font-mono tabular-nums">
                      -{audit.returnedAmount.toFixed(2)} €
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
            <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-rose-600 dark:text-rose-300">
                  {t('history.voidWarning')}
                </p>
                <p className={secondaryText}>
                  Ticket #{selectedSaleToVoid.id.slice(0, 8)} por un importe de{' '}
                  <strong className={primaryText}>{selectedSaleToVoid.total.toFixed(2)} €</strong>.
                </p>
              </div>
            </div>

            <div className={`border rounded-2xl p-3 text-xs space-y-2 ${innerSurface}`}>
              <div className="flex justify-between">
                <span className={subtleText}>Método de pago:</span>
                <span className={`font-semibold uppercase ${primaryText}`}>
                  {selectedSaleToVoid.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={subtleText}>Atendido por:</span>
                <span className={primaryText}>{selectedSaleToVoid.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className={subtleText}>Fecha y Hora:</span>
                <span className={primaryText}>{formatTimestamp(selectedSaleToVoid.timestamp)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-semibold flex items-center justify-between ${primaryText}`}>
                <span>{t('history.voidReason')} *</span>
                <span className="text-[10px] text-rose-500 font-normal">Requerido para auditoría</span>
              </label>

              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t('history.voidReasonPlaceholder')}
                className={`w-full p-3 border rounded-2xl text-xs focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0E0C0B] border-[#2A2420] text-[#F4F0EA] placeholder-[#7C7268] focus:border-rose-500'
                    : 'bg-[#EFECE6] border-[#D6CFC5] text-[#141210] placeholder-[#6E665E] focus:border-rose-600'
                }`}
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                {quickReasons.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => setVoidReason(qr)}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition cursor-pointer ${innerSurface} ${primaryText}`}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex gap-2 justify-end pt-2 border-t ${borderSubtle}`}>
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

      {/* Printable PDF Report Modal */}
      <PrintableReportModal
        isOpen={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setSelectedTicketForPDF(null);
        }}
        report={
          selectedTicketForPDF
            ? {
                title: `Ticket Histórico #${selectedTicketForPDF.id.slice(0, 8)}`,
                subtitle: `Operación registrada el ${new Date(selectedTicketForPDF.timestamp).toLocaleString('es-ES')}`,
                generatedBy: selectedTicketForPDF.sellerName || currentUser?.name || 'Vendedor',
                generatedRole: selectedTicketForPDF.sellerRole || currentUser?.role || 'Vendedor',
                periodLabel: `Ticket #${selectedTicketForPDF.id.slice(0, 8)}`,
                kpis: [
                  { label: 'Total Ticket', value: `${selectedTicketForPDF.total.toFixed(2)}€` },
                  { label: 'Método', value: selectedTicketForPDF.paymentMethod.toUpperCase() },
                  { label: 'Vendedor', value: selectedTicketForPDF.sellerName || 'Vendedor' },
                  { label: 'Cliente', value: selectedTicketForPDF.customerName || 'Mostrador' },
                ],
                sales: [selectedTicketForPDF],
                voidAudits,
              }
            : {
                title: t('history.title'),
                subtitle: t('history.subtitle'),
                generatedBy: currentUser?.name || 'Responsable',
                generatedRole: currentUser?.role || 'Vendedor',
                periodLabel: dateFilter === 'today' ? 'Hoy' : 'Histórico Completo',
                kpis: [
                  { label: 'Total Recaudado', value: `${stats.total.toFixed(2)}€` },
                  { label: 'Efectivo', value: `${stats.cash.toFixed(2)}€` },
                  { label: 'Datáfono / TPV', value: `${stats.card.toFixed(2)}€` },
                  { label: 'Fiados / Cuentas', value: `${stats.tabs.toFixed(2)}€` },
                ],
                sales: filteredSales,
                voidAudits,
              }
        }
      />
    </div>
  );
};
