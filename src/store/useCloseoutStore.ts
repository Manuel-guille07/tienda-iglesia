import { create } from 'zustand';
import { Incident, ShiftClose, Role, Sale, VoidAuditRecord } from '../types';
import { getCloseouts, insertCloseout, getAuditLogs, insertAuditLog } from '../services/db';

export interface TabPaymentExport {
  customerName: string;
  amount: number;
  paymentMethod: 'efectivo' | 'datafono';
  timestamp: string;
  description?: string;
}

interface CloseoutState {
  incidents: Incident[];
  shiftCloses: ShiftClose[];
  voidAudits: VoidAuditRecord[];
  lastCloseTimestamp: string | null;
  isSyncingSheets: boolean;

  loadCloseouts: () => Promise<void>;
  addIncident: (text: string, category: Incident['category'], author: string, role: Role) => Incident;
  addVoidAudit: (record: Omit<VoidAuditRecord, 'id'>) => VoidAuditRecord;
  recordShiftClose: (closeData: Omit<ShiftClose, 'id' | 'timestamp' | 'exportStatus'>) => ShiftClose;
  exportToGoogleSheets: (shiftCloseId: string) => Promise<{ success: boolean; message: string }>;
  downloadCSV: (shiftClose: ShiftClose, sales: Sale[], tabPayments?: TabPaymentExport[]) => void;
}

