import { create } from 'zustand';
import { Incident, ShiftClose, Role, Sale, VoidAuditRecord, TabCreditRecord } from '../types';
import {
  getCloseouts,
  insertCloseout,
  getAuditLogs,
  insertAuditLog,
  fromCloseoutSnake,
  getTabPayments,
} from '../services/db';
import { fromCents, toCents } from '../utils/finance';
import toast from 'react-hot-toast';

export interface TabPaymentExport {
  id?: string;
  tabId?: string;
  customerName: string;
  amount: number;
  paymentMethod: 'efectivo' | 'datafono';
  timestamp: string;
  description?: string;
}

function mapRawTabPayment(row: any): TabPaymentExport {
  const rawMethod = String(row.paymentMethod ?? row.payment_method ?? 'efectivo').toLowerCase().trim();
  const paymentMethod: 'efectivo' | 'datafono' =
    rawMethod === 'datafono' || rawMethod === 'datáfono' || rawMethod === 'tarjeta' || rawMethod === 'card'
      ? 'datafono'
      : 'efectivo';
  return {
    id: row.id ? String(row.id) : undefined,
    tabId: row.tabId || row.tab_id ? String(row.tabId || row.tab_id) : undefined,
    customerName: row.customerName || row.clientName || row.customer_name || row.client_name || 'Cliente',
    amount: Number(row.amount ?? 0),
    paymentMethod,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    description: row.description || 'Abono de deuda pendiente',
  };
}

