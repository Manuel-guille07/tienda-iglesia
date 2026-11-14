import React, { useEffect, useMemo, useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import {
  useCloseoutStore,
  calculateShiftTabBreakdown,
  TabPaymentExport,
} from '../../store/useCloseoutStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ShiftClose } from '../../types';
import { fromCents, toCents } from '../../utils/finance';
import {
  Calculator,
  FileSpreadsheet,
  Download,
  Printer,
  Banknote,
  CreditCard,
  BookOpen,
  Heart,
  Coffee,
  ShoppingBag,
  PackageCheck,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentModal } from './IncidentModal';
import { IncidentListPanel } from './IncidentListPanel';
import { CashArqueoPanel } from './CashArqueoPanel';
import {
  PrintableReportModal,
  calculateSalesAccountingBreakdown,
} from '../common/PrintableReportModal';
import toast from 'react-hot-toast';

export const CloseoutScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { currentUser } = useAuthStore();
  const { sales } = usePOSStore();
  const { customers } = useTabStore();
  const {
    incidents,
    shiftCloses,
    lastCloseTimestamp,
    voidAudits,
    tabCredits,
    tabPayments: allStoreTabPayments,
    shiftTabPayments: storeShiftTabPayments,
    loadShiftTabPayments,
    addIncident,
    recordShiftClose,
    exportToGoogleSheets,
    downloadCSV,
    isSyncingSheets,
    isClosingShift: isStoreClosingShift,
  } = useCloseoutStore();

  const [counted, setCounted] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedHistoricalIndex, setSelectedHistoricalIndex] = useState<number | null>(null);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const closingLock = isClosingShift || isStoreClosingShift;

  const lastClose = shiftCloses[0];
  const latestCloseMs = Math.max(
    lastClose?.timestamp ? new Date(lastClose.timestamp).getTime() : 0,
    lastCloseTimestamp ? new Date(lastCloseTimestamp).getTime() : 0
  );

  useEffect(() => {
    const sinceIso = latestCloseMs > 0 ? new Date(latestCloseMs).toISOString() : null;
    loadShiftTabPayments(sinceIso);
  }, [latestCloseMs, loadShiftTabPayments]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const isAfterLastCloseout = (isoString?: string) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    if (latestCloseMs > 0) {
      return d.getTime() > latestCloseMs;
    }
    return d.getTime() >= startOfDay.getTime();
  };

  const shiftSales = useMemo(
    () => sales.filter((s) => isAfterLastCloseout(s.timestamp)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales, latestCloseMs]
  );

  const shiftTabPayments = useMemo(() => {
    const localTabPayments: TabPaymentExport[] = customers.flatMap((c) =>
      (c.movements || [])
        .filter((m) => m.type === 'pago' && !m.saleId && isAfterLastCloseout(m.timestamp))
        .map((m) => ({
          id: m.id,
          tabId: c.id,
          customerName: c.name,
          amount: m.amount,
          paymentMethod: (m.paymentMethod === 'datafono' ? 'datafono' : 'efectivo') as
            | 'efectivo'
            | 'datafono',
          timestamp: m.timestamp,
          description: m.description,
        }))
    );

    const dbShiftPayments = [
      ...storeShiftTabPayments,
      ...allStoreTabPayments.filter((p) => isAfterLastCloseout(p.timestamp)),
    ].filter((p) => isAfterLastCloseout(p.timestamp));

    const combined: TabPaymentExport[] = [];
    for (const p of [...dbShiftPayments, ...localTabPayments]) {
      if (!p || !(p.amount > 0)) continue;
      const isDup = combined.some(
        (existing) =>
          (p.id && existing.id && p.id === existing.id) ||
          (existing.customerName.trim().toLowerCase() === p.customerName.trim().toLowerCase() &&
            toCents(existing.amount) === toCents(p.amount) &&
            existing.paymentMethod === p.paymentMethod &&
            Math.abs(new Date(existing.timestamp).getTime() - new Date(p.timestamp).getTime()) < 5000)
      );
      if (!isDup) {
        combined.push(p);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeShiftTabPayments, allStoreTabPayments, customers, latestCloseMs]);

  const sellersInShift = Array.from(
    shiftSales.reduce((map, s) => {
      const seller = s.sellerName || 'Vendedor';
      const current = map.get(seller) || { count: 0, total: 0 };
      current.count += 1;
      current.total += s.total || 0;
      map.set(seller, current);
      return map;
    }, new Map<string, { count: number; total: number }>())
  );

  const salesCash = fromCents(
    shiftSales.filter((s) => s.paymentMethod === 'efectivo').reduce((a, s) => a + toCents(s.total), 0)
  );
  const salesCard = fromCents(
    shiftSales.filter((s) => s.paymentMethod === 'datafono').reduce((a, s) => a + toCents(s.total), 0)
  );

  const donativosCash = fromCents(
    shiftSales
      .filter((s) => s.paymentMethod === 'donativo' && s.donationSubMethod !== 'datafono')
      .reduce((a, s) => a + toCents(s.total), 0)
  );
  const donativosCard = fromCents(
    shiftSales
      .filter((s) => s.paymentMethod === 'donativo' && s.donationSubMethod === 'datafono')
      .reduce((a, s) => a + toCents(s.total), 0)
  );

  const tabPaymentsCash = fromCents(
    shiftTabPayments
      .filter((p) => p.paymentMethod === 'efectivo')
      .reduce((sum, p) => sum + toCents(p.amount), 0)
  );

  const tabPaymentsCard = fromCents(
    shiftTabPayments
      .filter((p) => p.paymentMethod === 'datafono')
      .reduce((sum, p) => sum + toCents(p.amount), 0)
  );

  const totalTabPayments = fromCents(toCents(tabPaymentsCash) + toCents(tabPaymentsCard));

  const expectedCash = fromCents(
    toCents(salesCash) + toCents(tabPaymentsCash) + toCents(donativosCash)
  );
  const totalCard = fromCents(
    toCents(salesCard) + toCents(tabPaymentsCard) + toCents(donativosCard)
  );
  const totalRevenue = fromCents(toCents(expectedCash) + toCents(totalCard));

  const {
    netFiados: totalFiados,
    grossFiados: totalFiadosGross,
    prepaidUsed: prepaidTabsUsed,
  } = useMemo(
    () => calculateShiftTabBreakdown(shiftSales, tabCredits),
    [shiftSales, tabCredits]
  );
  const totalDonativos = fromCents(toCents(donativosCash) + toCents(donativosCard));
  const totalConsumo = fromCents(
    shiftSales
      .filter((s) => s.paymentMethod === 'consumo_interno')
      .reduce((a, s) => a + toCents(s.total), 0)
  );

  const { totalCafes, totalRestoCafeteria, totalCoffeesQty, soldItemsSummary } = useMemo(
    () => calculateSalesAccountingBreakdown(shiftSales),
    [shiftSales]
  );

  const totalCoffees = totalCoffeesQty;
  const difference = fromCents(toCents(counted) - toCents(expectedCash));

  const getShift = () => ({
    closedBy: currentUser?.name || 'Turno',
    role: currentUser?.role || 'Vendedor',
    expectedCash,
    actualCash: counted,
    totalCard,
    totalFiados,
    totalFiadosGross,
    prepaidTabsUsed,
    totalDonativos,
    totalConsumoInterno: totalConsumo,
    totalCoffeesSold: totalCoffees,
    totalSalesCount: shiftSales.length,
    totalRevenue,
    difference,
    incidents,
    salesCash,
    tabPaymentsCash,
    salesCard,
    tabPaymentsCard,
    totalTabPayments,
    totalCafes,
    totalRestoCafeteria,
    soldItemsSummary,
  });

  const shiftVoidAudits = voidAudits.filter((a) => isAfterLastCloseout(a.timestamp));
  const voidedTotal = shiftVoidAudits.reduce((acc, a) => acc + (a.returnedAmount || 0), 0);

  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';

  const innerSurface = isDark
    ? 'bg-[#0E0C0B]/70 border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#EFECE6]/80 border-[#E2DDD5] text-[#141210]';

  const getHistoricalCloseSales = (close: ShiftClose, idx: number) => {
    const endMs = new Date(close.timestamp).getTime();
    const prevClose = shiftCloses[idx + 1];
    const startMs = prevClose ? new Date(prevClose.timestamp).getTime() : 0;
    return sales.filter((s) => {
      const ms = new Date(s.timestamp).getTime();
      if (isNaN(ms)) return false;
      if (startMs > 0) {
        return ms > startMs && ms <= endMs;
      }
      const closeDayStart = new Date(close.timestamp);
      closeDayStart.setHours(0, 0, 0, 0);
      return ms >= closeDayStart.getTime() && ms <= endMs;
    });
  };

  const getHistoricalCloseTabPayments = (close: ShiftClose, idx: number) => {
    const endMs = new Date(close.timestamp).getTime();
    const prevClose = shiftCloses[idx + 1];
    const startMs = prevClose ? new Date(prevClose.timestamp).getTime() : 0;
    return allStoreTabPayments.filter((p) => {
      const ms = new Date(p.timestamp).getTime();
      if (isNaN(ms)) return false;
      if (startMs > 0) {
        return ms > startMs && ms <= endMs;
      }
      const closeDayStart = new Date(close.timestamp);
      closeDayStart.setHours(0, 0, 0, 0);
      return ms >= closeDayStart.getTime() && ms <= endMs;
    });
  };

  const selectedHistoricalClose =
    selectedHistoricalIndex !== null ? shiftCloses[selectedHistoricalIndex] : null;
  const historicalSales =
    selectedHistoricalClose && selectedHistoricalIndex !== null
      ? getHistoricalCloseSales(selectedHistoricalClose, selectedHistoricalIndex)
      : [];
  const historicalTabPayments =
    selectedHistoricalClose && selectedHistoricalIndex !== null
      ? getHistoricalCloseTabPayments(selectedHistoricalClose, selectedHistoricalIndex)
      : [];
  const historicalFiadosNet = selectedHistoricalClose
    ? selectedHistoricalClose.totalFiados > 0
      ? selectedHistoricalClose.totalFiados
      : calculateShiftTabBreakdown(historicalSales, tabCredits).netFiados
    : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6" />
            {t('closeout.title')}
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#141210]'}`}>
            {t('closeout.sharedDrawer')} · Responsable:{' '}
            <strong className="font-semibold">{currentUser?.name}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              const draftShift: ShiftClose = {
                ...getShift(),
                id: `draft-${Date.now()}`,
                timestamp: new Date().toISOString(),
                exportStatus: 'pending',
              };
              downloadCSV(draftShift, shiftSales, shiftTabPayments);
              toast.success(t('export.csvSuccess'));
            }}
          >
            {t('export.csvButton')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => {
              setSelectedHistoricalIndex(null);
              setPdfModalOpen(true);
              toast.success(t('export.pdfReady'));
            }}
          >
            {t('export.pdfButton')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isSyncingSheets || closingLock}
            isLoading={isSyncingSheets}
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={async () => {
              if (isSyncingSheets) return;
              const targetId = shiftCloses[0]?.id || 'draft';
              const res = await exportToGoogleSheets(targetId);
              toast.success(res.message);
            }}
          >
            Sheets
          </Button>
        </div>
      </div>

      {/* Vendedores en el Turno Compartido */}
      {sellersInShift.length > 0 && (
        <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-2 text-sm ${cardSurface}`}>
          <span className={isDark ? 'text-[#9A9086]' : 'text-[#141210] font-medium'}>
            {t('closeout.sellersInShift')} ({shiftSales.length} tickets):
          </span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            {sellersInShift.map(([seller, info]) => (
              <span key={seller}>
                <strong className="font-semibold">{seller}</strong>: {info.count} vta ({info.total.toFixed(2)} €)
              </span>
            ))}
          </div>
        </div>
      )}

      {shiftVoidAudits.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-3xl flex items-center justify-between text-sm text-rose-500">
          <span className="font-medium">
            Auditoría de Turno: {shiftVoidAudits.length} venta(s) anulada(s) con stock devuelto
          </span>
          <span className="font-bold tabular-nums">-{voidedTotal.toFixed(2)} €</span>
        </div>
      )}

      {/* Tarjetas KPI de Turno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100'
              : 'bg-emerald-500/12 border-emerald-600/25 text-emerald-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-emerald-200' : 'text-emerald-900'}`}>
                Efectivo Esperado
              </span>
              <Banknote className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`} />
            </div>
            <span className="text-2xl font-bold tabular-nums block mt-1.5">
              {expectedCash.toFixed(2)} €
            </span>
          </div>
          <span
            className={`text-xs text-surface-500 whitespace-normal break-words leading-snug block mt-1.5 tabular-nums ${
              isDark ? 'text-emerald-200/90' : 'text-emerald-900'
            }`}
          >
            Ventas {salesCash.toFixed(2)}€
            {tabPaymentsCash > 0 ? ` + Abonos ${tabPaymentsCash.toFixed(2)}€` : ''}
            {donativosCash > 0 ? ` + Donativos ${donativosCash.toFixed(2)}€` : ''}
          </span>
        </div>

        <div
          className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-100'
              : 'bg-indigo-500/12 border-indigo-600/25 text-indigo-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}>
                Datáfono Total
              </span>
              <CreditCard className={`w-4 h-4 shrink-0 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`} />
            </div>
            <span className="text-2xl font-bold tabular-nums block mt-1.5">
              {totalCard.toFixed(2)} €
            </span>
          </div>
          <span
            className={`text-xs text-surface-500 whitespace-normal break-words leading-snug block mt-1.5 tabular-nums ${
              isDark ? 'text-indigo-200/90' : 'text-indigo-900'
            }`}
          >
            Ventas {salesCard.toFixed(2)}€
            {tabPaymentsCard > 0 ? ` + Abonos ${tabPaymentsCard.toFixed(2)}€` : ''}
            {donativosCard > 0 ? ` + Donativos ${donativosCard.toFixed(2)}€` : ''}
          </span>
        </div>

        <div
          className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-100'
              : 'bg-amber-500/12 border-amber-600/25 text-amber-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                Nuevos Fiados
              </span>
              <BookOpen className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-800'}`} />
            </div>
            <span className="text-2xl font-bold tabular-nums block mt-1.5">
              {totalFiados.toFixed(2)} €
            </span>
          </div>
          <span
            className={`text-xs text-surface-500 whitespace-normal break-words leading-snug block mt-1.5 tabular-nums ${
              isDark ? 'text-amber-200/90' : 'text-amber-900'
            }`}
          >
            {prepaidTabsUsed > 0
              ? `Consumo ${totalFiadosGross.toFixed(2)}€ - Saldos previstos ${prepaidTabsUsed.toFixed(2)}€`
              : `Consumo neto en cuenta: ${totalFiados.toFixed(2)}€`}
          </span>
        </div>

        <div
          className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-100'
              : 'bg-purple-500/12 border-purple-600/25 text-purple-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                Donativos
              </span>
              <Heart className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-300' : 'text-purple-800'}`} />
            </div>
            <span className="text-2xl font-bold tabular-nums block mt-1.5">
              {totalDonativos.toFixed(2)} €
            </span>
          </div>
          <span
            className={`text-xs text-surface-500 whitespace-normal break-words leading-snug block mt-1.5 tabular-nums ${
              isDark ? 'text-purple-200/90' : 'text-purple-900'
            }`}
          >
            Efectivo {donativosCash.toFixed(2)}€
            {donativosCard > 0 ? ` + Datáfono ${donativosCard.toFixed(2)}€` : ''}
          </span>
        </div>

        <div className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-[#9A9086]' : 'text-[#141210]'}`}>
                Cafés Servidos
              </span>
              <Coffee className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#9A9086]' : 'text-[#141210]'}`} />
            </div>
            <span className="text-2xl font-bold tabular-nums block mt-1.5">
              {totalCoffees}
            </span>
          </div>
          <span
            className={`text-xs text-surface-500 whitespace-normal break-words leading-snug block mt-1.5 tabular-nums ${
              isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
            }`}
          >
            Importe cafés: {totalCafes.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Separación Contable + Resumen de Artículos (Antes de Confirmar Cierre) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Separación Contable */}
        <div className={`lg:col-span-5 border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4" />
              Separación Contable del Turno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${innerSurface}`}>
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-[#2A2420] text-[#F4F0EA]' : 'bg-[#E5E0D8] text-[#141210]'
                    }`}
                  >
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block whitespace-normal break-words">Total Cafés</span>
                    <span className={`text-xs text-surface-500 whitespace-normal break-words block ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
                      Categoría Cafés ({totalCoffees} uds.)
                    </span>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono tabular-nums shrink-0">
                  {totalCafes.toFixed(2)} €
                </span>
              </div>

              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${innerSurface}`}>
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-[#2A2420] text-[#F4F0EA]' : 'bg-[#E5E0D8] text-[#141210]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block whitespace-normal break-words">Total Resto de Cafetería</span>
                    <span className={`text-xs text-surface-500 whitespace-normal break-words block ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
                      Bebidas, snacks y otros artículos
                    </span>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono tabular-nums shrink-0">
                  {totalRestoCafeteria.toFixed(2)} €
                </span>
              </div>

              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${innerSurface}`}>
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-[#2A2420] text-[#F4F0EA]' : 'bg-[#E5E0D8] text-[#141210]'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block whitespace-normal break-words">Abonos Recibidos (Deudas previas)</span>
                    <span className={`text-xs text-surface-500 whitespace-normal break-words block ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
                      Pagos de deudas (Efectivo: {tabPaymentsCash.toFixed(2)} € · Datáfono: {tabPaymentsCard.toFixed(2)} €)
                    </span>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono tabular-nums shrink-0">
                  {totalTabPayments.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          <p className={`text-xs text-surface-500 whitespace-normal break-words mt-4 pt-3 border-t ${isDark ? 'border-[#2A2420] text-[#9A9086]' : 'border-[#E2DDD5] text-[#141210]'}`}>
            Desglose automático sobre las ventas activas y abonos recibidos del turno.
          </p>
        </div>

        {/* Resumen de Artículos para Cuadre de Stock Físico */}
        <div className={`lg:col-span-7 border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                Resumen de Artículos
              </h3>
              <span className={`text-xs font-mono font-semibold tabular-nums ${isDark ? 'text-[#9A9086]' : 'text-[#141210]'}`}>
                {soldItemsSummary.reduce((a, b) => a + b.quantity, 0)} unidades vendidas
              </span>
            </div>

            {soldItemsSummary.length === 0 ? (
              <div
                className={`py-8 text-center rounded-2xl border border-dashed text-xs ${
                  isDark ? 'border-[#2A2420] text-[#9A9086]' : 'border-[#D6CFC5] text-[#3D352F]'
                }`}
              >
                No hay artículos detallados registrados en el turno actual.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {soldItemsSummary.map((item) => (
                  <div
                    key={`${item.name}-${item.category || ''}`}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border text-xs ${innerSurface}`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold whitespace-normal break-words">
                        <span className="font-mono font-bold">{item.quantity} ×</span> {item.name}
                      </p>
                      {item.category && (
                        <span className={`text-[10px] capitalize ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold tabular-nums shrink-0">
                      {item.revenue.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className={`text-xs text-surface-500 whitespace-normal break-words mt-4 pt-3 border-t ${isDark ? 'border-[#2A2420] text-[#9A9086]' : 'border-[#E2DDD5] text-[#141210]'}`}>
            Resumen consolidado para facilitar el cuadre de inventario físico gastado.
          </p>
        </div>
      </div>

      {/* Arqueo + Incidencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashArqueoPanel
          expectedCash={expectedCash}
          salesCash={salesCash}
          tabPaymentsCash={tabPaymentsCash}
          donativosCash={donativosCash}
          counted={counted}
          onCountedChange={setCounted}
          difference={difference}
          isSubmitting={closingLock}
          onConfirmClose={async () => {
            if (closingLock) return;
            if (!Number.isFinite(counted) || isNaN(counted) || counted < 0) {
              toast.error('Introduce un monto de efectivo contado válido mayor o igual a 0');
              return;
            }
            setIsClosingShift(true);
            try {
              const res = await recordShiftClose(getShift());
              if (res.success) {
                setCounted(0);
                usePOSStore.setState({ cart: [] });
                toast.success('Cierre de caja completado. Estado de caja reiniciado a 0.00€');
              } else {
                toast.error(res.error || 'Error de red al confirmar el cierre de caja');
              }
            } finally {
              setIsClosingShift(false);
            }
          }}
        />
        <IncidentListPanel incidents={incidents} onOpenNew={() => setModalOpen(true)} />
      </div>

      {/* Historial de Cierres Recientes (acceso directo a ticket PDF histórico) */}
      {shiftCloses.length > 0 && (
        <div className={`border rounded-3xl p-5 ${cardSurface}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Cierres Recientes
            </h3>
            <span className={`text-xs font-mono ${isDark ? 'text-[#9A9086]' : 'text-[#141210]'}`}>
              {shiftCloses.length} registros
            </span>
          </div>
          <div className="space-y-2">
            {shiftCloses.slice(0, 6).map((close, idx) => (
              <div
                key={close.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border text-xs ${innerSurface}`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold">
                    {new Date(close.timestamp).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {close.closedBy}
                  </div>
                  <div className={`font-mono tabular-nums ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
                    Esperado: {close.expectedCash.toFixed(2)} € · Contado: {close.actualCash.toFixed(2)} € · Datáfono:{' '}
                    {close.totalCard.toFixed(2)} €
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedHistoricalIndex(idx);
                    setPdfModalOpen(true);
                  }}
                >
                  Ver Ticket
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <IncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(text, cat) => {
          if (!currentUser) return;
          addIncident(text, cat, currentUser.name, currentUser.role);
          toast.success('Incidencia guardada');
        }}
      />

      <PrintableReportModal
        isOpen={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setSelectedHistoricalIndex(null);
        }}
        report={
          selectedHistoricalClose
            ? {
                title: `${t('closeout.title')} — Ticket Histórico`,
                subtitle: `Arqueo cerrado el ${new Date(selectedHistoricalClose.timestamp).toLocaleString('es-ES')}`,
                generatedBy: selectedHistoricalClose.closedBy,
                generatedRole: selectedHistoricalClose.role,
                periodLabel: `Cierre #${selectedHistoricalClose.id.slice(0, 8)}`,
                kpis: [
                  { label: 'Efectivo Esperado', value: `${selectedHistoricalClose.expectedCash.toFixed(2)}€` },
                  { label: 'Datáfono Total', value: `${selectedHistoricalClose.totalCard.toFixed(2)}€` },
                  { label: 'Nuevos Fiados', value: `${historicalFiadosNet.toFixed(2)}€` },
                  { label: 'Donativos', value: `${selectedHistoricalClose.totalDonativos.toFixed(2)}€` },
                ],
                sales: historicalSales,
                tabPayments: historicalTabPayments,
                shiftClose: selectedHistoricalClose,
                voidAudits,
              }
            : {
                title: t('closeout.title'),
                subtitle: 'Arqueo de turno, cobros de fiados y desglose por método de pago',
                generatedBy: currentUser?.name || 'Responsable',
                generatedRole: currentUser?.role || 'Vendedor',
                periodLabel: 'Turno Actual',
                kpis: [
                  { label: 'Efectivo Esperado', value: `${expectedCash.toFixed(2)}€` },
                  { label: 'Datáfono Total', value: `${totalCard.toFixed(2)}€` },
                  { label: 'Nuevos Fiados', value: `${totalFiados.toFixed(2)}€` },
                  { label: 'Donativos', value: `${totalDonativos.toFixed(2)}€` },
                ],
                sales: shiftSales,
                tabPayments: shiftTabPayments,
                shiftClose: getShift(),
                voidAudits: shiftVoidAudits,
              }
        }
      />
    </div>
  );
};
