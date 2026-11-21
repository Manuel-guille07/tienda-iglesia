import React from 'react';
import { createPortal } from 'react-dom';
import { Sale, ShiftClose, SoldItemSummary, VoidAuditRecord } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  calculateShiftTabBreakdown,
  TabPaymentExport,
  useCloseoutStore,
} from '../../store/useCloseoutStore';
import { formatCurrency, formatInteger, fromCents, toCents } from '../../utils/finance';
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

        const unitPrice = Number(it.price ?? it.customPrice ?? it.product?.price ?? 0);
        const lineRevenue = Number(it.subtotal ?? unitPrice * qty);
        const category = it.category || it.product?.category || 'cafeteria';
        const name = it.name || it.product?.name || 'Producto';
        const key = (it.id || it.product?.id || name).toLowerCase();

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
  const filename = `el-chiringuito-reporte-contable-${dateStr}.csv`;

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
    ['EL CHIRINGUITO POS - REPORTE CONTABLE DE VENTAS Y AUDITORÍA'],
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
      (s.items || [])
        .map((it) => {
          const name = it.name || it.product?.name || 'Producto';
          const unitPrice = Number(it.price ?? it.customPrice ?? it.product?.price ?? 0);
          const sub = Number(it.subtotal ?? unitPrice * it.quantity);
          return `${it.quantity} x ${name} - ${sub.toFixed(2)}€`;
        })
        .join(' | ') || 'Venta directa POS',
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

interface PrintableDocumentProps {
  report: PrintableReportData;
  generatedAtLabel: string;
  soldItemsSummary: SoldItemSummary[];
  totalCash: number;
  totalCard: number;
  totalFiados: number;
  totalDonativos: number;
  totalCafes: number;
  totalRestoCafeteria: number;
  totalTabPayments: number;
}

/**
 * Plantilla A4 pura sin position:fixed, sticky, backdrop-blur ni overflow-hidden.
 * Se reutiliza en la vista previa del modal y en el portal aislado #elarx-print-root.
 */