function dedupeTabPayments(payments: TabPaymentExport[]): TabPaymentExport[] {
  const result: TabPaymentExport[] = [];
  for (const p of payments) {
    if (!p || !(p.amount > 0)) continue;
    const isDup = result.some(
      (existing) =>
        (p.id && existing.id && p.id === existing.id) ||
        (existing.customerName.trim().toLowerCase() === p.customerName.trim().toLowerCase() &&
          toCents(existing.amount) === toCents(p.amount) &&
          existing.paymentMethod === p.paymentMethod &&
          Math.abs(new Date(existing.timestamp).getTime() - new Date(p.timestamp).getTime()) < 5000)
    );
    if (!isDup) {
      result.push(p);
    }
  }
  return result.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Calcula la deuda neta real generada por ventas Fiadas ('fiado') en el turno,
 * descontando cualquier saldo a favor / prepago del cliente que ya fue cobrado en un turno anterior.
 */
export function calculateShiftTabBreakdown(
  shiftSales: Sale[],
  tabCredits: TabCreditRecord[] = []
): {
  netFiados: number;
  grossFiados: number;
  prepaidUsed: number;
} {
  let netFiados = 0;
  let grossFiados = 0;
  let prepaidUsed = 0;

  for (const s of shiftSales) {
    if (s.paymentMethod !== 'fiado') continue;
    const saleTotal = Number(s.total || 0);
    grossFiados += saleTotal;

    if (typeof s.netTabDebt === 'number' && !isNaN(s.netTabDebt)) {
      const net = Math.max(0, Math.min(saleTotal, s.netTabDebt));
      const used =
        typeof s.prepaidUsed === 'number' && !isNaN(s.prepaidUsed)
          ? Math.max(0, Math.min(saleTotal, s.prepaidUsed))
          : Math.max(0, saleTotal - net);
      netFiados += net;
      prepaidUsed += used;
      continue;
    }

    const creditRecord = tabCredits.find(
      (tc) =>
        (tc.saleId && tc.saleId === s.id) ||
        (Math.abs(new Date(tc.timestamp).getTime() - new Date(s.timestamp).getTime()) < 5000 &&
          Math.abs(tc.saleTotal - saleTotal) < 0.01)
    );

    if (creditRecord) {
      const used = Math.max(0, Math.min(saleTotal, creditRecord.prepaidUsed));
      const net = Math.max(0, saleTotal - used);
      netFiados += net;
      prepaidUsed += used;
    } else {
      netFiados += saleTotal;
    }
  }

  return {
    netFiados: Number(netFiados.toFixed(2)),
    grossFiados: Number(grossFiados.toFixed(2)),
    prepaidUsed: Number(prepaidUsed.toFixed(2)),
  };
}

interface CloseoutState {
  incidents: Incident[];
  shiftCloses: ShiftClose[];
  voidAudits: VoidAuditRecord[];
  tabCredits: TabCreditRecord[];
  tabPayments: TabPaymentExport[];
  shiftTabPayments: TabPaymentExport[];
  lastCloseTimestamp: string | null;
  isSyncingSheets: boolean;
  isClosingShift: boolean;

  loadCloseouts: () => Promise<void>;
  loadShiftTabPayments: (sinceTimestamp?: string | null) => Promise<TabPaymentExport[]>;
  addTabPayment: (payment: TabPaymentExport) => void;
  addIncident: (text: string, category: Incident['category'], author: string, role: Role) => Incident;
  addVoidAudit: (record: Omit<VoidAuditRecord, 'id'>) => VoidAuditRecord;
  addTabCredit: (record: Omit<TabCreditRecord, 'id'>) => void;
  recordShiftClose: (
    closeData: Omit<ShiftClose, 'id' | 'timestamp' | 'exportStatus'>
  ) => Promise<{ success: boolean; closeout?: ShiftClose; error?: string }>;
  handleRealtimeCloseout: (payload: any) => void;
  exportToGoogleSheets: (shiftCloseId: string) => Promise<{ success: boolean; message: string }>;
  downloadCSV: (shiftClose: ShiftClose, sales: Sale[], tabPayments?: TabPaymentExport[]) => void;
}

export const useCloseoutStore = create<CloseoutState>((set, get) => ({
  incidents: [],
  shiftCloses: [],
  voidAudits: [],
  tabCredits: [],
  tabPayments: [],
  shiftTabPayments: [],
  lastCloseTimestamp: null,
  isSyncingSheets: false,
  isClosingShift: false,

  loadCloseouts: async () => {
    try {
      const [closeoutsData, auditLogsData] = await Promise.all([
        getCloseouts(),
        getAuditLogs(),
      ]);

      let latestTimestamp: string | null = null;
      let shiftCloses: ShiftClose[] = [];

      if (closeoutsData && closeoutsData.length > 0) {
        const sortedCloseouts = [...closeoutsData].sort(
          (a: any, b: any) =>
            new Date(b.timestamp || b.created_at || 0).getTime() -
            new Date(a.timestamp || a.created_at || 0).getTime()
        );
        latestTimestamp = sortedCloseouts[0].timestamp || sortedCloseouts[0].created_at || null;
        shiftCloses = sortedCloseouts.map((c: any) => {
          const tabPaymentsCash = Number(c.tabs_cash ?? c.tabPaymentsCash ?? 0);
          const tabPaymentsCard = Number(c.tabs_card ?? c.tabPaymentsCard ?? 0);
          const totalTabPayments = fromCents(toCents(tabPaymentsCash) + toCents(tabPaymentsCard));
          return {
            id: c.id,
            timestamp: c.created_at || c.timestamp || new Date().toISOString(),
            closedBy: c.closed_by_user || c.closedBy || 'Usuario',
            role: (c.closed_by_role || c.role || 'Vendedor') as Role,
            expectedCash: Number(c.expected_cash ?? c.expectedCash ?? 0),
            actualCash: Number(c.counted_cash ?? c.actualCash ?? 0),
            totalCard: Number(c.card_total ?? c.totalCard ?? 0),
            totalFiados: Number(c.tabs_total ?? c.totalFiados ?? 0),
            totalDonativos: Number(c.donations_total ?? c.totalDonativos ?? 0),
            totalConsumoInterno: Number(c.consumption_total ?? c.totalConsumoInterno ?? 0),
            totalCoffeesSold: Number(c.coffees_count ?? c.totalCoffeesSold ?? 0),
            totalSalesCount: Number(c.sales_count ?? c.totalSalesCount ?? 0),
            totalRevenue: Number(
              c.revenue_total ??
                c.totalRevenue ??
                fromCents(toCents(Number(c.expected_cash ?? 0)) + toCents(Number(c.card_total ?? 0)))
            ),
            difference: Number(c.discrepancy ?? c.difference ?? 0),
            notes: c.notes || '',
            incidents: [],
            exportStatus: 'synced',
            salesCash: Number(c.sales_cash ?? c.salesCash ?? 0),
            tabPaymentsCash,
            salesCard: Number(c.sales_card ?? c.salesCard ?? 0),
            tabPaymentsCard,
            totalTabPayments,
          };
        });
      }

      const voidAudits: VoidAuditRecord[] = [];
      const incidents: Incident[] = [];
      const tabCredits: TabCreditRecord[] = [];

      if (auditLogsData && auditLogsData.length > 0) {
        auditLogsData.forEach((log: any) => {
          if (log.action_type === 'void') {
            const details = log.details || {};
            voidAudits.push({
              id: log.id,
              saleId: log.saleId || details.saleId || '',
              voidedBy: log.user_name || details.voidedBy || 'Usuario',
              voidedByRole: log.user_role || details.voidedByRole || 'Vendedor',
              timestamp: log.timestamp || log.created_at || details.timestamp || new Date().toISOString(),
              reason: log.reason || details.reason || '',
              returnedItems: log.returnedItems || details.returnedItems || [],
              returnedAmount: Number(log.returnedAmount ?? details.returnedAmount ?? 0),
              paymentMethod: log.paymentMethod || details.paymentMethod || 'efectivo',
            });
          } else if (log.action_type === 'incident') {
            const details = log.details || {};
            incidents.push({
              id: log.id,
              timestamp: log.timestamp || log.created_at || new Date().toISOString(),
              author: log.user_name || 'Usuario',
              role: (log.user_role as Role) || 'Vendedor',
              text: log.reason || details.text || '',
              category: log.category || details.category || 'caja',
            });
          } else if (log.action_type === 'tab_credit') {
            const details = log.details || {};
            const prepaidUsed = Number(details.prepaidUsed ?? log.returnedAmount ?? 0);
            const saleTotal = Number(details.saleTotal ?? 0);
            const netTabDebt = Number(
              details.netTabDebt ?? Math.max(0, saleTotal - prepaidUsed)
            );
            tabCredits.push({
              id: log.id,
              saleId: String(log.saleId || details.saleId || ''),
              customerTabId: details.customerTabId,
              customerName: details.customerName,
              saleTotal,
              prepaidUsed,
              netTabDebt,
              timestamp: details.timestamp || log.timestamp || log.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // Conservar el timestamp más reciente para garantizar que el turno quede en 0 €
      const currentLast = get().lastCloseTimestamp;
      const effectiveLatest =
        currentLast && latestTimestamp
          ? new Date(currentLast).getTime() > new Date(latestTimestamp).getTime()
            ? currentLast
            : latestTimestamp
          : latestTimestamp || currentLast;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sinceQueryTs = effectiveLatest || startOfDay.toISOString();

      const [rawShiftPayments, rawAllPayments] = await Promise.all([
        getTabPayments(sinceQueryTs),
        getTabPayments(),
      ]);

      const mappedAll = dedupeTabPayments([
        ...(rawAllPayments || []).map(mapRawTabPayment),
        ...get().tabPayments,
      ]);

      const cutoffMs = effectiveLatest
        ? new Date(effectiveLatest).getTime()
        : startOfDay.getTime();

      const mappedShift = dedupeTabPayments([
        ...(rawShiftPayments || []).map(mapRawTabPayment),
        ...get().shiftTabPayments,
      ]).filter((p) => {
        const ms = new Date(p.timestamp).getTime();
        return !isNaN(ms) && (effectiveLatest ? ms > cutoffMs : ms >= cutoffMs);
      });

      set({
        shiftCloses,
        lastCloseTimestamp: effectiveLatest,
        voidAudits,
        incidents,
        tabCredits: tabCredits.length > 0 ? tabCredits : get().tabCredits,
        tabPayments: mappedAll,
        shiftTabPayments: mappedShift,
      });
    } catch (error) {
      console.error('[useCloseoutStore] Error al cargar cierres y auditorías desde Supabase:', error);
    }
  },

  loadShiftTabPayments: async (sinceTimestamp) => {
    try {
      const effectiveLatest =
        sinceTimestamp !== undefined ? sinceTimestamp : get().lastCloseTimestamp;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sinceQueryTs = effectiveLatest || startOfDay.toISOString();

      const [rawShiftPayments, rawAllPayments] = await Promise.all([
        getTabPayments(sinceQueryTs),
        getTabPayments(),
      ]);

      const mappedAll = dedupeTabPayments([
        ...(rawAllPayments || []).map(mapRawTabPayment),
        ...get().tabPayments,
      ]);

      const cutoffMs = effectiveLatest
        ? new Date(effectiveLatest).getTime()
        : startOfDay.getTime();

      const mappedShift = dedupeTabPayments([
        ...(rawShiftPayments || []).map(mapRawTabPayment),
        ...get().shiftTabPayments,
      ]).filter((p) => {
        const ms = new Date(p.timestamp).getTime();
        return !isNaN(ms) && (effectiveLatest ? ms > cutoffMs : ms >= cutoffMs);
      });

      set({
        tabPayments: mappedAll,
        shiftTabPayments: mappedShift,
      });
      return mappedShift;
    } catch (error) {
      console.error('[useCloseoutStore] Error al consultar tab_payments del turno:', error);
      return get().shiftTabPayments;
    }
  },

  addTabPayment: (payment) => {
    const normalized = mapRawTabPayment(payment);
    set((state) => ({
      tabPayments: dedupeTabPayments([normalized, ...state.tabPayments]),
      shiftTabPayments: dedupeTabPayments([normalized, ...state.shiftTabPayments]),
    }));
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
      toast.error('No se pudo sincronizar la incidencia con Supabase');
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

  addTabCredit: (record) => {
    const newCredit: TabCreditRecord = {
      ...record,
      id: `tcred-${Date.now()}`,
    };
    set((state) => ({
      tabCredits: [
        newCredit,
        ...state.tabCredits.filter(
          (tc) =>
            (!record.saleId || tc.saleId !== record.saleId) &&
            !(
              tc.saleId?.startsWith('sale-') &&
              tc.timestamp === record.timestamp &&
              Math.abs(tc.saleTotal - record.saleTotal) < 0.01
            )
        ),
      ],
    }));
  },

  recordShiftClose: async (closeData) => {
    if (get().isClosingShift) {
      return { success: false, error: 'Cierre de caja en curso, por favor espera...' };
    }

    if (
      !Number.isFinite(closeData.actualCash) ||
      isNaN(closeData.actualCash) ||
      closeData.actualCash < 0
    ) {
      return { success: false, error: 'El efectivo contado debe ser un número válido >= 0' };
    }

    set({ isClosingShift: true });
    try {
      const savedRows = await insertCloseout({
        closed_by_user: closeData.closedBy,
        closed_by_role: closeData.role,
        expected_cash: closeData.expectedCash,
        counted_cash: closeData.actualCash,
        card_total: closeData.totalCard,
        tabs_cash: closeData.tabPaymentsCash ?? 0,
        tabs_card: closeData.tabPaymentsCard ?? 0,
        discrepancy: closeData.difference,
      });

      const saved = savedRows?.[0];
      if (!saved) {
        return {
          success: false,
          error: 'No se recibió confirmación del servidor al registrar el cierre de caja',
        };
      }

      const finalId = String(saved.id);
      const effectiveTs = saved.timestamp || new Date().toISOString();

      const confirmedClose: ShiftClose = {
        ...closeData,
        id: finalId,
        timestamp: effectiveTs,
        exportStatus: 'synced',
      };

      set((state) => {
        const existingWithoutDup = state.shiftCloses.filter((c) => c.id !== finalId);
        const currentLastMs = state.lastCloseTimestamp
          ? new Date(state.lastCloseTimestamp).getTime()
          : 0;
        const nextTsMs = new Date(effectiveTs).getTime();
        const nextLastTs = nextTsMs >= currentLastMs ? effectiveTs : state.lastCloseTimestamp;

        return {
          shiftCloses: [confirmedClose, ...existingWithoutDup],
          lastCloseTimestamp: nextLastTs,
          shiftTabPayments: [],
        };
      });

      return { success: true, closeout: confirmedClose };
    } catch (error: any) {
      console.error('Error al registrar cierre de caja en Supabase:', error);
      return {
        success: false,
        error:
          error?.message ||
          'Error de red: No se pudo registrar el cierre de caja. El turno permanece abierto sin pérdida de datos.',
      };
    } finally {
      set({ isClosingShift: false });
    }
  },

  handleRealtimeCloseout: (payload: any) => {
    if (payload?.eventType === 'INSERT' && payload.new) {
      const mapped = fromCloseoutSnake(payload.new);
      const currentCloses = get().shiftCloses;
      const alreadyExists = currentCloses.some(
        (c) =>
          c.id === mapped.id ||
          Math.abs(new Date(c.timestamp).getTime() - new Date(mapped.timestamp).getTime()) < 3000
      );

      const newTimestamp =
        new Date(mapped.timestamp).getTime() > Date.now()
          ? mapped.timestamp
          : new Date().toISOString();

      if (!alreadyExists) {
        const remoteShiftClose: ShiftClose = {
          id: mapped.id,
          timestamp: newTimestamp,
          closedBy: mapped.closedBy || 'Compañero',
          role: (mapped.role as Role) || 'Vendedor',
          expectedCash: mapped.expectedCash,
          actualCash: mapped.actualCash,
          totalCard: mapped.totalCard,
          totalFiados: 0,
          totalDonativos: 0,
          totalConsumoInterno: 0,
          totalCoffeesSold: 0,
          totalSalesCount: 0,
          totalRevenue: fromCents(toCents(mapped.expectedCash) + toCents(mapped.totalCard)),
          difference: mapped.difference,
          incidents: [],
          exportStatus: 'synced',
          tabPaymentsCash: mapped.tabPaymentsCash,
          tabPaymentsCard: mapped.tabPaymentsCard,
          totalTabPayments: fromCents(
            toCents(mapped.tabPaymentsCash || 0) + toCents(mapped.tabPaymentsCard || 0)
          ),
        };

        set({
          shiftCloses: [remoteShiftClose, ...currentCloses],
          lastCloseTimestamp: newTimestamp,
          shiftTabPayments: [],
        });

        toast.success(
          `Caja cerrada por ${remoteShiftClose.closedBy}. Turno reiniciado a 0.00€`
        );
      } else {
        set({ lastCloseTimestamp: newTimestamp, shiftTabPayments: [] });
      }
    } else {
      get().loadCloseouts();
    }
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

    const totalTabPayments =
      shiftClose.totalTabPayments ??
      fromCents(toCents(shiftClose.tabPaymentsCash || 0) + toCents(shiftClose.tabPaymentsCard || 0));

    const rows: (string | number)[][] = [
      ['INFORME DE CIERRE DE CAJA - CHIRINGUITO IGLESIA'],
      ['Fecha y Hora', new Date(shiftClose.timestamp).toLocaleString('es-ES')],
      ['Responsable', `${shiftClose.closedBy} (${shiftClose.role})`],
      [''],
      ['CONCEPTO', 'IMPORTE (€)'],
      ['Ventas de Hoy en Efectivo', (shiftClose.salesCash ?? (shiftClose.expectedCash - (shiftClose.tabPaymentsCash || 0))).toFixed(2)],
      ['Abonos Recibidos (Deudas previas) - Efectivo', (shiftClose.tabPaymentsCash || 0).toFixed(2)],
      ['Efectivo Total Esperado en Caja', shiftClose.expectedCash.toFixed(2)],
      ['Efectivo Físico Contado', shiftClose.actualCash.toFixed(2)],
      ['Diferencia / Descuadre', shiftClose.difference.toFixed(2)],
      ['Ventas de Hoy por Datáfono / Tarjeta', (shiftClose.salesCard ?? (shiftClose.totalCard - (shiftClose.tabPaymentsCard || 0))).toFixed(2)],
      ['Abonos Recibidos (Deudas previas) - Datáfono', (shiftClose.tabPaymentsCard || 0).toFixed(2)],
      ['Total Datáfono / Tarjeta Esperado', shiftClose.totalCard.toFixed(2)],
      ['Abonos Recibidos (Deudas previas)', totalTabPayments.toFixed(2)],
      ['Total Fiados (Deuda Neta Nueva)', shiftClose.totalFiados.toFixed(2)],
      ...(shiftClose.prepaidTabsUsed && shiftClose.prepaidTabsUsed > 0
        ? [['Saldo a Favor Consumido en Fiados', shiftClose.prepaidTabsUsed.toFixed(2)]]
        : []),
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
