import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePOSStore } from '../../store/usePOSStore';
import {
  useCloseoutStore,
  calculateShiftTabBreakdown,
  TabPaymentExport,
} from '../../store/useCloseoutStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { ShiftClose } from '../../types';
import {
  formatCurrency,
  formatCurrencyParts,
  formatInteger,
  fromCents,
  toCents,
} from '../../utils/finance';
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
  ChevronDown,
  Share,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { KpiTile } from '../ui/KpiTile';
import { SurfaceCard } from '../ui/SurfaceCard';
import { QL_EASE_OUT } from '../../lib/motion';
import { IncidentModal } from './IncidentModal';
import { IncidentListPanel } from './IncidentListPanel';
import { CashArqueoPanel } from './CashArqueoPanel';
import {
  PrintableReportModal,
  calculateSalesAccountingBreakdown,
} from '../common/PrintableReportModal';
import { isUserAdminOrSupervisor } from '../common/Navigation';
import {
  buildCloseoutSheetsPayload,
  isGoogleSheetsConfigured,
  syncCloseoutToSheets,
} from '../../services/googleSheets';
import toast from 'react-hot-toast';

export const CloseoutScreen: React.FC = () => {
  const { t } = useLanguage();

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
    shiftSales: storeShiftSales,
    loadCloseouts,
    loadShiftSales,
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
  const [sendingCloseoutIds, setSendingCloseoutIds] = useState<string[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const closingLock = isClosingShift || isStoreClosingShift;

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);
  const canSendHistoricalToSheets =
    isUserAdminOrSupervisor(currentUser?.role) && isGoogleSheetsConfigured();

  const lastClose = shiftCloses[0];
  const latestCloseMs = Math.max(
    lastClose?.timestamp ? new Date(lastClose.timestamp).getTime() : 0,
    lastCloseTimestamp ? new Date(lastCloseTimestamp).getTime() : 0
  );

  useEffect(() => {
    loadCloseouts();
  }, [loadCloseouts]);

  useEffect(() => {
    const sinceIso = latestCloseMs > 0 ? new Date(latestCloseMs).toISOString() : null;
    loadShiftTabPayments(sinceIso);
    loadShiftSales(sinceIso);
  }, [latestCloseMs, loadShiftTabPayments, loadShiftSales]);

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

  const shiftSales = useMemo(() => {
    const map = new Map<string, (typeof sales)[number]>();
    for (const s of storeShiftSales) {
      if (isAfterLastCloseout(s.timestamp)) {
        map.set(s.id, s);
      }
    }
    for (const s of sales) {
      if (isAfterLastCloseout(s.timestamp)) {
        const existing = map.get(s.id);
        if (!existing) {
          map.set(s.id, s);
        } else if ((!existing.items || existing.items.length === 0) && s.items?.length) {
          map.set(s.id, { ...existing, items: s.items });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, storeShiftSales, latestCloseMs]);

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
    closedBy: currentUser?.name || currentUser?.email || 'Turno',
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
  const heroRevenueParts = formatCurrencyParts(totalRevenue);
  const totalUnitsSold = soldItemsSummary.reduce((a, b) => a + b.quantity, 0);
  const isCashMatched = toCents(difference) === 0;

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

  const handleSendHistoricalToSheets = async (close: ShiftClose, idx: number) => {
    if (!canSendHistoricalToSheets || sendingCloseoutIds.includes(close.id)) return;

    setSendingCloseoutIds((prev) => [...prev, close.id]);
    try {
      const closeSales = getHistoricalCloseSales(close, idx);
      const resolvedFiadosNuevos =
        close.totalFiados > 0
          ? close.totalFiados
          : calculateShiftTabBreakdown(closeSales, tabCredits).netFiados;

      const payload = buildCloseoutSheetsPayload({
        ...close,
        totalFiados: resolvedFiadosNuevos,
      });

      const result = await syncCloseoutToSheets(payload);
      if (result.success) {
        toast.success('Cierre sincronizado con Google Sheets');
      } else if (!result.skipped) {
        toast('No se pudo enviar el cierre a Google Sheets. Inténtalo de nuevo más tarde.', {
          icon: '⚠️',
        });
      }
    } finally {
      setSendingCloseoutIds((prev) => prev.filter((id) => id !== close.id));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabecera compacta con menú único de Exportar */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 text-[var(--ql-text-primary)]">
            <Calculator className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[var(--ql-text-secondary)]" />
            <span className="truncate">{t('closeout.title')}</span>
          </h2>
          <p className="text-xs sm:text-sm mt-1 text-[var(--ql-text-secondary)] leading-snug">
            {t('closeout.sharedDrawer')} · Responsable:{' '}
            <strong className="font-semibold text-[var(--ql-text-primary)]">
              {currentUser?.name}
            </strong>
          </p>
        </div>

        <div ref={exportMenuRef} className="relative shrink-0">
          <Button
            variant="subtle"
            size="xs"
            isLoading={isSyncingSheets}
            aria-haspopup="menu"
            aria-expanded={exportMenuOpen}
            icon={!isSyncingSheets ? <Share className="w-3.5 h-3.5" /> : undefined}
            onClick={() => setExportMenuOpen((prev) => !prev)}
            className="gap-1.5"
          >
            <span>Exportar</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--ql-text-muted)] transition-transform duration-150 ${
                exportMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>

          <AnimatePresence>
            {exportMenuOpen && (
              <motion.div
                role="menu"
                aria-label="Opciones de exportación de caja"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={QL_EASE_OUT}
                className="absolute right-0 mt-2 w-56 p-1.5 rounded-2xl border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-card)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-lg)] z-30 origin-top-right"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setExportMenuOpen(false);
                    const draftShift: ShiftClose = {
                      ...getShift(),
                      id: `draft-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      exportStatus: 'pending',
                    };
                    downloadCSV(draftShift, shiftSales, shiftTabPayments);
                    toast.success(t('export.csvSuccess'));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--ql-text-primary)] hover:bg-[var(--ql-bg-elevated)] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--ql-text-secondary)] shrink-0" />
                  <span className="truncate">{t('export.csvButton')}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setExportMenuOpen(false);
                    setSelectedHistoricalIndex(null);
                    setPdfModalOpen(true);
                    toast.success(t('export.pdfReady'));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--ql-text-primary)] hover:bg-[var(--ql-bg-elevated)] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[var(--ql-text-secondary)] shrink-0" />
                  <span className="truncate">{t('export.pdfButton')}</span>
                </button>

                <div className="my-1 border-t border-[var(--ql-hairline)]" />

                <button
                  type="button"
                  role="menuitem"
                  disabled={isSyncingSheets || closingLock}
                  onClick={async () => {
                    if (isSyncingSheets) return;
                    setExportMenuOpen(false);
                    const targetId = shiftCloses[0]?.id || 'draft';
                    const res = await exportToGoogleSheets(targetId);
                    if (res.success) {
                      toast.success(res.message);
                    } else {
                      toast(res.message, { icon: '⚠️' });
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--ql-text-primary)] hover:bg-[var(--ql-bg-elevated)] disabled:opacity-45 disabled:pointer-events-none flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[var(--ql-tone-sage)] shrink-0" />
                  <span className="truncate">
                    {isSyncingSheets ? 'Sincronizando...' : 'Google Sheets'}
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Vendedores en el Turno Compartido */}
      {sellersInShift.length > 0 && (
        <SurfaceCard
          variant="default"
          padding="sm"
          radius="lg"
          className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
        >
          <span className="text-[var(--ql-text-secondary)]">
            {t('closeout.sellersInShift')} ({formatInteger(shiftSales.length)} tickets)
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ql-num">
            {sellersInShift.map(([seller, info]) => (
              <span key={seller} className="text-[var(--ql-text-primary)]">
                <strong className="font-semibold">{seller}</strong>:{' '}
                <span className="text-[var(--ql-text-secondary)]">
                  {formatInteger(info.count)} vta ·
                </span>{' '}
                {formatCurrency(info.total)}
              </span>
            ))}
          </div>
        </SurfaceCard>
      )}

      {shiftVoidAudits.length > 0 && (
        <div className="bg-[var(--ql-tone-terracotta-soft)] border border-[var(--ql-hairline)] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-[var(--ql-tone-terracotta)]">
          <span className="font-medium">
            Auditoría de Turno: {formatInteger(shiftVoidAudits.length)} venta(s) anulada(s) con stock devuelto
          </span>
          <span className="font-semibold ql-num shrink-0">
            -{formatCurrency(voidedTotal)}
          </span>
        </div>
      )}

      {/* Jerarquía Financiera del Turno (Estilo Stripe / Quiet Luxury) */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Tarjeta Héroe: Recaudación Principal del Turno */}
        <SurfaceCard padding="md" radius="xl" className="sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-medium text-[var(--ql-text-secondary)]">
                Recaudación del Turno
              </span>
              <p
                aria-label={heroRevenueParts.full}
                className="ql-num text-3xl sm:text-4xl font-semibold tracking-tight leading-none text-[var(--ql-text-primary)] mt-2"
              >
                {heroRevenueParts.sign}
                {heroRevenueParts.integer}
                <span className="text-[0.68em] font-medium text-[var(--ql-text-secondary)]">
                  {heroRevenueParts.decimal}
                </span>
                <span className="text-[0.62em] font-medium text-[var(--ql-text-muted)] ml-1">
                  {heroRevenueParts.symbol}
                </span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge
                variant={shiftSales.length > 0 ? 'success' : 'subtle'}
                size="sm"
                dot
              >
                {shiftSales.length > 0
                  ? `${formatInteger(shiftSales.length)} ${
                      shiftSales.length === 1 ? 'ticket' : 'tickets'
                    }`
                  : 'Sin movimientos'}
              </Badge>
              <span className="text-[11px] font-medium text-[var(--ql-text-muted)] ql-num">
                {expectedCash === 0 && counted === 0
                  ? 'Arqueo pendiente'
                  : isCashMatched
                  ? 'Caja cuadrada'
                  : `Descuadre ${formatCurrency(difference, { showSign: true })}`}
              </span>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[var(--ql-hairline)] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ql-text-secondary)] ql-num">
            <span>
              Efectivo{' '}
              <strong className="font-semibold text-[var(--ql-text-primary)]">
                {formatCurrency(expectedCash)}
              </strong>
            </span>
            <span>
              Datáfono{' '}
              <strong className="font-semibold text-[var(--ql-text-primary)]">
                {formatCurrency(totalCard)}
              </strong>
            </span>
            {totalFiados > 0 && (
              <span>
                Fiados{' '}
                <strong className="font-semibold text-[var(--ql-text-primary)]">
                  {formatCurrency(totalFiados)}
                </strong>
              </span>
            )}
          </div>
        </SurfaceCard>

        {/* Grid 2×2 Compacto en Móvil / 4 cols en Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <KpiTile
            compact
            label="Efectivo Esperado"
            money={expectedCash}
            tone="sage"
            icon={<Banknote className="w-4 h-4" strokeWidth={1.75} />}
            sublabel={
              `Ventas ${formatCurrency(salesCash)}` +
              (tabPaymentsCash > 0 ? ` + Abonos ${formatCurrency(tabPaymentsCash)}` : '') +
              (donativosCash > 0 ? ` + Don. ${formatCurrency(donativosCash)}` : '')
            }
          />

          <KpiTile
            compact
            label="Datáfono Total"
            money={totalCard}
            tone="slate"
            icon={<CreditCard className="w-4 h-4" strokeWidth={1.75} />}
            sublabel={
              `Ventas ${formatCurrency(salesCard)}` +
              (tabPaymentsCard > 0 ? ` + Abonos ${formatCurrency(tabPaymentsCard)}` : '') +
              (donativosCard > 0 ? ` + Don. ${formatCurrency(donativosCard)}` : '')
            }
          />

          <KpiTile
            compact
            label="Nuevos Fiados"
            money={totalFiados}
            tone="amber"
            icon={<BookOpen className="w-4 h-4" strokeWidth={1.75} />}
            sublabel={
              prepaidTabsUsed > 0
                ? `${formatCurrency(totalFiadosGross)} − Saldos ${formatCurrency(prepaidTabsUsed)}`
                : `Neto en cuenta ${formatCurrency(totalFiados)}`
            }
          />

          <KpiTile
            compact
            label="Donativos"
            money={totalDonativos}
            tone="plum"
            icon={<Heart className="w-4 h-4" strokeWidth={1.75} />}
            sublabel={
              `Efectivo ${formatCurrency(donativosCash)}` +
              (donativosCard > 0 ? ` + Tarj. ${formatCurrency(donativosCard)}` : '')
            }
          />
        </div>

        {/* Fila operativa discreta: Cafés Servidos y métricas secundarias */}
        <SurfaceCard
          variant="elevated"
          padding="none"
          radius="lg"
          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-[var(--ql-text-secondary)]">
                Cafés Servidos
              </span>
              <span className="text-base sm:text-lg font-semibold ql-num text-[var(--ql-text-primary)]">
                {formatInteger(totalCoffees)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ql-text-secondary)] ql-num">
            <span>
              Importe cafés:{' '}
              <strong className="font-semibold text-[var(--ql-text-primary)]">
                {formatCurrency(totalCafes)}
              </strong>
            </span>
            {totalConsumo > 0 && (
              <span>
                Consumo interno:{' '}
                <strong className="font-semibold text-[var(--ql-text-primary)]">
                  {formatCurrency(totalConsumo)}
                </strong>
              </span>
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* Separación Contable + Resumen de Artículos (Antes de Confirmar Cierre) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Separación Contable */}
        <SurfaceCard
          padding="md"
          radius="xl"
          className="lg:col-span-5 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2 mb-3 text-[var(--ql-text-primary)]">
              <Coffee className="w-4 h-4 text-[var(--ql-text-secondary)]" />
              Separación Contable del Turno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block text-[var(--ql-text-primary)]">
                      Total Cafés
                    </span>
                    <span className="text-[11px] text-[var(--ql-text-secondary)] block ql-num">
                      Categoría Cafés ({formatInteger(totalCoffees)} uds.)
                    </span>
                  </div>
                </div>
                <span className="text-base sm:text-lg font-semibold ql-num text-[var(--ql-text-primary)] shrink-0">
                  {formatCurrency(totalCafes)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block text-[var(--ql-text-primary)]">
                      Resto de Cafetería
                    </span>
                    <span className="text-[11px] text-[var(--ql-text-secondary)] block">
                      Bebidas, snacks y otros artículos
                    </span>
                  </div>
                </div>
                <span className="text-base sm:text-lg font-semibold ql-num text-[var(--ql-text-primary)] shrink-0">
                  {formatCurrency(totalRestoCafeteria)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ql-bg-card)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block text-[var(--ql-text-primary)]">
                      Abonos Recibidos
                    </span>
                    <span className="text-[11px] text-[var(--ql-text-secondary)] block ql-num">
                      Efectivo {formatCurrency(tabPaymentsCash)} · Datáfono {formatCurrency(tabPaymentsCard)}
                    </span>
                  </div>
                </div>
                <span className="text-base sm:text-lg font-semibold ql-num text-[var(--ql-text-primary)] shrink-0">
                  {formatCurrency(totalTabPayments)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--ql-text-muted)] mt-4 pt-3 border-t border-[var(--ql-hairline)]">
            Desglose automático sobre las ventas activas y abonos recibidos del turno.
          </p>
        </SurfaceCard>

        {/* Resumen de Artículos para Cuadre de Stock Físico */}
        <SurfaceCard
          padding="md"
          radius="xl"
          className="lg:col-span-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-[var(--ql-text-primary)]">
                <PackageCheck className="w-4 h-4 text-[var(--ql-text-secondary)]" />
                Resumen de Artículos
              </h3>
              <span className="text-xs font-medium ql-num text-[var(--ql-text-secondary)]">
                {formatInteger(totalUnitsSold)} unidades vendidas
              </span>
            </div>

            {soldItemsSummary.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-[var(--ql-hairline-strong)] text-xs text-[var(--ql-text-muted)]">
                No hay artículos detallados registrados en el turno actual.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {soldItemsSummary.map((item) => (
                  <div
                    key={`${item.name}-${item.category || ''}`}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[var(--ql-text-primary)] whitespace-normal break-words">
                        <span className="ql-num font-semibold">{formatInteger(item.quantity)} ×</span>{' '}
                        {item.name}
                      </p>
                      {item.category && (
                        <span className="text-[11px] capitalize text-[var(--ql-text-muted)]">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold ql-num text-[var(--ql-text-primary)] shrink-0">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--ql-text-muted)] mt-4 pt-3 border-t border-[var(--ql-hairline)]">
            Resumen consolidado para facilitar el cuadre de inventario físico gastado.
          </p>
        </SurfaceCard>
      </div>

      {/* Arqueo + Incidencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
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
                toast.success(`Cierre de caja completado. Estado reiniciado a ${formatCurrency(0)}`);
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
        <SurfaceCard padding="md" radius="xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--ql-text-primary)]">
              <Clock className="w-4 h-4 text-[var(--ql-text-secondary)]" />
              Cierres Recientes
            </h3>
            <span className="text-xs font-medium ql-num text-[var(--ql-text-muted)]">
              {formatInteger(shiftCloses.length)} registros
            </span>
          </div>
          <div className="space-y-2">
            {shiftCloses.slice(0, 6).map((close, idx) => (
              <div
                key={close.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-[var(--ql-text-primary)]">
                    {new Date(close.timestamp).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {close.closedBy}
                  </div>
                  <div className="ql-num text-[var(--ql-text-secondary)]">
                    Esperado: {formatCurrency(close.expectedCash)} · Contado:{' '}
                    {formatCurrency(close.actualCash)} · Datáfono:{' '}
                    {formatCurrency(close.totalCard)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canSendHistoricalToSheets && (
                    <Button
                      variant="ghost"
                      size="xs"
                      title="Enviar a Google Sheets"
                      aria-label="Enviar cierre a Google Sheets"
                      disabled={sendingCloseoutIds.includes(close.id)}
                      isLoading={sendingCloseoutIds.includes(close.id)}
                      icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                      onClick={() => handleSendHistoricalToSheets(close, idx)}
                    >
                      <span className="hidden sm:inline">Enviar a Sheets</span>
                    </Button>
                  )}
                  <Button
                    variant="subtle"
                    size="xs"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedHistoricalIndex(idx);
                      setPdfModalOpen(true);
                    }}
                  >
                    Ver Ticket
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
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
                  { label: 'Efectivo Esperado', value: formatCurrency(selectedHistoricalClose.expectedCash) },
                  { label: 'Datáfono Total', value: formatCurrency(selectedHistoricalClose.totalCard) },
                  { label: 'Nuevos Fiados', value: formatCurrency(historicalFiadosNet) },
                  { label: 'Donativos', value: formatCurrency(selectedHistoricalClose.totalDonativos) },
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
                  { label: 'Efectivo Esperado', value: formatCurrency(expectedCash) },
                  { label: 'Datáfono Total', value: formatCurrency(totalCard) },
                  { label: 'Nuevos Fiados', value: formatCurrency(totalFiados) },
                  { label: 'Donativos', value: formatCurrency(totalDonativos) },
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
