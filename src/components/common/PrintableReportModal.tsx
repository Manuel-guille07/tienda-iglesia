import React from 'react';
import { Sale, ShiftClose, SoldItemSummary, VoidAuditRecord } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import {
  calculateShiftTabBreakdown,
  TabPaymentExport,
  useCloseoutStore,
} from '../../store/useCloseoutStore';
import { fromCents, toCents } from '../../utils/finance';
import {
  Printer,
  Download,
  FileText,
  Coffee,
  ShoppingBag,
  PackageCheck,
  Banknote,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface PrintableReportData {
  title: string;
  subtitle: string;
  generatedBy: string;
  generatedRole: string;
  periodLabel: string;
  kpis: { label: string; value: string; accent?: string }[];
  sales: Sale[];
  tabPayments?: TabPaymentExport[];
  shiftClose?: Partial<ShiftClose>;
  voidAudits?: VoidAuditRecord[];
}

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PrintableReportData | null;
}

export function isCoffeeCategory(category?: string): boolean {
  if (!category) return false;
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return normalized === 'cafes' || normalized === 'cafe';
}

export function calculateSalesAccountingBreakdown(sales: Sale[]): {
  totalCafes: number;
  totalRestoCafeteria: number;
  totalCoffeesQty: number;
  soldItemsSummary: SoldItemSummary[];
} {
  let totalCafes = 0;
  let totalRestoCafeteria = 0;
  let totalCoffeesQty = 0;
  const itemMap = new Map<string, SoldItemSummary>();

  for (const sale of sales) {
    const items = sale.items || [];
    const isRevenueSale =
      sale.paymentMethod !== 'consumo_interno' && sale.paymentMethod !== 'donativo';

    if (items.length > 0) {
      let saleItemsRevenue = 0;

      for (const it of items) {
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) continue;

        const unitPrice = Number(it.customPrice ?? it.product?.price ?? 0);
        const lineRevenue = unitPrice * qty;
        const category = it.product?.category || 'cafeteria';
        const name = it.product?.name || 'Producto';
        const key = (it.product?.id || name).toLowerCase();

        const isCoffee = isCoffeeCategory(category);
        if (isCoffee) {
          totalCoffeesQty += qty;
        }

        if (isRevenueSale) {
          if (isCoffee) {
            totalCafes += lineRevenue;
          } else {
            totalRestoCafeteria += lineRevenue;
          }
          saleItemsRevenue += lineRevenue;
        }

        const prev = itemMap.get(key);
        if (prev) {
          prev.quantity += qty;
          prev.revenue += isRevenueSale ? lineRevenue : 0;
        } else {
          itemMap.set(key, {
            name,
            quantity: qty,
            revenue: isRevenueSale ? lineRevenue : 0,
            category,
          });
        }
      }

      if (isRevenueSale) {
        const diff = (Number(sale.total) || 0) - saleItemsRevenue;
        if (Math.abs(diff) > 0.005) {
          totalRestoCafeteria += diff;
        }
      }
    } else if (isRevenueSale) {
      totalRestoCafeteria += Number(sale.total) || 0;
    }
  }

  const soldItemsSummary = Array.from(itemMap.values()).sort(
    (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)
  );

  return {
    totalCafes: Number(totalCafes.toFixed(2)),
    totalRestoCafeteria: Number(totalRestoCafeteria.toFixed(2)),
    totalCoffeesQty,
    soldItemsSummary,
  };
}

/**
 * Descarga un archivo CSV con BOM UTF-8 compatible directamente con Microsoft Excel
 */
export function downloadAccountingCSV(filename: string, rows: (string | number)[][]) {
  const csvContent = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
    )
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta el listado de ventas, separación contable, resumen de artículos y auditorías a CSV/Excel
 */