const PrintableReportDocument: React.FC<PrintableDocumentProps> = ({
  report,
  generatedAtLabel,
  soldItemsSummary,
  totalCash,
  totalCard,
  totalFiados,
  totalDonativos,
  totalCafes,
  totalRestoCafeteria,
  totalTabPayments,
}) => {
  const totalSoldUnits = soldItemsSummary.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="bg-white text-[#141210] space-y-4">
      {/* Encabezado limpio A4 */}
      <div className="ql-print-avoid-break flex flex-col sm:flex-row print:flex-row sm:items-start print:items-start justify-between gap-3 pb-3.5 border-b-2 border-[#141210]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#141210] leading-none">
              El Chiringuito
            </h1>
            <span className="text-[10px] font-semibold text-[#3D352F] uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFECE6] border border-[#E2DDD5]">
              Reporte Oficial
            </span>
          </div>
          <div className="text-[11px] text-[#3D352F] flex flex-wrap items-center gap-x-4 gap-y-0.5 ql-num pt-1">
            <span>
              <strong className="text-[#141210]">Fecha:</strong> {generatedAtLabel}
            </span>
            <span>
              <strong className="text-[#141210]">Cajero:</strong> {report.generatedBy} ({report.generatedRole})
            </span>
            <span>
              <strong className="text-[#141210]">Periodo:</strong> {report.periodLabel}
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right print:text-right shrink-0">
          <h2 className="text-sm font-bold text-[#141210]">{report.title}</h2>
          <p className="text-[11px] text-[#574F47]">{report.subtitle}</p>
        </div>
      </div>

      {/* Totales Financieros Principales */}
      <div className="ql-print-avoid-break border border-[#E2DDD5] rounded-xl p-3.5 bg-[#FAF8F5]">
        <h3 className="ql-print-keep-with-next text-[11px] font-bold uppercase tracking-wider text-[#141210] mb-2.5">
          Resumen Contable y Totales Financieros
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5">
          <div className="border border-[#E2DDD5] rounded-lg p-2.5 bg-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#574F47] block">
              Total Efectivo
            </span>
            <strong className="text-base font-bold text-[#141210] ql-num mt-0.5 block">
              {formatCurrency(totalCash)}
            </strong>
          </div>

          <div className="border border-[#E2DDD5] rounded-lg p-2.5 bg-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#574F47] block">
              Total Datáfono
            </span>
            <strong className="text-base font-bold text-[#141210] ql-num mt-0.5 block">
              {formatCurrency(totalCard)}
            </strong>
          </div>

          <div className="border border-[#E2DDD5] rounded-lg p-2.5 bg-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#574F47] block">
              Total Fiados
            </span>
            <strong className="text-base font-bold text-[#141210] ql-num mt-0.5 block">
              {formatCurrency(totalFiados)}
            </strong>
          </div>

          <div className="border border-[#E2DDD5] rounded-lg p-2.5 bg-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#574F47] block">
              Total Donativos
            </span>
            <strong className="text-base font-bold text-[#141210] ql-num mt-0.5 block">
              {formatCurrency(totalDonativos)}
            </strong>
          </div>
        </div>
      </div>

      {/* Separación Contable por Categoría */}
      <div className="ql-print-avoid-break border border-[#E2DDD5] rounded-xl p-3.5 bg-[#FAF8F5]">
        <h3 className="ql-print-keep-with-next text-[11px] font-bold uppercase tracking-wider text-[#141210] mb-2.5">
          Separación Contable por Categoría
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#141210]">
              <Coffee className="w-3.5 h-3.5 text-[#574F47] shrink-0" />
              Total Cafés
            </span>
            <strong className="text-sm font-bold ql-num text-[#141210]">
              {formatCurrency(totalCafes)}
            </strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#141210]">
              <ShoppingBag className="w-3.5 h-3.5 text-[#574F47] shrink-0" />
              Resto Cafetería
            </span>
            <strong className="text-sm font-bold ql-num text-[#141210]">
              {formatCurrency(totalRestoCafeteria)}
            </strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2DDD5] bg-white">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#141210]">
              <Banknote className="w-3.5 h-3.5 text-[#574F47] shrink-0" />
              Abonos Recibidos
            </span>
            <strong className="text-sm font-bold ql-num text-[#141210]">
              {formatCurrency(totalTabPayments)}
            </strong>
          </div>
        </div>
      </div>

      {/* Arqueo de Caja del Turno */}
      {report.shiftClose && (
        <div className="ql-print-avoid-break border border-[#E2DDD5] rounded-xl p-3.5 bg-[#FAF8F5]">
          <h3 className="ql-print-keep-with-next text-[11px] font-bold uppercase tracking-wider text-[#141210] mb-2.5">
            Arqueo de Caja del Turno
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 text-xs ql-num">
            <div>
              <span className="text-[#574F47] block">Efectivo Esperado</span>
              <strong className="text-sm font-bold text-[#141210]">
                {formatCurrency(report.shiftClose.expectedCash ?? 0)}
              </strong>
            </div>
            <div>
              <span className="text-[#574F47] block">Efectivo Contado</span>
              <strong className="text-sm font-bold text-[#141210]">
                {formatCurrency(report.shiftClose.actualCash ?? 0)}
              </strong>
            </div>
            <div>
              <span className="text-[#574F47] block">Descuadre</span>
              <strong
                className={`text-sm font-bold ${
                  (report.shiftClose.difference ?? 0) < 0
                    ? 'text-[#A63A3A]'
                    : 'text-[#2D6A4F]'
                }`}
              >
                {formatCurrency(report.shiftClose.difference ?? 0, {
                  showSign: (report.shiftClose.difference ?? 0) > 0,
                })}
              </strong>
            </div>
            <div>
              <span className="text-[#574F47] block">Total Datáfono</span>
              <strong className="text-sm font-bold text-[#141210]">
                {formatCurrency(report.shiftClose.totalCard ?? 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Productos Consumidos (con salto limpio por fila) */}
      <div className="border border-[#E2DDD5] rounded-xl p-3.5 bg-[#FAF8F5]">
        <div className="ql-print-keep-with-next flex items-center justify-between pb-2 mb-1.5 border-b border-[#141210]/15">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#141210] flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5" />
            Lista de Productos Consumidos
          </h3>
          <span className="text-xs font-semibold ql-num text-[#3D352F]">
            {formatInteger(totalSoldUnits)} uds. totales
          </span>
        </div>

        {soldItemsSummary.length === 0 ? (
          <p className="text-xs text-[#574F47] italic py-2">
            Sin desglose de artículos individuales disponible en este ticket o periodo.
          </p>
        ) : (
          <div className="divide-y divide-[#E2DDD5]">
            {soldItemsSummary.map((item) => (
              <div
                key={`${item.name}-${item.category || ''}`}
                className="ql-print-avoid-break flex items-center justify-between py-2 px-1 text-xs"
              >
                <span className="font-medium text-[#141210] pr-3">
                  <strong className="ql-num">{formatInteger(item.quantity)} ×</strong> {item.name}
                </span>
                <span className="font-semibold ql-num text-[#141210] shrink-0">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla de Desglose de Operaciones (con thead repetible en cada página A4) */}
      <div>
        <h3 className="ql-print-keep-with-next text-[11px] font-bold uppercase tracking-wider text-[#141210] mb-2">
          Desglose de Operaciones ({formatInteger(report.sales.length)})
        </h3>
        {report.sales.length === 0 ? (
          <p className="text-xs text-[#574F47] italic py-4 text-center border border-dashed border-[#E2DDD5] rounded-lg">
            Sin transacciones registradas en este periodo.
          </p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#141210]/25 text-[#141210] bg-[#EFECE6]">
                  <th className="py-1.5 px-2 font-semibold">Ticket</th>
                  <th className="py-1.5 px-2 font-semibold">Fecha/Hora</th>
                  <th className="py-1.5 px-2 font-semibold">Productos</th>
                  <th className="py-1.5 px-2 font-semibold">Método</th>
                  <th className="py-1.5 px-2 font-semibold">Cajero</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD5] ql-num">
                {report.sales.map((s) => {
                  const itemsDetail =
                    s.items && s.items.length > 0
                      ? s.items
                          .map((it) => {
                            const name = it.name || it.product?.name || 'Producto';
                            const unitPrice = Number(
                              it.price ?? it.customPrice ?? it.product?.price ?? 0
                            );
                            const sub = Number(it.subtotal ?? unitPrice * it.quantity);
                            return `${it.quantity} × ${name} (${formatCurrency(sub)})`;
                          })
                          .join(', ')
                      : 'Consumo directo';
                  return (
                    <tr key={s.id} className="ql-print-avoid-break">
                      <td className="py-1.5 px-2 text-[#141210] whitespace-nowrap">
                        #{s.id.slice(0, 8)}
                      </td>
                      <td className="py-1.5 px-2 text-[#574F47] whitespace-nowrap">
                        {new Date(s.timestamp).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-1.5 px-2 text-[#141210]">{itemsDetail}</td>
                      <td className="py-1.5 px-2 uppercase text-[#141210] whitespace-nowrap">
                        {s.paymentMethod}
                      </td>
                      <td className="py-1.5 px-2 text-[#141210] whitespace-nowrap">
                        {s.sellerName}
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold text-[#141210] whitespace-nowrap">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pie de firmas */}
      <div className="ql-print-avoid-break mt-6 pt-3.5 border-t border-[#E2DDD5] flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between gap-2 text-[11px] text-[#574F47]">
        <span>Generado por El Chiringuito POS</span>
        <span>Firma Tesorería / Supervisión: ______________________</span>
      </div>
    </div>
  );
};

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
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

  const salesCash =
    report.shiftClose?.salesCash !== undefined
      ? report.shiftClose.salesCash
      : fromCents(
          report.sales
            .filter((s) => s.paymentMethod === 'efectivo')
            .reduce((acc, s) => acc + toCents(s.total || 0), 0)
        );
  const salesCard =
    report.shiftClose?.salesCard !== undefined
      ? report.shiftClose.salesCard
      : fromCents(
          report.sales
            .filter((s) => s.paymentMethod === 'datafono')
            .reduce((acc, s) => acc + toCents(s.total || 0), 0)
        );
  const totalCash =
    report.shiftClose?.expectedCash !== undefined
      ? report.shiftClose.expectedCash
      : fromCents(toCents(salesCash) + toCents(tabPaymentsCash));
  const totalCard =
    report.shiftClose?.totalCard !== undefined
      ? report.shiftClose.totalCard
      : fromCents(toCents(salesCard) + toCents(tabPaymentsCard));
  const totalFiados =
    report.shiftClose?.totalFiados !== undefined
      ? report.shiftClose.totalFiados
      : calculateShiftTabBreakdown(report.sales, useCloseoutStore.getState().tabCredits).netFiados;
  const totalDonativos =
    report.shiftClose?.totalDonativos !== undefined
      ? report.shiftClose.totalDonativos
      : fromCents(
          report.sales
            .filter((s) => s.paymentMethod === 'donativo')
            .reduce((acc, s) => acc + toCents(s.total || 0), 0)
        );

  const generatedAtLabel = new Date().toLocaleString('es-ES');

  const docProps: PrintableDocumentProps = {
    report,
    generatedAtLabel,
    soldItemsSummary,
    totalCash,
    totalCard,
    totalFiados,
    totalDonativos,
    totalCafes,
    totalRestoCafeteria,
    totalTabPayments,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title="Vista Imprimible Contable (PDF)"
        description="El Chiringuito · Documento A4 listo para imprimir o guardar como PDF"
      >
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] p-3 rounded-2xl print:hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--ql-text-secondary)]">
              <FileText className="w-4 h-4 shrink-0 text-[var(--ql-text-primary)]" />
              <span>Formato A4 limpio con paginación automática.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="subtle"
                size="xs"
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
                size="xs"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
              >
                Imprimir / Guardar PDF
              </Button>
            </div>
          </div>

          {/* Vista previa en pantalla */}
          <div className="bg-white text-[#141210] rounded-2xl p-4 sm:p-6 border border-[var(--ql-hairline)] shadow-inner max-h-[64vh] overflow-y-auto">
            <PrintableReportDocument {...docProps} />
          </div>
        </div>
      </Modal>

      {/* Portal A4 aislado en document.body: único elemento visible durante window.print() */}
      {typeof document !== 'undefined'
        ? createPortal(
            <div id="elarx-print-root" className="hidden print:block">
              <PrintableReportDocument {...docProps} />
            </div>,
            document.body
          )
        : null}
    </>
  );
};
