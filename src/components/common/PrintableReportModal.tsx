import React from 'react';
import { Sale, ShiftClose, VoidAuditRecord } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export interface PrintableReportData {
  title: string;
  subtitle: string;
  generatedBy: string;
  generatedRole: string;
  periodLabel: string;
  kpis: { label: string; value: string; accent?: string }[];
  sales: Sale[];
  shiftClose?: Partial<ShiftClose>;
  voidAudits?: VoidAuditRecord[];
}

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PrintableReportData | null;
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
 * Exporta el listado de ventas y auditorías a CSV/Excel desde Historial o Dashboard
 */
export function exportSalesHistoryToCSV(
  sales: Sale[],
  voidAudits: VoidAuditRecord[] = [],
  periodLabel = 'General'
) {
  const dateStr = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
  const filename = `elarx-reporte-contable-${dateStr}.csv`;

  const totalAmount = sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCash = sales
    .filter((s) => s.paymentMethod === 'efectivo')
    .reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCard = sales
    .filter((s) => s.paymentMethod === 'datafono')
    .reduce((acc, s) => acc + (s.total || 0), 0);
  const totalTabs = sales
    .filter((s) => s.paymentMethod === 'fiado')
    .reduce((acc, s) => acc + (s.total || 0), 0);
  const totalDonations = sales
    .filter((s) => s.paymentMethod === 'donativo')
    .reduce((acc, s) => acc + (s.total || 0), 0);

  const rows: (string | number)[][] = [
    ['ELARX POS - REPORTE CONTABLE DE VENTAS Y AUDITORÍA'],
    ['Fecha de Emisión', new Date().toLocaleString('es-ES')],
    ['Periodo / Filtro', periodLabel],
    [''],
    ['RESUMEN EJECUTIVO', 'IMPORTE (€)'],
    ['Total Ingresos Brutos', totalAmount.toFixed(2)],
    ['Total Efectivo', totalCash.toFixed(2)],
    ['Total Datáfono / Tarjeta', totalCard.toFixed(2)],
    ['Total Fiados (Cuentas)', totalTabs.toFixed(2)],
    ['Total Donativos', totalDonations.toFixed(2)],
    ['Número de Tickets', sales.length],
    [''],
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
    ]),
  ];

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
  if (!isOpen || !report) return null;

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
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-3 rounded-xl print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Documento formateado para guardar como PDF o imprimir en A4.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => {
                exportSalesHistoryToCSV(report.sales, report.voidAudits || [], report.periodLabel);
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
          className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-inner max-h-[68vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:border-0"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-900 text-white font-black text-xs tracking-wider rounded">
                  ELARX POS
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reporte Oficial de Contabilidad y Tesorería
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{report.title}</h2>
              <p className="text-xs text-slate-600">{report.subtitle}</p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 font-mono tabular-nums">
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
                className="border border-slate-200 rounded-xl p-2.5 bg-slate-50"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  {kpi.label}
                </span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5 block">
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          {/* Optional Shift Arqueo Breakdown */}
          {report.shiftClose && (
            <div className="mb-4 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Arqueo de Caja del Turno
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-500 block">Efectivo Esperado:</span>
                  <strong>{(report.shiftClose.expectedCash ?? 0).toFixed(2)}€</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Efectivo Contado:</span>
                  <strong>{(report.shiftClose.actualCash ?? 0).toFixed(2)}€</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Descuadre:</span>
                  <strong
                    className={
                      (report.shiftClose.difference ?? 0) < 0
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }
                  >
                    {(report.shiftClose.difference ?? 0).toFixed(2)}€
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Datáfono:</span>
                  <strong>{(report.shiftClose.totalCard ?? 0).toFixed(2)}€</strong>
                </div>
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="mt-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Desglose de Operaciones ({report.sales.length})
            </h3>
            {report.sales.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
                Sin transacciones registradas en este periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 bg-slate-100">
                      <th className="py-2 px-2 font-semibold">Ticket</th>
                      <th className="py-2 px-2 font-semibold">Fecha/Hora</th>
                      <th className="py-2 px-2 font-semibold">Método</th>
                      <th className="py-2 px-2 font-semibold">Vendedor</th>
                      <th className="py-2 px-2 font-semibold text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {report.sales.slice(0, 50).map((s) => (
                      <tr key={s.id}>
                        <td className="py-1.5 px-2 text-slate-700">#{s.id.slice(0, 8)}</td>
                        <td className="py-1.5 px-2 text-slate-600">
                          {new Date(s.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-1.5 px-2 uppercase text-slate-700">{s.paymentMethod}</td>
                        <td className="py-1.5 px-2 font-sans text-slate-700">{s.sellerName}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900">
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
          <div className="mt-6 pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
            <span>Generado por ELARX POS v1.2 Core</span>
            <span>Firma Tesorería / Supervisión: ______________________</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
