import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useTabStore } from '../../store/useTabStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Calculator, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentModal } from './IncidentModal';
import { IncidentListPanel } from './IncidentListPanel';
import { CashArqueoPanel } from './CashArqueoPanel';
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

  const isTesoreriaOrPastor = currentUser?.role === 'Tesorería' || currentUser?.role === 'Pastor';

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

  // 1. Obtener fecha del último cierre registrado (ordenado por created_at desc)
  const lastClose = shiftCloses[0];
  const effectiveCloseTs = lastClose?.timestamp || lastCloseTimestamp;
  const lastCloseDate = effectiveCloseTs ? new Date(effectiveCloseTs) : null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 2. Filtro estricto: solo ventas con timestamp POSTERIOR al último cierre (o del día de hoy si no hay cierres)
  const isAfterLastCloseout = (isoString?: string) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    if (lastCloseDate && !isNaN(lastCloseDate.getTime())) {
      return d.getTime() > lastCloseDate.getTime();
    }
    return d.getTime() >= startOfDay.getTime();
  };

  const shiftSales = sales.filter((s) => isAfterLastCloseout(s.timestamp));
  const shiftTabPayments = allTabPayments.filter((p) => isAfterLastCloseout(p.timestamp));

  // Ventas del turno actual
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

  // TOTALES ESPERADOS INCLUYENDO ABONOS DE FIADOS DEL TURNO ACTUAL
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
    totalSalesCount: sales.length,
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            {t('closeout.title')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('closeout.subtitle')} • Turno por: <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.role})
          </p>
        </div>
        <div className="flex gap-2">
          {isTesoreriaOrPastor && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                const s = recordShiftClose(getShift());
                downloadCSV(s, sales, shiftTabPayments);
                toast.success('CSV descargado con formato Excel');
              }}
            >
              CSV
            </Button>
          )}
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
          onConfirmClose={() => {
            recordShiftClose(getShift());
            setCounted(0);
            usePOSStore.setState({ cart: [] });
            toast.success('Cierre de caja completado. Estado de caja reiniciado a 0.00€');
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
    </div>
  );
};