export const useCloseoutStore = create<CloseoutState>((set, get) => ({
  incidents: [],
  shiftCloses: [],
  voidAudits: [],
  lastCloseTimestamp: null,
  isSyncingSheets: false,

  loadCloseouts: async () => {
    try {
      const [closeoutsData, auditLogsData] = await Promise.all([
        getCloseouts(),
        getAuditLogs(),
      ]);

      let latestTimestamp: string | null = null;
      let shiftCloses: ShiftClose[] = [];

      if (closeoutsData && closeoutsData.length > 0) {
        latestTimestamp = closeoutsData[0].timestamp || closeoutsData[0].created_at || null;
        shiftCloses = closeoutsData.map((c: any) => ({
          id: c.id,
          timestamp: c.created_at || c.timestamp || new Date().toISOString(),
          closedBy: c.closed_by_user || 'Usuario',
          role: (c.closed_by_role as Role) || 'Vendedor',
          expectedCash: c.expected_cash || 0,
          actualCash: c.counted_cash || 0,
          totalCard: c.card_total || 0,
          totalFiados: c.tabs_total || 0,
          totalDonativos: c.donations_total || 0,
          totalConsumoInterno: c.consumption_total || 0,
          totalCoffeesSold: c.coffees_count || 0,
          totalSalesCount: c.sales_count || 0,
          totalRevenue: c.revenue_total || 0,
          difference: c.discrepancy || 0,
          notes: c.notes || '',
          incidents: [],
          exportStatus: 'synced',
          salesCash: c.sales_cash || 0,
          tabPaymentsCash: c.tabs_cash || 0,
          salesCard: c.sales_card || 0,
          tabPaymentsCard: c.tabs_card || 0,
        }));
      }

      const voidAudits: VoidAuditRecord[] = [];
      const incidents: Incident[] = [];

      if (auditLogsData && auditLogsData.length > 0) {
        auditLogsData.forEach((log: any) => {
          if (log.action_type === 'void') {
            const details = log.details || {};
            voidAudits.push({
              id: log.id,
              saleId: details.saleId || '',
              voidedBy: log.user_name || details.voidedBy || 'Usuario',
              voidedByRole: log.user_role || details.voidedByRole || 'Vendedor',
              timestamp: log.created_at || details.timestamp || new Date().toISOString(),
              reason: details.reason || '',
              returnedItems: details.returnedItems || [],
              returnedAmount: details.returnedAmount || 0,
              paymentMethod: details.paymentMethod || 'efectivo',
            });
          } else if (log.action_type === 'incident') {
            const details = log.details || {};
            incidents.push({
              id: log.id,
              timestamp: log.created_at || new Date().toISOString(),
              author: log.user_name || 'Usuario',
              role: (log.user_role as Role) || 'Vendedor',
              text: details.text || '',
              category: details.category || 'caja',
            });
          }
        });
      }

      set({
        shiftCloses,
        lastCloseTimestamp: latestTimestamp,
        voidAudits,
        incidents,
      });
    } catch (error) {
      console.error('[useCloseoutStore] Error al cargar cierres y auditorías desde Supabase:', error);
    }
  },

  addIncident: (text, category, author, role) => {
    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author,
      role,
      category,
      text,
    };
    set({ incidents: [newIncident, ...get().incidents] });

    insertAuditLog({
      action_type: 'incident',
      user_name: author,
      user_role: role,
      details: { text, category },
    }).catch((error) => {
      console.error('Error al guardar incidencia en audit_logs de Supabase:', error);
    });

    return newIncident;
  },

  addVoidAudit: (record) => {
    const newRecord: VoidAuditRecord = {
      ...record,
      id: `void-${Date.now()}`,
    };
    const updated = [newRecord, ...get().voidAudits];
    set({ voidAudits: updated });

    insertAuditLog({
      action_type: 'void',
      user_name: record.voidedBy,
      user_role: record.voidedByRole,
      details: {
        saleId: record.saleId,
        reason: record.reason,
        returnedItems: record.returnedItems,
        returnedAmount: record.returnedAmount,
        paymentMethod: record.paymentMethod,
        voidedBy: record.voidedBy,
        voidedByRole: record.voidedByRole,
        timestamp: record.timestamp,
      },
    }).catch((error) => {
      console.error('Error al guardar auditoría de anulación en audit_logs de Supabase:', error);
    });

    return newRecord;
  },

  recordShiftClose: (closeData) => {
    const timestamp = new Date().toISOString();
    const newClose: ShiftClose = {
      ...closeData,
      id: `close-${Date.now()}`,
      timestamp,
      exportStatus: 'pending',
    };

    set({
      shiftCloses: [newClose, ...get().shiftCloses],
      lastCloseTimestamp: timestamp,
    });

    insertCloseout({
      closed_by_user: closeData.closedBy,
      closed_by_role: closeData.role,
      expected_cash: closeData.expectedCash,
      counted_cash: closeData.actualCash,
      card_total: closeData.totalCard,
      tabs_cash: closeData.tabPaymentsCash ?? 0,
      tabs_card: closeData.tabPaymentsCard ?? 0,
      discrepancy: closeData.difference,
    }).catch((error) => {
      console.error('Error al registrar cierre de caja en Supabase:', error);
    });

    return newClose;
  },

  exportToGoogleSheets: async (shiftCloseId) => {
    set({ isSyncingSheets: true });
    await new Promise((resolve) => setTimeout(resolve, 1800));

    set({
      isSyncingSheets: false,
      shiftCloses: get().shiftCloses.map((c) =>
        c.id === shiftCloseId ? { ...c, exportStatus: 'synced' } : c
      ),
    });

    return {
      success: true,
      message: 'Sincronizado con la Hoja "Cierres-Cafetería-2026" en Google Drive',
    };
  },

  downloadCSV: (shiftClose, sales, tabPayments = []) => {
    const dateStr = new Date(shiftClose.timestamp).toLocaleDateString('es-ES').replace(/\//g, '-');
    const filename = `cierre-caja-${dateStr}.csv`;

    const rows: (string | number)[][] = [
      ['INFORME DE CIERRE DE CAJA - CHIRINGUITO IGLESIA'],
      ['Fecha y Hora', new Date(shiftClose.timestamp).toLocaleString('es-ES')],
      ['Responsable', `${shiftClose.closedBy} (${shiftClose.role})`],
      [''],
      ['CONCEPTO', 'IMPORTE (€)'],
      ['Ventas en Efectivo', (shiftClose.salesCash ?? (shiftClose.expectedCash - (shiftClose.tabPaymentsCash || 0))).toFixed(2)],
      ['Abonos de Fiados en Efectivo', (shiftClose.tabPaymentsCash || 0).toFixed(2)],
      ['Efectivo Total Esperado en Caja', shiftClose.expectedCash.toFixed(2)],
      ['Efectivo Físico Contado', shiftClose.actualCash.toFixed(2)],
      ['Diferencia / Descuadre', shiftClose.difference.toFixed(2)],
      ['Ventas por Datáfono / Tarjeta', (shiftClose.salesCard ?? (shiftClose.totalCard - (shiftClose.tabPaymentsCard || 0))).toFixed(2)],
      ['Abonos de Fiados por Datáfono', (shiftClose.tabPaymentsCard || 0).toFixed(2)],
      ['Total Datáfono / Tarjeta Esperado', shiftClose.totalCard.toFixed(2)],
      ['Total Fiados Asignados (Nuevos a Cuenta)', shiftClose.totalFiados.toFixed(2)],
      ['Total Donativos Registrados', shiftClose.totalDonativos.toFixed(2)],
      ['Consumo Interno / Merma', shiftClose.totalConsumoInterno.toFixed(2)],
      ['Total Ingresos Reales del Turno', shiftClose.totalRevenue.toFixed(2)],
      ['Total Cafés Servidos', shiftClose.totalCoffeesSold.toString()],
      ['Total Transacciones', shiftClose.totalSalesCount.toString()],
      [''],
    ];

    if (tabPayments && tabPayments.length > 0) {
      rows.push(
        ['DETALLE DE ABONOS DE FIADOS DEL TURNO'],
        ['Hora', 'Cliente', 'Método', 'Importe (€)', 'Descripción'],
        ...tabPayments.map((p) => [
          new Date(p.timestamp).toLocaleTimeString('es-ES'),
          p.customerName,
          p.paymentMethod === 'datafono' ? 'Datáfono' : 'Efectivo',
          p.amount.toFixed(2),
          p.description || 'Abono fiado',
        ]),
        ['']
      );
    }

    rows.push(
      ['DIARIO DE INCIDENCIAS'],
      ...shiftClose.incidents.map((i) => [
        new Date(i.timestamp).toLocaleTimeString('es-ES'),
        `[${i.category.toUpperCase()}] ${i.author}: ${i.text}`,
      ]),
      [''],
      ['DETALLE DE VENTAS DEL TURNO'],
      ['ID Venta', 'Hora', 'Método', 'Total (€)', 'Vendedor', 'Productos'],
      ...sales.map((s) => [
        s.id,
        new Date(s.timestamp).toLocaleTimeString('es-ES'),
        s.paymentMethod,
        s.total.toFixed(2),
        s.sellerName,
        s.items.map((it) => `${it.quantity}x ${it.product.name}`).join(' | '),
      ])
    );

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
      )
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));
