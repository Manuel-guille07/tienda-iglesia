import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Calculator, FileSpreadsheet, Download, Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentModal } from './IncidentModal';
import { IncidentListPanel } from './IncidentListPanel';
import { CashArqueoPanel } from './CashArqueoPanel';
import { PrintableReportModal } from '../common/PrintableReportModal';
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

  // Obtener cobros y abonos de fiados
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

  // 1. Obtener la fecha más reciente del último cierre registrado en Supabase / Estado global
  const lastClose = shiftCloses[0];
  const latestCloseMs = Math.max(
    lastClose?.timestamp ? new Date(lastClose.timestamp).getTime() : 0,
    lastCloseTimestamp ? new Date(lastCloseTimestamp).getTime() : 0
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 2. Caja Única Compartida: Suma TODAS las ventas posteriores al último cierre (sin filtrar por vendedor)
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

  // Resumen de vendedores que han cobrado en esta Caja Única durante el turno activo
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

  // Ventas globales del turno actual (todos los vendedores)
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

  // TOTALES ESPERADOS EN LA CAJA FÍSICA COMPARTIDA
  const expectedCash = Number((salesCash + tabPaymentsCash).toFixed(2));
  const totalCard = Number((salesCard + tabPaymentsCard).toFixed(2));
  const totalFiados = Number(shiftSales.filter((s) => s.paymentMethod === 'fiado').reduce((a, s) => a + s.total, 0).toFixed(2));
  const totalDonativos = Number(shiftSales.filter((s) => s.paymentMethod === 'donativo').reduce((a, s) => a + s.total, 0).toFixed(2));
  const totalConsumo = Number(shiftSales.filter((s) => s.paymentMethod === 'consumo_interno').reduce((a, s) => a + s.total, 0).toFixed(2));

  const totalCoffees = shiftSales.reduce((a, s) => {
    return a + (s.items || []).filter((it) => it.product?.category === 'cafeteria').reduce((sum, it) => sum + it.quantity, 0);
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            {t('closeout.title')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('closeout.sharedDrawer')} · Arqueo ejecutado por:{' '}
            <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4 text-emerald-400" />}
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
            icon={<Printer className="w-4 h-4 text-indigo-400" />}
            onClick={() => {
              setPdfModalOpen(true);
              toast.success(t('export.pdfReady'));
            }}
          >
            {t('export.pdfButton')}
          </Button>
          <Button
            variant="primary"
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

      {/* Información de Vendedores en la Caja Única Compartida */}
      {sellersInShift.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium">
            {t('closeout.sellersInShift')} ({shiftSales.length} tickets globales):
          </span>
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            {sellersInShift.map(([seller, info]) => (
              <span key={seller} className="text-slate-200">
                <strong className="text-indigo-300 font-sans">{seller}</strong>: {info.count} vta ({info.total.toFixed(2)}€)
              </span>
            ))}
          </div>
        </div>
      )}

      {shiftVoidAudits.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-2xl flex items-center justify-between text-xs text-rose-300">
          <span className="font-semibold text-rose-200">
            Auditoría de Turno: {shiftVoidAudits.length} venta(s) anulada(s) con stock devuelto
          </span>
          <span className="font-mono font-bold text-rose-400">-{voidedTotal.toFixed(2)}€</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-xs text-slate-400 block">Efectivo Total</span>
          <span className="text-xl font-black text-emerald-400">{expectedCash.toFixed(2)}€</span>
          {tabPaymentsCash > 0 && (
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              Ventas: {salesCash.toFixed(2)}€ | Abonos: +{tabPaymentsCash.toFixed(2)}€
            </span>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-xs text-slate-400 block">Datáfono Total</span>
          <span className="text-xl font-black text-sky-400">{totalCard.toFixed(2)}€</span>
          {tabPaymentsCard > 0 && (
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              Ventas: {salesCard.toFixed(2)}€ | Abonos: +{tabPaymentsCard.toFixed(2)}€
            </span>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-xs text-slate-400 block">Nuevos Fiados</span>
          <span className="text-xl font-black text-amber-400">{totalFiados.toFixed(2)}€</span>
          {(tabPaymentsCash + tabPaymentsCard) > 0 && (
            <span className="text-[10px] text-emerald-400 block mt-0.5 truncate">
              Cobrados: {(tabPaymentsCash + tabPaymentsCard).toFixed(2)}€
            </span>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-xs text-slate-400 block">Donativos</span>
          <span className="text-xl font-black text-pink-400">{totalDonativos.toFixed(2)}€</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400 block">Cafés</span>
          <span className="text-xl font-black text-amber-300">{totalCoffees}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
