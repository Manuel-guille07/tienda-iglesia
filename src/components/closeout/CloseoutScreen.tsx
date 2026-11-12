import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
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
} from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentModal } from './IncidentModal';
import { IncidentListPanel } from './IncidentListPanel';
import { CashArqueoPanel } from './CashArqueoPanel';
import { PrintableReportModal } from '../common/PrintableReportModal';
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
    addIncident,
    recordShiftClose,
    exportToGoogleSheets,
    downloadCSV,
    isSyncingSheets,
  } = useCloseoutStore();

  const [counted, setCounted] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);

  const allTabPayments = customers.flatMap((c) =>
    (c.movements || [])
      .filter((m) => m.type === 'pago')
      .map((m) => ({
        customerName: c.name,
        amount: m.amount,
        paymentMethod: (m.paymentMethod || 'efectivo') as 'efectivo' | 'datafono',
        timestamp: m.timestamp,
        description: m.description,
      }))
  );

  const lastClose = shiftCloses[0];
  const latestCloseMs = Math.max(
    lastClose?.timestamp ? new Date(lastClose.timestamp).getTime() : 0,
    lastCloseTimestamp ? new Date(lastCloseTimestamp).getTime() : 0
  );

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

  const shiftSales = sales.filter((s) => isAfterLastCloseout(s.timestamp));
  const shiftTabPayments = allTabPayments.filter((p) => isAfterLastCloseout(p.timestamp));

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

  const salesCash = Number(
    shiftSales.filter((s) => s.paymentMethod === 'efectivo').reduce((a, s) => a + s.total, 0).toFixed(2)
  );
  const salesCard = Number(
    shiftSales.filter((s) => s.paymentMethod === 'datafono').reduce((a, s) => a + s.total, 0).toFixed(2)
  );

  const tabPaymentsCash = Number(
    shiftTabPayments
      .filter((p) => p.paymentMethod === 'efectivo')
      .reduce((sum, p) => sum + p.amount, 0)
      .toFixed(2)
  );

  const tabPaymentsCard = Number(
    shiftTabPayments
      .filter((p) => p.paymentMethod === 'datafono')
      .reduce((sum, p) => sum + p.amount, 0)
      .toFixed(2)
  );

  const expectedCash = Number((salesCash + tabPaymentsCash).toFixed(2));
  const totalCard = Number((salesCard + tabPaymentsCard).toFixed(2));
  const totalFiados = Number(
    shiftSales.filter((s) => s.paymentMethod === 'fiado').reduce((a, s) => a + s.total, 0).toFixed(2)
  );
  const totalDonativos = Number(
    shiftSales.filter((s) => s.paymentMethod === 'donativo').reduce((a, s) => a + s.total, 0).toFixed(2)
  );
  const totalConsumo = Number(
    shiftSales.filter((s) => s.paymentMethod === 'consumo_interno').reduce((a, s) => a + s.total, 0).toFixed(2)
  );

  const totalCoffees = shiftSales.reduce((a, s) => {
    return (
      a +
      (s.items || [])
        .filter((it) => it.product?.category === 'cafeteria')
        .reduce((sum, it) => sum + it.quantity, 0)
    );
  }, 0);

  const difference = Number((counted - expectedCash).toFixed(2));

  const getShift = () => ({
    closedBy: currentUser?.name || 'Turno',
    role: currentUser?.role || 'Vendedor',
    expectedCash,
    actualCash: counted,
    totalCard,
    totalFiados,
    totalDonativos,
    totalConsumoInterno: totalConsumo,
    totalCoffeesSold: totalCoffees,
    totalSalesCount: shiftSales.length,
    totalRevenue: Number((expectedCash + totalCard + totalDonativos).toFixed(2)),
    difference,
    incidents,
    salesCash,
    tabPaymentsCash,
    salesCard,
    tabPaymentsCard,
  });

  const shiftVoidAudits = voidAudits.filter((a) => isAfterLastCloseout(a.timestamp));
  const voidedTotal = shiftVoidAudits.reduce((acc, a) => acc + (a.returnedAmount || 0), 0);

  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6" />
            {t('closeout.title')}
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
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
              const s = recordShiftClose(getShift());
              downloadCSV(s, shiftSales, shiftTabPayments);
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
              setPdfModalOpen(true);
              toast.success(t('export.pdfReady'));
            }}
          >
            {t('export.pdfButton')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isSyncingSheets}
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={async () => {
              const s = recordShiftClose(getShift());
              const res = await exportToGoogleSheets(s.id);
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
          <span className={isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}>
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

      {/* Tarjetas KPI de Turno con Color Semántico Sutil Quiet Luxury */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* 1. Efectivo (Cash): Tinte Verde Salvia / Esmeralda */}
        <div
          className={`p-4 rounded-3xl border transition-colors ${
            isDark
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100'
              : 'bg-emerald-500/12 border-emerald-600/25 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-emerald-200' : 'text-emerald-900'
              }`}
            >
              Efectivo Esperado
            </span>
            <Banknote
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-emerald-300' : 'text-emerald-800'
              }`}
            />
          </div>
          <span className="text-2xl font-bold tabular-nums block mt-1.5">
            {expectedCash.toFixed(2)} €
          </span>
          {tabPaymentsCash > 0 && (
            <span
              className={`text-xs block mt-1 truncate ${
                isDark ? 'text-emerald-200/80' : 'text-emerald-900/80'
              }`}
            >
              Vtas: {salesCash.toFixed(2)} € · Abonos: +{tabPaymentsCash.toFixed(2)} €
            </span>
          )}
        </div>

        {/* 2. Datáfono (Card): Tinte Azul Pizarra / Índigo */}
        <div
          className={`p-4 rounded-3xl border transition-colors ${
            isDark
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-100'
              : 'bg-indigo-500/12 border-indigo-600/25 text-indigo-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-indigo-200' : 'text-indigo-900'
              }`}
            >
              Datáfono Total
            </span>
            <CreditCard
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-indigo-300' : 'text-indigo-800'
              }`}
            />
          </div>
          <span className="text-2xl font-bold tabular-nums block mt-1.5">
            {totalCard.toFixed(2)} €
          </span>
        </div>

        {/* 3. Fiado (Tab): Tinte Ámbar / Naranja quemado */}
        <div
          className={`p-4 rounded-3xl border transition-colors ${
            isDark
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-100'
              : 'bg-amber-500/12 border-amber-600/25 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-amber-200' : 'text-amber-900'
              }`}
            >
              Nuevos Fiados
            </span>
            <BookOpen
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-amber-300' : 'text-amber-800'
              }`}
            />
          </div>
          <span className="text-2xl font-bold tabular-nums block mt-1.5">
            {totalFiados.toFixed(2)} €
          </span>
        </div>

        {/* 4. Donativo: Tinte Malva / Púrpura */}
        <div
          className={`p-4 rounded-3xl border transition-colors ${
            isDark
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-100'
              : 'bg-purple-500/12 border-purple-600/25 text-purple-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-purple-200' : 'text-purple-900'
              }`}
            >
              Donativos
            </span>
            <Heart
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-purple-300' : 'text-purple-800'
              }`}
            />
          </div>
          <span className="text-2xl font-bold tabular-nums block mt-1.5">
            {totalDonativos.toFixed(2)} €
          </span>
        </div>

        {/* 5. Métrica Neutra (Cafés Servidos): Tinte Neutral Quiet Luxury (Piedra / Espresso) */}
        <div
          className={`p-4 rounded-3xl border col-span-2 sm:col-span-1 transition-colors ${cardSurface}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            >
              Cafés Servidos
            </span>
            <Coffee
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
              }`}
            />
          </div>
          <span className="text-2xl font-bold tabular-nums block mt-1.5">
            {totalCoffees}
          </span>
        </div>
      </div>

      {/* Arqueo + Incidencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashArqueoPanel
          expectedCash={expectedCash}
          salesCash={salesCash}
          tabPaymentsCash={tabPaymentsCash}
          counted={counted}
          onCountedChange={setCounted}
          difference={difference}
          isSubmitting={isClosingShift}
          onConfirmClose={() => {
            if (isClosingShift) return;
            if (!Number.isFinite(counted) || isNaN(counted) || counted < 0) {
              toast.error('Introduce un monto de efectivo contado válido mayor o igual a 0');
              return;
            }
            setIsClosingShift(true);
            try {
              recordShiftClose(getShift());
              setCounted(0);
              usePOSStore.setState({ cart: [] });
              toast.success('Cierre de caja completado. Estado de caja reiniciado a 0.00€');
            } finally {
              setIsClosingShift(false);
            }
          }}
        />
        <IncidentListPanel incidents={incidents} onOpenNew={() => setModalOpen(true)} />
      </div>

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
        onClose={() => setPdfModalOpen(false)}
        report={{
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
          shiftClose: getShift(),
          voidAudits: shiftVoidAudits,
        }}
      />
    </div>
  );
};
