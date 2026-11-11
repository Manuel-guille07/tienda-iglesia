import { create } from 'zustand';
import { CustomerTab, Sale, TabMovement } from '../types';
import { getTabs, insertTab, insertTabPayment, updateTabBalances } from '../services/db';

interface TabState {
  customers: CustomerTab[];
  searchQuery: string;
  selectedCustomerId: string | null;

  loadTabs: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCustomerId: (id: string | null) => void;

  addCustomer: (name: string, phone: string, churchGroup?: string) => CustomerTab;
  addTab: (
    nameOrData: string | { name: string; phone?: string; churchGroup?: string; balance?: number; debt?: number },
    phone?: string,
    churchGroup?: string
  ) => CustomerTab;
  addPrepaidBalance: (customerId: string, amount: number, description?: string, paymentMethod?: 'efectivo' | 'datafono') => void;
  payDebt: (customerId: string, amount: number, description?: string, paymentMethod?: 'efectivo' | 'datafono') => void;
  payTab: (
    customerIdOrData: string | { customerId?: string; tabId?: string; amount: number; description?: string; paymentMethod?: 'efectivo' | 'datafono' },
    amount?: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => void;
  addPayment: (
    customerIdOrData: string | { customerId?: string; tabId?: string; amount: number; description?: string; paymentMethod?: 'efectivo' | 'datafono' },
    amount?: number,
    description?: string,
    paymentMethod?: 'efectivo' | 'datafono'
  ) => void;
  chargeSaleToTab: (customerId: string, sale: Sale) => { newBalance: number; newDebt: number };

  generateReceiptText: (customer: CustomerTab, sale?: Sale) => string;
  getWhatsAppShareUrl: (phone: string, text: string) => string;
}

export const useTabStore = create<TabState>((set, get) => ({
  customers: [],
  searchQuery: '',
  selectedCustomerId: null,

  loadTabs: async () => {
    try {
      const data = await getTabs();
      if (data && data.length > 0) {
        set({ customers: data as CustomerTab[] });
      }
    } catch (error) {
      console.error('[useTabStore] Error al cargar tabs desde Supabase:', error);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

  addTab: (nameOrData, phoneArg, churchGroupArg) => {
    let name: string;
    let phone: string;
    let churchGroup: string;
    let initialBalance = 0;
    let initialDebt = 0;

    if (typeof nameOrData === 'object' && nameOrData !== null) {
      name = nameOrData.name;
      phone = nameOrData.phone || '';
      churchGroup = nameOrData.churchGroup || 'Congregación';
      initialBalance = nameOrData.balance ?? 0;
      initialDebt = nameOrData.debt ?? 0;
    } else {
      name = nameOrData;
      phone = phoneArg || '';
      churchGroup = churchGroupArg || 'Congregación';
    }

    const newCustomer: CustomerTab = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      churchGroup,
      balance: initialBalance,
      debt: initialDebt,
      movements: [],
    };

    set({ customers: [newCustomer, ...get().customers] });

    insertTab({
      id: newCustomer.id,
      name: newCustomer.name,
      phone: newCustomer.phone,
      church_group: newCustomer.churchGroup,
      balance: newCustomer.balance,
      debt: newCustomer.debt,
    })
      .then((rows) => {
        if (rows && rows[0]?.id) {
          const realId = rows[0].id;
          set((state) => ({
            customers: state.customers.map((c) => (c.id === newCustomer.id ? { ...c, id: realId } : c)),
          }));
        }
      })
      .catch((error) => {
        console.error('Error al registrar cuenta/fiado en Supabase:', error);
      });

    return newCustomer;
  },

  addCustomer: (name, phone, churchGroup) => {
    return get().addTab(name, phone, churchGroup);
  },

  addPrepaidBalance: (customerId, amount, description = 'Recarga de saldo prepago', paymentMethod = 'efectivo') => {
    let updatedBalance = 0;
    let currentDebt = 0;

    set({
      customers: get().customers.map((c) => {
        if (c.id !== customerId) return c;
        const mov: TabMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'recarga',
          amount,
          description,
          paymentMethod,
        };
        updatedBalance = Number((c.balance + amount).toFixed(2));
        currentDebt = c.debt;
        return {
          ...c,
          balance: updatedBalance,
          movements: [mov, ...c.movements],
        };
      }),
    });

    updateTabBalances(customerId, currentDebt, updatedBalance).catch((err) => {
      console.error('Error al sincronizar saldo prepago en Supabase:', err);
    });
  },

  payDebt: (customerId, amount, description = 'Abono de deuda pendiente', paymentMethod = 'efectivo') => {
    const customer = get().customers.find((c) => c.id === customerId);
    let newDebt = 0;
    let newBalance = 0;

    set({
      customers: get().customers.map((c) => {
        if (c.id !== customerId) return c;
        newDebt = Math.max(0, Number((c.debt - amount).toFixed(2)));
        const surplus = amount > c.debt ? Number((amount - c.debt).toFixed(2)) : 0;
        newBalance = Number((c.balance + surplus).toFixed(2));
        const mov: TabMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'pago',
          amount,
          description,
          paymentMethod,
        };
        return {
          ...c,
          debt: newDebt,
          balance: newBalance,
          movements: [mov, ...c.movements],
        };
      }),
    });

    insertTabPayment({
      tab_id: customerId,
      customer_name: customer?.name,
      amount,
      payment_method: paymentMethod,
      description,
    }).catch((error) => {
      console.error('Error al registrar abono/pago en Supabase:', error);
    });

    updateTabBalances(customerId, newDebt, newBalance).catch((err) => {
      console.error('Error al sincronizar deuda en Supabase:', err);
    });
  },

  payTab: (customerIdOrData, amount, description, paymentMethod) => {
    if (typeof customerIdOrData === 'object' && customerIdOrData !== null) {
      const id = customerIdOrData.customerId || customerIdOrData.tabId || '';
      const amt = customerIdOrData.amount;
      const desc = customerIdOrData.description || 'Abono de deuda pendiente';
      const method = customerIdOrData.paymentMethod || 'efectivo';
      get().payDebt(id, amt, desc, method);
    } else {
      get().payDebt(customerIdOrData, amount ?? 0, description, paymentMethod);
    }
  },

  addPayment: (customerIdOrData, amount, description, paymentMethod) => {
    get().payTab(customerIdOrData, amount, description, paymentMethod);
  },

  chargeSaleToTab: (customerId, sale) => {
    let finalBalance = 0;
    let finalDebt = 0;

    set({
      customers: get().customers.map((c) => {
        if (c.id !== customerId) return c;
        let remBalance = c.balance;
        let remDebt = c.debt;

        if (remBalance >= sale.total) {
          remBalance = Number((remBalance - sale.total).toFixed(2));
        } else {
          const diff = sale.total - remBalance;
          remBalance = 0;
          remDebt = Number((remDebt + diff).toFixed(2));
        }

        finalBalance = remBalance;
        finalDebt = remDebt;

        const mov: TabMovement = {
          id: `mov-${Date.now()}`,
          timestamp: sale.timestamp,
          type: 'deuda',
          amount: sale.total,
          description: `Consumo: ${sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}`,
          saleId: sale.id,
        };

        return {
          ...c,
          balance: remBalance,
          debt: remDebt,
          movements: [mov, ...c.movements],
        };
      }),
    });

    updateTabBalances(customerId, finalDebt, finalBalance).catch((err) => {
      console.error('Error al registrar cargo de fiado en Supabase:', err);
    });

    return { newBalance: finalBalance, newDebt: finalDebt };
  },

  generateReceiptText: (customer, sale) => {
    const lastPayment = customer.movements?.find((m) => m.type === 'pago');
    const isPaymentReceipt = !sale && !!lastPayment;
    const dateFormatted = new Date(sale?.timestamp || lastPayment?.timestamp || Date.now()).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (isPaymentReceipt && lastPayment) {
      const methodStr = lastPayment.paymentMethod === 'datafono' ? 'Datáfono / Tarjeta 💳' : 'Efectivo 💶';
      return `🧾 *JUSTIFICANTE DE ABONO / CAFETERÍA IGLESIA* ☕
--------------------------------------------
👤 *Hermano/a:* ${customer.name}
⛪ *Ministerio/Grupo:* ${customer.churchGroup || 'Congregación'}
📅 *Fecha:* ${dateFormatted}
--------------------------------------------
💵 *Concepto:* ${lastPayment.description || 'Abono de deuda pendiente'}
💳 *Método de Pago:* ${methodStr}
💰 *Importe Abonado:* ${lastPayment.amount.toFixed(2)}€
--------------------------------------------
📊 *Estado Actual de la Cuenta:*
${customer.debt > 0 ? `⚠️ *Deuda Pendiente Restante:* ${customer.debt.toFixed(2)}€\n` : '✅ *¡Deuda totalmente saldada!*\n'}${customer.balance > 0 ? `🎁 *Saldo a Favor:* ${customer.balance.toFixed(2)}€\n` : ''}${customer.debt === 0 && customer.balance === 0 ? '✨ *Cuenta al día (Saldo: 0.00€)*\n' : ''}
🙏 _¡Muchas gracias por tu compromiso y bendición a la obra de Dios!_`;
    }

    let itemsText = '';
    if (sale && sale.items.length > 0) {
      itemsText = sale.items
        .map((i) => `• ${i.quantity}x ${i.product.name} (${(i.product.price * i.quantity).toFixed(2)}€)`)
        .join('\n');
    } else {
      itemsText = '• Estado de cuenta general';
    }

    const totalStr = sale ? `${sale.total.toFixed(2)}€` : 'N/A';

    return `🧾 *RECIBO CHIRINGUITO / CAFETERÍA IGLESIA* ☕
--------------------------------------------
👤 *Cliente:* ${customer.name}
⛪ *Ministerio/Grupo:* ${customer.churchGroup || 'Congregación'}
📅 *Fecha:* ${dateFormatted}
--------------------------------------------
🛒 *Detalle de Consumo:*
${itemsText}
--------------------------------------------
💰 *Total:* ${totalStr}
💳 *Método:* Fiado / Cuenta Personal

📊 *Estado Actual de la Cuenta:*
${customer.balance > 0 ? `✅ *Saldo a Favor:* ${customer.balance.toFixed(2)}€\n` : ''}${customer.debt > 0 ? `⚠️ *Deuda Pendiente:* ${customer.debt.toFixed(2)}€\n` : ''}${customer.balance === 0 && customer.debt === 0 ? '✨ *Cuenta al día (Saldo: 0.00€)*\n' : ''}
🙏 _¡Muchas gracias por tu generosidad y apoyo a la iglesia! Dios te bendiga grandemente._`;
  },

  getWhatsAppShareUrl: (phone, text) => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const encoded = encodeURIComponent(text);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  },
}));