export function exportSalesHistoryToCSV(
  sales: Sale[],
  voidAudits: VoidAuditRecord[] = [],
  periodLabel = 'General',
  tabPayments: TabPaymentExport[] = []
) {
  const dateStr = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
  const filename = `elarx-reporte-contable-${dateStr}.csv`;

  const totalAmount = fromCents(
    sales
      .filter((s) => s.paymentMethod !== 'consumo_interno' && s.paymentMethod !== 'donativo')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0)
  );
  const salesCash = fromCents(
    sales
      .filter((s) => s.paymentMethod === 'efectivo')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0)
  );
  const salesCard = fromCents(
    sales
      .filter((s) => s.paymentMethod === 'datafono')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0)
  );

  const tabPaymentsCash = fromCents(
    tabPayments
      .filter((p) => p.paymentMethod === 'efectivo')
      .reduce((acc, p) => acc + toCents(p.amount || 0), 0)
  );
  const tabPaymentsCard = fromCents(
    tabPayments
      .filter((p) => p.paymentMethod === 'datafono')
      .reduce((acc, p) => acc + toCents(p.amount || 0), 0)
  );
  const totalTabPayments = fromCents(toCents(tabPaymentsCash) + toCents(tabPaymentsCard));

  const totalCash = fromCents(toCents(salesCash) + toCents(tabPaymentsCash));
  const totalCard = fromCents(toCents(salesCard) + toCents(tabPaymentsCard));

  const { netFiados: totalTabs, prepaidUsed: totalPrepaidTabsUsed } =
    calculateShiftTabBreakdown(sales, useCloseoutStore.getState().tabCredits);
  const totalDonations = fromCents(
    sales
      .filter((s) => s.paymentMethod === 'donativo')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0)
  );

  const { totalCafes, totalRestoCafeteria, soldItemsSummary } =
    calculateSalesAccountingBreakdown(sales);

  const rows: (string | number)[][] = [
    ['ELARX POS - REPORTE CONTABLE DE VENTAS Y AUDITORÍA'],
    ['Fecha de Emisión', new Date().toLocaleString('es-ES')],
    ['Periodo / Filtro', periodLabel],
    [''],
    ['RESUMEN EJECUTIVO', 'IMPORTE (€)'],
    ['Total Ventas Cafetería (Sin Donativos)', totalAmount.toFixed(2)],
    ['Total Cafés', totalCafes.toFixed(2)],
    ['Total Resto de Cafetería', totalRestoCafeteria.toFixed(2)],
    ['Abonos Recibidos (Deudas previas)', totalTabPayments.toFixed(2)],
    ['Ventas de Hoy en Efectivo', salesCash.toFixed(2)],
    ['Abonos Recibidos (Deudas previas) - Efectivo', tabPaymentsCash.toFixed(2)],
    ['Total Efectivo Esperado', totalCash.toFixed(2)],
    ['Ventas de Hoy por Datáfono / Tarjeta', salesCard.toFixed(2)],
    ['Abonos Recibidos (Deudas previas) - Datáfono', tabPaymentsCard.toFixed(2)],
    ['Total Datáfono / Tarjeta', totalCard.toFixed(2)],
    ['Total Fiados (Deuda Neta Nueva)', totalTabs.toFixed(2)],
    ...(totalPrepaidTabsUsed > 0
      ? [['Saldo a Favor Consumido en Fiados', totalPrepaidTabsUsed.toFixed(2)]]
      : []),
    ['Total Donativos', totalDonations.toFixed(2)],
    ['Total Ingresos en Caja (Ventas + Abonos)', fromCents(toCents(totalAmount) + toCents(totalTabPayments)).toFixed(2)],
    ['Número de Tickets', sales.length],
    [''],
  ];

  if (tabPayments.length > 0) {
    rows.push(
      ['DETALLE DE ABONOS RECIBIDOS (DEUDAS PREVIAS)'],
      ['Fecha y Hora', 'Cliente', 'Método de Pago', 'Importe (€)', 'Descripción'],
      ...tabPayments.map((p) => [
        new Date(p.timestamp).toLocaleString('es-ES'),
        p.customerName,
        p.paymentMethod === 'datafono' ? 'DATÁFONO' : 'EFECTIVO',
        p.amount.toFixed(2),
        p.description || 'Abono de deuda pendiente',
      ]),
      ['']
    );
  }

  if (soldItemsSummary.length > 0) {
    rows.push(
      ['RESUMEN DE ARTÍCULOS VENDIDOS', 'CANTIDAD', 'SUBTOTAL (€)'],
      ...soldItemsSummary.map((item) => [
        item.name,
        item.quantity,
        item.revenue.toFixed(2),
      ]),
      ['']
    );
  }

  rows.push(
    ['DETALLE DE TRANSACCIONES'],
    ['ID Ticket', 'Fecha y Hora', 'Método de Pago', 'Vendedor', 'Rol', 'Cliente', 'Productos', 'Total (€)'],
    ...sales.map((s) => [
      s.id,
      new Date(s.timestamp).toLocaleString('es-ES'),
      s.paymentMethod.toUpperCase(),
      s.sellerName || 'Vendedor',
      s.sellerRole || 'Vendedor',
      s.customerName || '-',
      (s.items || []).map((it) => `${it.quantity}x ${it.product?.name || 'Producto'}`).join(' | ') || 'Venta directa POS',
      (s.total || 0).toFixed(2),
    ])
  );

  if (voidAudits.length > 0) {
    rows.push(
      [''],
      ['AUDITORÍA DE ANULACIONES'],
      ['ID Ticket', 'Fecha Anulación', 'Anulado Por', 'Rol', 'Motivo', 'Importe Revertido (€)'],
      ...voidAudits.map((a) => [
        a.saleId,
        new Date(a.timestamp).toLocaleString('es-ES'),
        a.voidedBy,
        a.voidedByRole,
        a.reason,
        a.returnedAmount.toFixed(2),
      ])
    );
  }

  downloadAccountingCSV(filename, rows);
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen || !report) return null;

  const computed = calculateSalesAccountingBreakdown(report.sales);
  const hasComputedSalesItems = computed.soldItemsSummary.length > 0;

  const totalCafes =
    hasComputedSalesItems || report.shiftClose?.totalCafes === undefined
      ? computed.totalCafes
      : report.shiftClose.totalCafes;

  const totalRestoCafeteria =
    hasComputedSalesItems || report.shiftClose?.totalRestoCafeteria === undefined
      ? computed.totalRestoCafeteria
      : report.shiftClose.totalRestoCafeteria;

  const soldItemsSummary =
    computed.soldItemsSummary.length > 0
      ? computed.soldItemsSummary
      : report.shiftClose?.soldItemsSummary || [];

  const tabPaymentsList = report.tabPayments || [];
  const tabPaymentsCash =
    report.shiftClose?.tabPaymentsCash !== undefined
      ? report.shiftClose.tabPaymentsCash
      : fromCents(
          tabPaymentsList
            .filter((p) => p.paymentMethod === 'efectivo')
            .reduce((acc, p) => acc + toCents(p.amount || 0), 0)
        );
  const tabPaymentsCard =
    report.shiftClose?.tabPaymentsCard !== undefined
      ? report.shiftClose.tabPaymentsCard
      : fromCents(
          tabPaymentsList
            .filter((p) => p.paymentMethod === 'datafono')
            .reduce((acc, p) => acc + toCents(p.amount || 0), 0)
        );
  const totalTabPayments =
    report.shiftClose?.totalTabPayments !== undefined
      ? report.shiftClose.totalTabPayments
      : fromCents(toCents(tabPaymentsCash) + toCents(tabPaymentsCard));

  const handlePrint = () => {
    toast.success('Abriendo diálogo de impresión / Guardar como PDF');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vista Imprimible Contable (PDF) - ELARX POS">
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border p-3 rounded-2xl print:hidden ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
          }`}
        >
          <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-[#C2B8AD]' : 'text-[#141210]'}`}>
            <FileText className="w-4 h-4 shrink-0" />
            <span>Documento formateado para guardar como PDF o imprimir en A4.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => {
                exportSalesHistoryToCSV(
                  report.sales,
                  report.voidAudits || [],
                  report.periodLabel,
                  report.tabPayments || []
                );
                toast.success('Reporte descargado en formato CSV / Excel');
              }}
            >
              CSV / Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div
          id="elarx-printable-sheet"
          className="bg-white text-[#141210] rounded-2xl p-5 sm:p-6 border border-[#E2DDD5] shadow-inner max-h-[68vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:border-0"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#141210]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#141210] text-white font-black text-xs tracking-wider rounded">
                  ELARX POS
                </span>
                <span className="text-xs font-semibold text-[#3D352F] uppercase tracking-wider">
                  Reporte Oficial de Contabilidad y Tesorería
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#141210] mt-1">{report.title}</h2>
              <p className="text-xs text-[#3D352F]">{report.subtitle}</p>
            </div>
            <div className="text-left sm:text-right text-xs text-[#141210] space-y-0.5 font-mono tabular-nums">
              <div>
                <strong>Fecha:</strong> {new Date().toLocaleString('es-ES')}
              </div>
              <div>
                <strong>Responsable:</strong> {report.generatedBy} ({report.generatedRole})
              </div>
              <div>
                <strong>Periodo:</strong> {report.periodLabel}
              </div>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
            {report.kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="border border-[#E2DDD5] rounded-xl p-2.5 bg-[#FAF8F5]"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3D352F] block">
                  {kpi.label}
                </span>
                <span className="text-base font-bold text-[#141210] font-mono tabular-nums mt-0.5 block">
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          {/* Separación Contable: Total Cafés vs Total Resto de Cafetería vs Abonos Recibidos */}
          <div className="mb-4 border border-[#E2DDD5] rounded-xl p-3 bg-[#FAF8F5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#141210] mb-2">
              Separación Contable por Categoría
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#141210]">
                  <Coffee className="w-3.5 h-3.5 text-[#3D352F]" />
                  Total Cafés
                </span>
                <strong className="text-sm font-mono tabular-nums text-[#141210]">
                  {totalCafes.toFixed(2)} €
                </strong>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#141210]">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#3D352F]" />
                  Total Resto de Cafetería
                </span>
                <strong className="text-sm font-mono tabular-nums text-[#141210]">
                  {totalRestoCafeteria.toFixed(2)} €
                </strong>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#141210]">
                  <Banknote className="w-3.5 h-3.5 text-[#3D352F]" />
                  Abonos Recibidos (Deudas previas)
                </span>
                <strong className="text-sm font-mono tabular-nums text-[#141210]">
                  {totalTabPayments.toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {/* Optional Shift Arqueo Breakdown */}
          {report.shiftClose && (
            <div className="mb-4 border border-[#E2DDD5] rounded-xl p-3 bg-[#FAF8F5]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#141210] mb-2">
                Arqueo de Caja del Turno
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[#3D352F] block">Efectivo Esperado:</span>
                  <strong>{(report.shiftClose.expectedCash ?? 0).toFixed(2)}€</strong>
                </div>
                <div>
                  <span className="text-[#3D352F] block">Efectivo Contado:</span>
                  <strong>{(report.shiftClose.actualCash ?? 0).toFixed(2)}€</strong>
                </div>
                <div>
                  <span className="text-[#3D352F] block">Descuadre:</span>
                  <strong
                    className={
                      (report.shiftClose.difference ?? 0) < 0
                        ? 'text-rose-700'
                        : 'text-emerald-800'
                    }
                  >
                    {(report.shiftClose.difference ?? 0).toFixed(2)}€
                  </strong>
                </div>
                <div>
                  <span className="text-[#3D352F] block">Total Datáfono:</span>
                  <strong>{(report.shiftClose.totalCard ?? 0).toFixed(2)}€</strong>
                </div>
              </div>
            </div>
          )}

          {/* Resumen de Artículos (Cuadre físico de inventario) */}
          <div className="mb-4 border border-[#E2DDD5] rounded-xl p-3 bg-[#FAF8F5]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#141210] flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5" />
                Resumen de Artículos
              </h3>
              <span className="text-[11px] font-mono text-[#3D352F]">
                {soldItemsSummary.reduce((acc, it) => acc + it.quantity, 0)} uds. totales
              </span>
            </div>

            {soldItemsSummary.length === 0 ? (
              <p className="text-xs text-[#3D352F] italic">
                Sin desglose de artículos individuales disponible en este ticket o periodo.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {soldItemsSummary.map((item) => (
                  <div
                    key={`${item.name}-${item.category || ''}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#E2DDD5] bg-white"
                  >
                    <span className="font-semibold text-[#141210] truncate pr-2">
                      <span className="font-mono font-bold">{item.quantity} ×</span> {item.name}
                    </span>
                    <span className="font-mono tabular-nums text-[#3D352F] shrink-0">
                      {item.revenue.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales Table */}
          <div className="mt-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#141210] mb-2">
              Desglose de Operaciones ({report.sales.length})
            </h3>
            {report.sales.length === 0 ? (
              <p className="text-xs text-[#3D352F] italic py-4 text-center border border-dashed border-[#E2DDD5] rounded-lg">
                Sin transacciones registradas en este periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#141210]/20 text-[#141210] bg-[#EFECE6]">
                      <th className="py-2 px-2 font-semibold">Ticket</th>
                      <th className="py-2 px-2 font-semibold">Fecha/Hora</th>
                      <th className="py-2 px-2 font-semibold">Método</th>
                      <th className="py-2 px-2 font-semibold">Vendedor</th>
                      <th className="py-2 px-2 font-semibold text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5] font-mono tabular-nums">
                    {report.sales.slice(0, 50).map((s) => (
                      <tr key={s.id}>
                        <td className="py-1.5 px-2 text-[#141210]">#{s.id.slice(0, 8)}</td>
                        <td className="py-1.5 px-2 text-[#3D352F]">
                          {new Date(s.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-1.5 px-2 uppercase text-[#141210]">{s.paymentMethod}</td>
                        <td className="py-1.5 px-2 font-sans text-[#141210]">{s.sellerName}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-[#141210]">
                          {s.total.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Signature Footer */}
          <div className="mt-6 pt-4 border-t border-[#E2DDD5] flex items-center justify-between text-[11px] text-[#3D352F]">
            <span>Generado por ELARX POS v1.2 Core</span>
            <span>Firma Tesorería / Supervisión: ______________________</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
