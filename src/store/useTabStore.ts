import { create } from 'zustand';
import { CustomerTab, Sale, TabMovement } from '../types';
import {
  getTabs,
  getTabPayments,
  insertTab,
  insertTabPayment,
  updateTabBalances,
  updateTabProfile,
} from '../services/db';
import { useCloseoutStore } from './useCloseoutStore';
import { roundMoney, toCents, isValidPositiveMoney } from '../utils/finance';

const TAB_PROFILES_STORAGE_KEY = 'el_chiringuito_tab_profiles_v1';

interface CachedTabProfileMeta {
  congregation: string;
  ministry: string;
  churchGroup: string;
  phone?: string;
}

function loadCachedTabProfiles(): Record<string, CachedTabProfileMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TAB_PROFILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCachedTabProfile(id: string, meta: CachedTabProfileMeta) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const current = loadCachedTabProfiles();
    current[id] = meta;
    window.localStorage.setItem(TAB_PROFILES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

export interface TabMutationResult {
  success: boolean;
  customer?: CustomerTab;
  error?: string;
}

export interface UpdateCustomerPayload {
  name: string;
  phone?: string | null;
  congregation?: string | null;
  ministry?: string | null;
  churchGroup?: string | null;
}

interface TabState {
  customers: CustomerTab[];
  searchQuery: string;
  selectedCustomerId: string | null;
  isMutatingTab: boolean;

  loadTabs: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCustomerId: (id: string | null) => void;

  addCustomer: (
    name: string,
    phone?: string | null,
    churchGroup?: string | null,
    congregation?: string | null,
    ministry?: string | null
  ) => Promise<TabMutationResult>;
  addTab: (
    nameOrData:
      | string
      | {
          name: string;
          phone?: string | null;
          churchGroup?: string | null;
          congregation?: string | null;
          ministry?: string | null;
          balance?: number;
          debt?: number;
        },
    phone?: string | null,
    churchGroup?: string | null,
    congregation?: string | null,
    ministry?: string | null
  ) => Promise<TabMutationResult>;
  updateCustomer: (customerId: string, data: UpdateCustomerPayload) => Promise<TabMutationResult>;
  addPrepaidBalance: (
    customerId: string,
    amount: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => Promise<TabMutationResult>;
  payDebt: (
    customerId: string,
    amount: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => Promise<TabMutationResult>;
  payTab: (
    customerIdOrData:
      | string
      | {
          customerId?: string;
          tabId?: string;
          amount: number;
          description?: string;
          paymentMethod?: 'efectivo' | 'datafono';
        },
    amount?: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => Promise<TabMutationResult>;
  addPayment: (
    customerIdOrData:
      | string
      | {
          customerId?: string;
          tabId?: string;
          amount: number;
          description?: string;
          paymentMethod?: 'efectivo' | 'datafono';
        },
    amount?: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => Promise<TabMutationResult>;
  chargeSaleToTab: (
    customerId: string,
    sale: Sale
  ) => { newBalance: number; newDebt: number; prepaidUsed: number; netTabDebt: number };
  revertSaleFromTab: (sale: Sale) => Promise<void>;

  generateReceiptText: (
    customer?: CustomerTab | null,
    sale?: Sale | null,
    abonoAmount?: number | null
  ) => string;
  getWhatsAppShareUrl: (phone: string, text: string) => string;
}

export const useTabStore = create<TabState>((set, get) => ({
  customers: [],
  searchQuery: '',
  selectedCustomerId: null,
  isMutatingTab: false,

  loadTabs: async () => {
    try {
      const [data, paymentsData] = await Promise.all([getTabs(), getTabPayments()]);
      if (data && data.length > 0) {
        const existingById = new Map(get().customers.map((c) => [c.id, c]));
        const cachedMeta = loadCachedTabProfiles();
        const hydrated = (data as CustomerTab[]).map((c) => {
          const prev = existingById.get(c.id);
          const meta = cachedMeta[c.id];
          const prevMovements = prev?.movements || [];
          const dbMovements: TabMovement[] = (paymentsData || [])
            .filter(
              (p: any) =>
                (p.tabId && String(p.tabId) === String(c.id)) ||
                (!p.tabId &&
                  (p.customerName || p.clientName || '').trim().toLowerCase() ===
                    c.name.trim().toLowerCase())
            )
            .map((p: any) => ({
              id: p.id ? String(p.id) : `mov-${p.timestamp}`,
              timestamp: p.timestamp || new Date().toISOString(),
              type: 'pago' as const,
              amount: Number(p.amount ?? 0),
              description: p.description || 'Abono de deuda pendiente',
              paymentMethod: p.paymentMethod === 'datafono' ? 'datafono' : 'efectivo',
            }));

          const mergedMovements: TabMovement[] = [...dbMovements];
          for (const pm of prevMovements) {
            const isDup = mergedMovements.some(
              (m) =>
                m.id === pm.id ||
                (m.type === pm.type &&
                  toCents(m.amount) === toCents(pm.amount) &&
                  Math.abs(new Date(m.timestamp).getTime() - new Date(pm.timestamp).getTime()) < 5000)
            );
            if (!isDup) {
              mergedMovements.push(pm);
            }
          }
          mergedMovements.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          const congregation = String(
            c.congregation || prev?.congregation || meta?.congregation || ''
          );
          const ministry = String(c.ministry || prev?.ministry || meta?.ministry || '');
          const composedGroup = [congregation, ministry].filter(Boolean).join(' · ');
          const churchGroup = String(
            composedGroup || c.churchGroup || prev?.churchGroup || meta?.churchGroup || 'Congregación'
          );

          return {
            ...c,
            phone: String(c.phone ?? prev?.phone ?? meta?.phone ?? ''),
            congregation,
            ministry,
            churchGroup,
            movements: mergedMovements,
          };
        });
        set({ customers: hydrated });
      }
    } catch (error) {
      console.error('[useTabStore] Error al cargar tabs desde Supabase:', error);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

  addTab: async (nameOrData, phoneArg, churchGroupArg, congregationArg, ministryArg) => {
    if (get().isMutatingTab) {
      return { success: false, error: 'Operación en curso, espera un momento...' };
    }

    let name = '';
    let phone = '';
    let congregation = '';
    let ministry = '';
    let churchGroup = '';
    let initialBalance = 0;
    let initialDebt = 0;

    if (typeof nameOrData === 'object' && nameOrData !== null) {
      name = String(nameOrData.name ?? '').trim();
      phone = String(nameOrData.phone ?? '').trim();
      congregation = String(nameOrData.congregation ?? '').trim();
      ministry = String(nameOrData.ministry ?? '').trim();
      const fallbackGroup = [congregation, ministry].filter(Boolean).join(' · ') || 'Congregación';
      churchGroup = String(nameOrData.churchGroup ?? fallbackGroup).trim() || 'Congregación';
      initialBalance = Math.max(0, roundMoney(Number(nameOrData.balance ?? 0)));
      initialDebt = Math.max(0, roundMoney(Number(nameOrData.debt ?? 0)));
    } else {
      name = String(nameOrData ?? '').trim();
      phone = String(phoneArg ?? '').trim();
      congregation = String(congregationArg ?? '').trim();
      ministry = String(ministryArg ?? '').trim();
      const fallbackGroup = [congregation, ministry].filter(Boolean).join(' · ') || 'Congregación';
      churchGroup = String(churchGroupArg ?? fallbackGroup).trim() || 'Congregación';
    }

    if (!name) {
      return { success: false, error: 'El nombre del cliente no puede estar vacío' };
    }

    set({ isMutatingTab: true });
    try {
      const rows = await insertTab({
        name,
        phone,
        congregation,
        ministry,
        church_group: churchGroup,
        balance: initialBalance,
        debt: initialDebt,
      });

      const saved = rows?.[0];
      const finalCustomer: CustomerTab = {
        id: saved?.id ? String(saved.id) : `cust-${Date.now()}`,
        name: String(saved?.name || name),
        phone: String(saved?.phone ?? phone ?? ''),
        congregation: String(saved?.congregation ?? congregation ?? ''),
        ministry: String(saved?.ministry ?? ministry ?? ''),
        churchGroup: String(saved?.churchGroup || churchGroup || 'Congregación'),
        balance: typeof saved?.balance === 'number' ? saved.balance : initialBalance,
        debt: typeof saved?.debt === 'number' ? saved.debt : initialDebt,
        movements: saved?.movements || [],
      };

      saveCachedTabProfile(finalCustomer.id, {
        congregation: finalCustomer.congregation || '',
        ministry: finalCustomer.ministry || '',
        churchGroup: finalCustomer.churchGroup || 'Congregación',
        phone: finalCustomer.phone || '',
      });

      set((state) => ({
        customers: [
          finalCustomer,
          ...state.customers.filter((c) => c.id !== finalCustomer.id),
        ],
      }));

      return { success: true, customer: finalCustomer };
    } catch (error: any) {
      console.error('Error al registrar cuenta/fiado en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error de red: No se pudo guardar el cliente en Supabase',
      };
    } finally {
      set({ isMutatingTab: false });
    }
  },

  addCustomer: (name, phone = '', churchGroup = 'Congregación', congregation = '', ministry = '') => {
    return get().addTab({
      name,
      phone: phone ?? '',
      churchGroup: churchGroup ?? 'Congregación',
      congregation: congregation ?? '',
      ministry: ministry ?? '',
    });
  },

  updateCustomer: async (customerId, data) => {
    if (get().isMutatingTab) {
      return { success: false, error: 'Operación en curso, espera un momento...' };
    }

    const cleanName = String(data.name ?? '').trim();
    if (!cleanName) {
      return { success: false, error: 'El nombre del hermano/a no puede estar vacío' };
    }

    const existing = get().customers.find((c) => c.id === customerId);
    if (!existing) {
      return { success: false, error: 'Hermano/a no encontrado' };
    }

    const cleanPhone = String(data.phone ?? '').trim();
    const cleanCongregation = String(data.congregation ?? '').trim();
    const cleanMinistry = String(data.ministry ?? '').trim();
    const composedGroup = [cleanCongregation, cleanMinistry].filter(Boolean).join(' · ');
    const cleanChurchGroup = String(
      data.churchGroup ?? (composedGroup || existing.churchGroup || 'Congregación')
    ).trim();

    set({ isMutatingTab: true });
    try {
      await updateTabProfile(customerId, {
        name: cleanName,
        phone: cleanPhone,
        congregation: cleanCongregation,
        ministry: cleanMinistry,
        churchGroup: cleanChurchGroup,
      });

      saveCachedTabProfile(customerId, {
        congregation: cleanCongregation,
        ministry: cleanMinistry,
        churchGroup: cleanChurchGroup,
        phone: cleanPhone,
      });

      let updatedCustomer: CustomerTab | undefined;
      set((state) => ({
        customers: state.customers.map((c) => {
          if (c.id !== customerId) return c;
          updatedCustomer = {
            ...c,
            name: cleanName,
            phone: cleanPhone,
            congregation: cleanCongregation,
            ministry: cleanMinistry,
            churchGroup: cleanChurchGroup,
          };
          return updatedCustomer;
        }),
      }));

      return { success: true, customer: updatedCustomer };
    } catch (error: any) {
      console.error('Error al actualizar perfil de cliente en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error de red: No se pudo actualizar el perfil en Supabase',
      };
    } finally {
      set({ isMutatingTab: false });
    }
  },

  addPrepaidBalance: async (
    customerId,
    amount,
    description = 'Recarga de saldo prepago',
    paymentMethod = 'efectivo'
  ) => {
    if (get().isMutatingTab) {
      return { success: false, error: 'Operación en curso, espera un momento...' };
    }
    if (!isValidPositiveMoney(amount)) {
      return { success: false, error: 'El monto a recargar debe ser mayor a 0.00€' };
    }

    const customer = get().customers.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    const cleanAmount = roundMoney(amount);
    const updatedBalance = roundMoney(Number(customer.balance || 0) + cleanAmount);
    const currentDebt = roundMoney(Number(customer.debt || 0));

    set({ isMutatingTab: true });
    try {
      await updateTabBalances(customerId, currentDebt, updatedBalance);

      const mov: TabMovement = {
        id: `mov-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'recarga',
        amount: cleanAmount,
        description,
        paymentMethod,
      };

      let updatedCustomer: CustomerTab | undefined;
      set((state) => ({
        customers: state.customers.map((c) => {
          if (c.id !== customerId) return c;
          updatedCustomer = {
            ...c,
            balance: updatedBalance,
            movements: [mov, ...(c.movements || [])],
          };
          return updatedCustomer;
        }),
      }));

      return { success: true, customer: updatedCustomer };
    } catch (err: any) {
      console.error('Error al sincronizar saldo prepago en Supabase:', err);
      return {
        success: false,
        error: err?.message || 'Error de red: No se pudo guardar la recarga en Supabase',
      };
    } finally {
      set({ isMutatingTab: false });
    }
  },

  payDebt: async (
    customerId,
    amount,
    description = 'Abono de deuda pendiente',
    paymentMethod = 'efectivo'
  ) => {
    if (get().isMutatingTab) {
      return { success: false, error: 'Operación en curso, espera un momento...' };
    }
    if (!isValidPositiveMoney(amount)) {
      return { success: false, error: 'El monto del abono debe ser estrictamente mayor a 0.00€' };
    }

    const customer = get().customers.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    const cleanAmount = roundMoney(amount);
    const currentDebt = roundMoney(Number(customer.debt || 0));

    // Blindaje QA: comparación entera en céntimos evita falsos bloqueos/permisos por float
    if (currentDebt <= 0 || toCents(cleanAmount) > toCents(currentDebt)) {
      return {
        success: false,
        error: `El abono (${cleanAmount.toFixed(2)}€) no puede superar la deuda actual (${currentDebt.toFixed(2)}€)`,
      };
    }

    const newDebt = Math.max(0, roundMoney(currentDebt - cleanAmount));
    const newBalance = roundMoney(Number(customer.balance || 0));

    set({ isMutatingTab: true });
    try {
      const savedPayments = await insertTabPayment({
        tab_id: customerId,
        customer_name: customer.name,
        amount: cleanAmount,
        payment_method: paymentMethod,
        description,
      });

      await updateTabBalances(customerId, newDebt, newBalance);

      const savedRow = savedPayments?.[0];
      const paymentTimestamp = savedRow?.timestamp || new Date().toISOString();
      const paymentId = savedRow?.id ? String(savedRow.id) : `mov-${Date.now()}`;

      const mov: TabMovement = {
        id: paymentId,
        timestamp: paymentTimestamp,
        type: 'pago',
        amount: cleanAmount,
        description,
        paymentMethod,
      };

      let updatedCustomer: CustomerTab | undefined;
      set((state) => ({
        customers: state.customers.map((c) => {
          if (c.id !== customerId) return c;
          updatedCustomer = {
            ...c,
            debt: newDebt,
            balance: newBalance,
            movements: [mov, ...(c.movements || [])],
          };
          return updatedCustomer;
        }),
      }));

      // Sincronizar inmediatamente con las métricas del turno activo en useCloseoutStore
      useCloseoutStore.getState().addTabPayment({
        id: paymentId,
        tabId: customerId,
        customerName: customer.name,
        amount: cleanAmount,
        paymentMethod,
        timestamp: paymentTimestamp,
        description,
      });
      useCloseoutStore.getState().loadShiftTabPayments().catch(() => {});

      return { success: true, customer: updatedCustomer };
    } catch (error: any) {
      console.error('Error al registrar abono/pago en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error de red: No se pudo registrar el abono en Supabase',
      };
    } finally {
      set({ isMutatingTab: false });
    }
  },

  payTab: (customerIdOrData, amount, description, paymentMethod) => {
    if (typeof customerIdOrData === 'object' && customerIdOrData !== null) {
      const id = customerIdOrData.customerId || customerIdOrData.tabId || '';
      const amt = customerIdOrData.amount;
      const desc = customerIdOrData.description || 'Abono de deuda pendiente';
      const method = customerIdOrData.paymentMethod || 'efectivo';
      return get().payDebt(id, amt, desc, method);
    }
    return get().payDebt(customerIdOrData, amount ?? 0, description, paymentMethod);
  },

  addPayment: (customerIdOrData, amount, description, paymentMethod) => {
    return get().payTab(customerIdOrData, amount, description, paymentMethod);
  },

  chargeSaleToTab: (customerId, sale) => {
    let finalBalance = 0;
    let finalDebt = 0;
    let prepaidUsed = 0;
    let netTabDebt = roundMoney(sale.total);

    set({
      customers: get().customers.map((c) => {
        if (c.id !== customerId) return c;
        let remBalance = roundMoney(Number(c.balance || 0));
        let remDebt = roundMoney(Number(c.debt || 0));

        if (remDebt < 0) {
          remBalance = roundMoney(remBalance + Math.abs(remDebt));
          remDebt = 0;
        }

        prepaidUsed = roundMoney(Math.min(Math.max(0, remBalance), sale.total));
        netTabDebt = roundMoney(Math.max(0, sale.total - prepaidUsed));

        remBalance = roundMoney(Math.max(0, remBalance - prepaidUsed));
        remDebt = roundMoney(remDebt + netTabDebt);

        finalBalance = remBalance;
        finalDebt = remDebt;

        const breakdownSuffix =
          prepaidUsed > 0
            ? ` (Saldo previo: -${prepaidUsed.toFixed(2)}€, Deuda nueva: ${netTabDebt.toFixed(2)}€)`
            : '';

        const mov: TabMovement = {
          id: `mov-${Date.now()}`,
          timestamp: sale.timestamp,
          type: 'deuda',
          amount: sale.total,
          description: `Consumo: ${sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}${breakdownSuffix}`,
          saleId: sale.id,
        };

        return {
          ...c,
          balance: remBalance,
          debt: remDebt,
          movements: [mov, ...(c.movements || [])],
        };
      }),
    });

    updateTabBalances(customerId, finalDebt, finalBalance).catch((err) => {
      console.error('Error al registrar cargo de fiado en Supabase:', err);
    });

    return { newBalance: finalBalance, newDebt: finalDebt, prepaidUsed, netTabDebt };
  },

  revertSaleFromTab: async (sale) => {
    if (sale.paymentMethod !== 'fiado') return;
    const customer = get().customers.find(
      (c) =>
        (sale.customerTabId && c.id === sale.customerTabId) ||
        (sale.customerName && c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase())
    );
    if (!customer) return;

    const saleTotal = roundMoney(Number(sale.total || 0));
    const prepaidRestored =
      typeof sale.prepaidUsed === 'number' && !isNaN(sale.prepaidUsed)
        ? Math.max(0, Math.min(saleTotal, roundMoney(sale.prepaidUsed)))
        : 0;
    const netDebtToRevert =
      typeof sale.netTabDebt === 'number' && !isNaN(sale.netTabDebt)
        ? Math.max(0, Math.min(saleTotal, roundMoney(sale.netTabDebt)))
        : roundMoney(Math.max(0, saleTotal - prepaidRestored));

    const newBalance = roundMoney(Math.max(0, Number(customer.balance || 0)) + prepaidRestored);
    const newDebt = roundMoney(Math.max(0, Number(customer.debt || 0) - netDebtToRevert));

    const reversalMov: TabMovement = {
      id: `mov-void-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'pago',
      amount: saleTotal,
      description: `Anulación Ticket #${sale.id.slice(-6)} (Saldo rest.: +${prepaidRestored.toFixed(2)}€ / Deuda rev.: -${netDebtToRevert.toFixed(2)}€)`,
      saleId: sale.id,
    };

    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              balance: newBalance,
              debt: newDebt,
              movements: [reversalMov, ...(c.movements || [])],
            }
          : c
      ),
    }));

    try {
      await updateTabBalances(customer.id, newDebt, newBalance);
    } catch (err) {
      console.error('Error al revertir saldo/deuda de fiado anulado en Supabase:', err);
    }
  },

  generateReceiptText: (customer, sale, abonoAmount) => {
    const customerName = (customer?.name || sale?.customerName || 'Hermano/a').trim();
    const currentDebt = Number(customer?.debt ?? sale?.netTabDebt ?? 0);
    const debtStr = `${currentDebt.toFixed(2)}€`;

    const lastPayment = customer?.movements?.find((m) => m.type === 'pago' && !m.saleId);
    const effectiveAbono =
      typeof abonoAmount === 'number' && abonoAmount > 0
        ? abonoAmount
        : !sale && customer?.movements?.[0]?.type === 'pago'
        ? lastPayment?.amount
        : undefined;

    // Plantilla C (Abono de Deuda)
    if (effectiveAbono !== undefined && effectiveAbono > 0) {
      const cantidadStr = `${effectiveAbono.toFixed(2)}€`;
      return `¡Hola, ${customerName}! 👋 Confirmamos tu abono de ${cantidadStr} en El Chiringuito.\n📝 Tu nuevo saldo pendiente es de: ${debtStr}.\n¡Muchísimas gracias! Bendiciones. ✨`;
    }

    // Construir lista de productos
    const lastDebtMov = customer?.movements?.find((m) => m.type === 'deuda');
    let itemsText = '';
    if (sale && sale.items && sale.items.length > 0) {
      itemsText = sale.items
        .map((i) => {
          const unitPrice = Number(i.customPrice ?? i.product?.price ?? 0);
          return `• ${i.quantity}x ${i.product?.name || 'Producto'} (${(unitPrice * i.quantity).toFixed(2)}€)`;
        })
        .join('\n');
    } else if (lastDebtMov?.description) {
      itemsText = `• ${lastDebtMov.description.replace(/^Consumo:\s*/i, '')}`;
    } else {
      itemsText = '• Consumo en cafetería';
    }

    const totalNum = sale
      ? Number(sale.total || 0)
      : lastDebtMov
      ? Number(lastDebtMov.amount || 0)
      : currentDebt;
    const totalStr = `${totalNum.toFixed(2)}€`;

    // Plantilla A (Venta Efectivo/Datáfono)
    if (sale && sale.paymentMethod !== 'fiado') {
      return `¡Hola! 👋 Aquí tienes el detalle de lo que disfrutaste hoy en El Chiringuito.\n${itemsText}\nTotal: ${totalStr}\n¡Gracias por compartir este rato con nosotros! ✨`;
    }

    // Plantilla B (Venta a Fiado)
    return `¡Hola, ${customerName}! 👋 Te dejamos el resumen de tu consumo de hoy en El Chiringuito:\n${itemsText}\nTotal del ticket: ${totalStr}\n📝 Tu saldo pendiente actualizado es de: ${debtStr}.\n¡Gracias por tu apoyo! 🙌`;
  },

  getWhatsAppShareUrl: (phone, text) => {
    const cleanPhone = (phone || '').replace(/[^\d+]/g, '');
    const encoded = encodeURIComponent(text);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  },
}));
