import { supabase } from '../lib/supabase';

// ============================================================================
// UTILIDADES PARA VALIDACIÓN Y SANEAMIENTO DE UUID (EVITAR ERROR 22P02 EN POSTGRES)
// ============================================================================

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Retorna el UUID limpio si es un UUID v4 válido y NO contiene prefijos locales.
 * Si es un ID local ('sale-', 'tab-', 'pay-', 'close-', 'raw-', 'cust-', etc.)
 * o no tiene formato UUID válido, retorna null para que se delegue a Supabase.
 */
export function cleanUUID(id: any): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  // Descartar prefijos locales explícitamente
  if (/^(sale|tab|pay|close|raw|cust|inc|user|prod|mov)-/i.test(trimmed)) {
    return null;
  }
  // Verificar formato estándar UUID
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function isValidUUID(id: any): boolean {
  return cleanUUID(id) !== null;
}

/**
 * Genera un UUID v4 estándar en el cliente si fuera necesario.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// HELPERS PARA MAPEO BIDIRECCIONAL ALINEADOS AL ESQUEMA REAL DE SUPABASE
// ============================================================================

// 1. RAW MATERIALS
// Esquema: name, unit, current_stock, min_stock_alert, cost_per_unit, is_available, category, is_sellable, is_quick_access, price
export function toRawMaterialSnake(item: Record<string, any>) {
  const isOutOfStock = Boolean(item.isOutOfStock ?? item.is_out_of_stock ?? false);
  const isAvailable = typeof item.is_available === 'boolean' ? item.is_available : !isOutOfStock;
  const minStockAlert = Number(item.min_stock_alert ?? item.minStock ?? item.min_stock ?? 0);
  const isSellable = typeof item.is_sellable === 'boolean'
    ? item.is_sellable
    : (typeof item.isSellable === 'boolean' ? item.isSellable : true);
  const isQuickAccess = typeof item.is_quick_access === 'boolean'
    ? item.is_quick_access
    : (typeof item.isQuickAccess === 'boolean' ? item.isQuickAccess : (item.isPreset ?? false));
  const priceVal = typeof item.price === 'number' ? item.price : null;

  const payload: Record<string, any> = {
    name: item.name,
    unit: item.unit,
    current_stock: Number(item.current_stock ?? item.currentStock ?? 0),
    min_stock_alert: minStockAlert,
    cost_per_unit: Number(item.cost_per_unit ?? item.costPerUnit ?? 0),
    is_available: isAvailable,
    category: item.category || 'cafeteria',
    is_sellable: isSellable,
    is_quick_access: isQuickAccess,
    price: priceVal,
  };

  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }

  return payload;
}

export function fromRawMaterialSnake(row: Record<string, any>) {
  const currentStock = Number(row.current_stock ?? row.currentStock ?? 0);
  const minStock = Number(row.min_stock_alert ?? row.min_stock ?? row.minStock ?? 0);
  const costPerUnit = Number(row.cost_per_unit ?? row.costPerUnit ?? 0);

  const isAvailable = typeof row.is_available === 'boolean'
    ? row.is_available
    : !(row.is_out_of_stock ?? row.isOutOfStock ?? false);
  const isOutOfStock = !isAvailable;

  const isSellable = typeof row.is_sellable === 'boolean'
    ? row.is_sellable
    : (typeof row.isSellable === 'boolean' ? row.isSellable : true);

  const isQuickAccess = typeof row.is_quick_access === 'boolean'
    ? row.is_quick_access
    : (typeof row.isQuickAccess === 'boolean' ? row.isQuickAccess : (row.is_preset ?? row.isPreset ?? false));

  return {
    id: String(row.id),
    name: row.name,
    unit: row.unit,
    currentStock,
    minStock,
    costPerUnit,
    isOutOfStock,
    category: row.category || 'cafeteria',
    isSellable,
    is_sellable: isSellable,
    isQuickAccess,
    is_quick_access: isQuickAccess,
    price: typeof row.price === 'number' ? row.price : undefined,
    // Compatibilidad bidireccional
    current_stock: currentStock,
    min_stock: minStock,
    min_stock_alert: minStock,
    cost_per_unit: costPerUnit,
    is_available: isAvailable,
    is_out_of_stock: isOutOfStock,
  };
}

// 2. SALES
// Esquema: total, payment_method, donation_sub_method, user_name, user_role
export function toSaleSnake(item: Record<string, any>) {
  const payload: Record<string, any> = {
    total: Number(item.total ?? 0),
    payment_method: item.payment_method ?? item.paymentMethod ?? 'efectivo',
    user_name: item.user_name ?? item.seller_name ?? item.sellerName ?? 'Vendedor',
    user_role: item.user_role ?? item.seller_role ?? item.sellerRole ?? 'Vendedor',
  };

  if (item.donation_sub_method || item.donationSubMethod) {
    payload.donation_sub_method = item.donation_sub_method ?? item.donationSubMethod;
  }

  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }

  return payload;
}

export function fromSaleSnake(row: Record<string, any>) {
  const total = Number(row.total ?? 0);
  const paymentMethod = row.payment_method ?? row.paymentMethod ?? 'efectivo';
  const donationSubMethod = row.donation_sub_method ?? row.donationSubMethod ?? null;
  const userName = row.user_name ?? row.seller_name ?? row.sellerName ?? 'Vendedor';
  const userRole = row.user_role ?? row.seller_role ?? row.sellerRole ?? 'Vendedor';

  return {
    id: String(row.id),
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    total,
    paymentMethod,
    payment_method: paymentMethod,
    donationSubMethod,
    donation_sub_method: donationSubMethod,
    sellerName: userName,
    sellerRole: userRole,
    user_name: userName,
    user_role: userRole,
    notes: row.notes || '',
    items: [],
  };
}

// 3. TABS (Fiados)
// Esquema: client_name, phone, debt_amount, prepaid_amount
export function toTabSnake(item: Record<string, any>) {
  const payload: Record<string, any> = {
    client_name: item.client_name ?? item.name ?? '',
    phone: item.phone || '',
    debt_amount: Number(item.debt_amount ?? item.debt ?? 0),
    prepaid_amount: Number(item.prepaid_amount ?? item.balance ?? 0),
  };

  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }

  return payload;
}

export function fromTabSnake(row: Record<string, any>) {
  const clientName = row.client_name ?? row.name ?? '';
  const debt = Number(row.debt_amount ?? row.debt ?? 0);
  const balance = Number(row.prepaid_amount ?? row.balance ?? 0);
  const churchGroup = row.church_group ?? row.churchGroup ?? 'Congregación';

  let movements = [];
  try {
    movements = typeof row.movements === 'string' ? JSON.parse(row.movements) : (row.movements || []);
  } catch {
    movements = [];
  }

  return {
    id: String(row.id),
    name: clientName,
    client_name: clientName,
    phone: row.phone || '',
    balance,
    prepaid_amount: balance,
    debt,
    debt_amount: debt,
    churchGroup,
    church_group: churchGroup,
    movements,
  };
}

// 4. TAB PAYMENTS (Abonos)
// Esquema: tab_id, client_name, amount, payment_method
export function toTabPaymentSnake(item: Record<string, any>) {
  const payload: Record<string, any> = {
    client_name: item.client_name ?? item.customer_name ?? item.customerName ?? '',
    amount: Number(item.amount ?? 0),
    payment_method: item.payment_method ?? item.paymentMethod ?? 'efectivo',
  };

  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }

  // Saneamiento estricto de Foreign Key (tab_id): solo si es un UUID válido
  const validTabId = cleanUUID(item.tab_id ?? item.tabId);
  if (validTabId) {
    payload.tab_id = validTabId;
  }

  return payload;
}

export function fromTabPaymentSnake(row: Record<string, any>) {
  const clientName = row.client_name ?? row.customer_name ?? row.customerName ?? '';
  const paymentMethod = row.payment_method ?? row.paymentMethod ?? 'efectivo';
  const tabId = row.tab_id ?? row.tabId ?? '';

  return {
    id: String(row.id),
    tabId,
    tab_id: tabId,
    clientName,
    client_name: clientName,
    customerName: clientName,
    customer_name: clientName,
    amount: Number(row.amount ?? 0),
    paymentMethod,
    payment_method: paymentMethod,
    description: row.description || '',
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
  };
}

// 5. CLOSEOUTS (Cierres de Caja)
// Esquema: closed_by_user, closed_by_role, expected_cash, counted_cash, card_total, tabs_cash, tabs_card, discrepancy
export function toCloseoutSnake(item: Record<string, any>) {
  const payload: Record<string, any> = {
    closed_by_user: item.closed_by_user ?? item.closedBy ?? '',
    closed_by_role: item.closed_by_role ?? item.role ?? 'Vendedor',
    expected_cash: Number(item.expected_cash ?? item.expectedCash ?? 0),
    counted_cash: Number(item.counted_cash ?? item.actualCash ?? 0),
    card_total: Number(item.card_total ?? item.totalCard ?? 0),
    tabs_cash: Number(item.tabs_cash ?? item.tabPaymentsCash ?? 0),
    tabs_card: Number(item.tabs_card ?? item.tabPaymentsCard ?? 0),
    discrepancy: Number(item.discrepancy ?? item.difference ?? 0),
  };

  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }

  return payload;
}

export function fromCloseoutSnake(row: Record<string, any>) {
  const closedBy = row.closed_by_user ?? row.closedBy ?? '';
  const role = row.closed_by_role ?? row.role ?? 'Vendedor';
  const expectedCash = Number(row.expected_cash ?? row.expectedCash ?? 0);
  const actualCash = Number(row.counted_cash ?? row.actualCash ?? 0);
  const totalCard = Number(row.card_total ?? row.totalCard ?? 0);
  const tabPaymentsCash = Number(row.tabs_cash ?? row.tabPaymentsCash ?? 0);
  const tabPaymentsCard = Number(row.tabs_card ?? row.tabPaymentsCard ?? 0);
  const difference = Number(row.discrepancy ?? row.difference ?? 0);

  return {
    id: String(row.id),
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    closedBy,
    closed_by_user: closedBy,
    role,
    closed_by_role: role,
    expectedCash,
    expected_cash: expectedCash,
    actualCash,
    counted_cash: actualCash,
    totalCard,
    card_total: totalCard,
    tabPaymentsCash,
    tabs_cash: tabPaymentsCash,
    tabPaymentsCard,
    tabs_card: tabPaymentsCard,
    difference,
    discrepancy: difference,
  };
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS (CRUD RESILIENTES)
// ============================================================================

// --- RAW MATERIALS ---
export async function getRawMaterials() {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*');

    if (error) {
      console.warn('[Supabase] getRawMaterials warning:', error);
      return [];
    }
    return (data || []).map(fromRawMaterialSnake);
  } catch (err) {
    console.warn('[Supabase] getRawMaterials catch:', err);
    return [];
  }
}

export async function insertRawMaterial(material: Record<string, any> | Record<string, any>[]) {
  try {
    const items = Array.isArray(material) ? material : [material];
    const payload = items.map(toRawMaterialSnake);

    const allHaveValidId = payload.length > 0 && payload.every((p) => Boolean(p.id));

    const query = allHaveValidId
      ? supabase.from('raw_materials').upsert(payload, { onConflict: 'id' })
      : supabase.from('raw_materials').insert(payload);

    const { data, error } = await query.select();

    if (error) {
      console.warn('[Supabase] insertRawMaterial warning:', error.message);
      throw error;
    }
    return (data || []).map(fromRawMaterialSnake);
  } catch (err: any) {
    console.warn('[Supabase] insertRawMaterial catch:', err);
    throw err;
  }
}

export const insertRawMaterials = insertRawMaterial;

/**
 * Actualiza el stock actual y la disponibilidad de un insumo directamente en Supabase
 */
export async function updateRawMaterialStock(materialId: string, newStock: number) {
  try {
    const validId = cleanUUID(materialId);
    if (!validId) return false;

    const stock = Math.max(0, Number(newStock));
    const isAvailable = stock > 0;

    const { error } = await supabase
      .from('raw_materials')
      .update({
        current_stock: stock,
        is_available: isAvailable,
      })
      .eq('id', validId);

    if (error) {
      console.warn('[Supabase] updateRawMaterialStock warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] updateRawMaterialStock catch:', err);
    return false;
  }
}

/**
 * Descuenta unidades de stock de forma atómica en Supabase mediante RPC 'decrement_stock'
 */
export async function decrementStock(p_item_id: string, p_qty: number): Promise<boolean> {
  try {
    const validId = cleanUUID(p_item_id);
    if (!validId) return false;

    const qty = Number(p_qty);
    if (isNaN(qty) || qty <= 0) return false;

    const { error } = await supabase.rpc('decrement_stock', {
      p_item_id: validId,
      p_qty: qty,
    });

    if (error) {
      console.warn('[Supabase] decrement_stock RPC warning:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] decrementStock catch:', err);
    throw err;
  }
}

/**
 * Incrementa/restaura unidades de stock de forma atómica en Supabase mediante RPC 'increment_stock'
 */
export async function incrementStock(p_item_id: string, p_qty: number): Promise<boolean> {
  try {
    const validId = cleanUUID(p_item_id);
    if (!validId) return false;

    const qty = Number(p_qty);
    if (isNaN(qty) || qty <= 0) return false;

    const { error } = await supabase.rpc('increment_stock', {
      p_item_id: validId,
      p_qty: qty,
    });

    if (error) {
      console.warn('[Supabase] increment_stock RPC warning:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] incrementStock catch:', err);
    throw err;
  }
}

/**
 * Elimina un insumo/producto directamente de Supabase
 */
export async function deleteRawMaterial(materialId: string): Promise<boolean> {
  try {
    const validId = cleanUUID(materialId);
    if (!validId) return false;

    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', validId);

    if (error) {
      console.warn('[Supabase] deleteRawMaterial warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] deleteRawMaterial catch:', err);
    return false;
  }
}

// --- SALES ---
export async function getSales() {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] getSales warning:', error);
      return [];
    }
    return (data || []).map(fromSaleSnake);
  } catch (err) {
    console.warn('[Supabase] getSales catch:', err);
    return [];
  }
}

export async function insertSale(sale: Record<string, any> | Record<string, any>[]) {
  try {
    const items = Array.isArray(sale) ? sale : [sale];
    const payload = items.map(toSaleSnake);

    const allHaveValidId = payload.length > 0 && payload.every((p) => Boolean(p.id));

    const query = allHaveValidId
      ? supabase.from('sales').upsert(payload, { onConflict: 'id' })
      : supabase.from('sales').insert(payload);

    const { data, error } = await query.select();

    if (error) {
      console.warn('[Supabase] insertSale warning:', error);
      return null;
    }
    return (data || []).map(fromSaleSnake);
  } catch (err) {
    console.warn('[Supabase] insertSale catch:', err);
    return null;
  }
}

export const insertSales = insertSale;

/**
 * Elimina o anula una venta en Supabase
 */
export async function deleteSale(saleId: string): Promise<boolean> {
  try {
    const validId = cleanUUID(saleId);
    if (!validId) return false;

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', validId);

    if (error) {
      console.warn('[Supabase] deleteSale warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] deleteSale catch:', err);
    return false;
  }
}

// --- TABS ---
export async function getTabs() {
  try {
    const { data, error } = await supabase
      .from('tabs')
      .select('*');

    if (error) {
      console.warn('[Supabase] getTabs warning:', error);
      return [];
    }
    return (data || []).map(fromTabSnake);
  } catch (err) {
    console.warn('[Supabase] getTabs catch:', err);
    return [];
  }
}

export async function insertTab(tab: Record<string, any> | Record<string, any>[]) {
  try {
    const items = Array.isArray(tab) ? tab : [tab];
    const payload = items.map(toTabSnake);

    const allHaveValidId = payload.length > 0 && payload.every((p) => Boolean(p.id));

    const query = allHaveValidId
      ? supabase.from('tabs').upsert(payload, { onConflict: 'id' })
      : supabase.from('tabs').insert(payload);

    const { data, error } = await query.select();

    if (error) {
      console.warn('[Supabase] insertTab warning:', error);
      return null;
    }
    return (data || []).map(fromTabSnake);
  } catch (err) {
    console.warn('[Supabase] insertTab catch:', err);
    return null;
  }
}

export const insertTabs = insertTab;

/**
 * Actualiza los saldos (deuda y prepago) de un cliente/fiado en Supabase
 */
export async function updateTabBalances(tabId: string, debtAmount: number, prepaidAmount: number): Promise<boolean> {
  try {
    const validId = cleanUUID(tabId);
    if (!validId) return false;

    const { error } = await supabase
      .from('tabs')
      .update({
        debt_amount: Number(debtAmount || 0),
        prepaid_amount: Number(prepaidAmount || 0),
      })
      .eq('id', validId);

    if (error) {
      console.warn('[Supabase] updateTabBalances warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] updateTabBalances catch:', err);
    return false;
  }
}

// --- TAB PAYMENTS ---
export async function getTabPayments() {
  try {
    const { data, error } = await supabase
      .from('tab_payments')
      .select('*');

    if (error) {
      console.warn('[Supabase] getTabPayments warning:', error);
      return [];
    }
    return (data || []).map(fromTabPaymentSnake);
  } catch (err) {
    console.warn('[Supabase] getTabPayments catch:', err);
    return [];
  }
}

export async function insertTabPayment(payment: Record<string, any> | Record<string, any>[]) {
  try {
    const items = Array.isArray(payment) ? payment : [payment];
    const payload = items.map(toTabPaymentSnake);

    const allHaveValidId = payload.length > 0 && payload.every((p) => Boolean(p.id));

    const query = allHaveValidId
      ? supabase.from('tab_payments').upsert(payload, { onConflict: 'id' })
      : supabase.from('tab_payments').insert(payload);

    const { data, error } = await query.select();

    if (error) {
      console.warn('[Supabase] insertTabPayment warning:', error);
      return null;
    }
    return (data || []).map(fromTabPaymentSnake);
  } catch (err) {
    console.warn('[Supabase] insertTabPayment catch:', err);
    return null;
  }
}

export const insertTabPayments = insertTabPayment;

// --- CLOSEOUTS ---
export async function getCloseouts() {
  try {
    const { data, error } = await supabase
      .from('closeouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] getCloseouts warning:', error);
      return [];
    }
    return (data || []).map(fromCloseoutSnake);
  } catch (err) {
    console.warn('[Supabase] getCloseouts catch:', err);
    return [];
  }
}

export async function getLastCloseout() {
  try {
    const { data, error } = await supabase
      .from('closeouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }
    return fromCloseoutSnake(data[0]);
  } catch (err) {
    console.warn('[Supabase] getLastCloseout catch:', err);
    return null;
  }
}

export async function insertCloseout(closeout: Record<string, any> | Record<string, any>[]) {
  try {
    const items = Array.isArray(closeout) ? closeout : [closeout];
    const payload = items.map(toCloseoutSnake);

    const allHaveValidId = payload.length > 0 && payload.every((p) => Boolean(p.id));

    const query = allHaveValidId
      ? supabase.from('closeouts').upsert(payload, { onConflict: 'id' })
      : supabase.from('closeouts').insert(payload);

    const { data, error } = await query.select();

    if (error) {
      console.warn('[Supabase] insertCloseout warning:', error);
      return null;
    }
    return (data || []).map(fromCloseoutSnake);
  } catch (err) {
    console.warn('[Supabase] insertCloseout catch:', err);
    return null;
  }
}

export const insertCloseouts = insertCloseout;

// --- PROFILES (Usuarios en Supabase) ---
const VALID_AVATAR_ICONS = ['user', 'coffee', 'crown', 'shield', 'wallet', 'heart'];

export function sanitizeAvatarIcon(raw?: any): string {
  if (!raw || typeof raw !== 'string') return 'user';
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.startsWith('http')) return 'user';
  return VALID_AVATAR_ICONS.includes(cleaned) ? cleaned : 'user';
}

export function toProfileSnake(user: Record<string, any>) {
  const fullName = (user.full_name || user.fullName || user.name || 'Usuario').trim();
  const validId = cleanUUID(user.id) || generateUUID();

  const payload: Record<string, any> = {
    id: validId,
    full_name: fullName,
    pin: String(user.pin || '0000'),
    role: user.role || 'Vendedor',
    is_active: user.isActive ?? user.is_active ?? true,
    avatar: sanitizeAvatarIcon(user.avatar),
  };

  return payload;
}

export function fromProfileSnake(row: Record<string, any>) {
  const displayName = row.full_name || row.fullName || row.name || row.display_name || row.username || (row.email ? row.email.split('@')[0] : 'Usuario');
  return {
    id: String(row.id),
    name: displayName,
    full_name: displayName,
    pin: String(row.pin || '0000'),
    role: (row.role || 'Vendedor') as any,
    avatar: sanitizeAvatarIcon(row.avatar),
    email: row.email || '',
    isActive: typeof row.is_active === 'boolean' ? row.is_active : true,
  };
}

export async function getProfiles() {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.warn('[Supabase] getProfiles warning:', error.message);
      return [];
    }
    return (data || []).map(fromProfileSnake);
  } catch (err) {
    console.warn('[Supabase] getProfiles catch:', err);
    return [];
  }
}

export async function upsertProfile(profile: Record<string, any>) {
  try {
    const existingId = cleanUUID(profile.id);
    const fullName = (profile.full_name || profile.fullName || profile.name || 'Usuario').trim();

    const baseData: Record<string, any> = {
      full_name: fullName,
      pin: String(profile.pin || '0000'),
      role: profile.role || 'Vendedor',
      is_active: profile.isActive ?? profile.is_active ?? true,
      avatar: sanitizeAvatarIcon(profile.avatar),
    };

    let data: any = null;
    let error: any = null;

    if (existingId && !profile.isNew) {
      // Usuario existente: usar .update().eq("id", existingId)
      const updateRes = await supabase
        .from('profiles')
        .update(baseData)
        .eq('id', existingId)
        .select();

      data = updateRes.data;
      error = updateRes.error;

      // Si no existía previamente en la tabla, insertar con su UUID válido
      if (!error && (!data || data.length === 0)) {
        const insertRes = await supabase
          .from('profiles')
          .insert([{ id: existingId, ...baseData }])
          .select();
        data = insertRes.data;
        error = insertRes.error;
      }
    } else {
      // Usuario nuevo: generar UUID válido con crypto.randomUUID() y usar .insert()
      const newId = existingId || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : generateUUID());

      const insertPayload: Record<string, any> = {
        id: newId,
        ...baseData,
      };

      const insertRes = await supabase
        .from('profiles')
        .insert([insertPayload])
        .select();

      data = insertRes.data;
      error = insertRes.error;
    }

    if (error) {
      console.warn('[Supabase] upsertProfile warning:', error.message);
      if (error.code === '42501' || error.code === '401' || error.message.includes('row-level security') || error.message.includes('policy')) {
        throw new Error('Error RLS (42501): Permisos insuficientes en la tabla profiles. Verifica las políticas de seguridad.');
      }
      throw error;
    }

    return data && data[0] ? fromProfileSnake(data[0]) : null;
  } catch (err: any) {
    console.warn('[Supabase] upsertProfile catch:', err);
    throw err;
  }
}

// --- AUDIT LOGS (Anulaciones e Incidencias en Supabase) ---
export function toAuditLogSnake(item: Record<string, any>) {
  const details = typeof item.details === 'object' && item.details !== null ? item.details : {};
  const actionType = item.action_type || item.actionType || 'void';
  const userName = item.user_name || item.userName || item.voidedBy || item.author || details.voidedBy || 'Usuario';
  const userRole = item.user_role || item.userRole || item.voidedByRole || item.role || details.voidedByRole || 'Vendedor';

  const payload: Record<string, any> = {
    action_type: actionType,
    user_name: userName,
    user_role: userRole,
    sale_id: item.saleId || item.sale_id || details.saleId || null,
    voided_by: userName,
    voided_by_role: userRole,
    reason: item.reason || item.text || details.reason || details.text || '',
    returned_amount: Number(item.returnedAmount ?? item.returned_amount ?? item.amount ?? details.returnedAmount ?? 0),
    payment_method: item.paymentMethod || item.payment_method || details.paymentMethod || 'efectivo',
    returned_items: item.returnedItems || item.returned_items || details.returnedItems || [],
    category: item.category || details.category || (actionType === 'incident' ? 'incidencia' : 'anulacion'),
    details: {
      actionType,
      userName,
      userRole,
      ...details,
    },
  };
  const validId = cleanUUID(item.id);
  if (validId) {
    payload.id = validId;
  }
  return payload;
}

export function fromAuditLogSnake(row: Record<string, any>) {
  const details = typeof row.details === 'string'
    ? JSON.parse(row.details)
    : (typeof row.details === 'object' && row.details !== null ? row.details : {});

  const actionType = row.action_type || row.actionType || details.actionType || (row.sale_id || row.returned_amount ? 'void' : 'incident');
  const userName = row.user_name || row.voided_by || details.userName || details.voidedBy || details.author || 'Usuario';
  const userRole = row.user_role || row.voided_by_role || details.userRole || details.voidedByRole || details.role || 'Vendedor';

  return {
    id: String(row.id),
    action_type: actionType,
    actionType,
    user_name: userName,
    user_role: userRole,
    details,
    saleId: row.sale_id || details.saleId || '',
    voidedBy: userName,
    voidedByRole: userRole,
    timestamp: row.created_at || row.timestamp || details.timestamp || new Date().toISOString(),
    reason: row.reason || details.reason || details.text || '',
    returnedAmount: Number(row.returned_amount ?? details.returnedAmount ?? 0),
    paymentMethod: row.payment_method || details.paymentMethod || 'efectivo',
    returnedItems: row.returned_items || details.returnedItems || [],
    category: row.category || details.category || 'anulacion',
  };
}

export async function getAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] getAuditLogs warning:', error.message);
      return [];
    }
    return (data || []).map(fromAuditLogSnake);
  } catch (err) {
    console.warn('[Supabase] getAuditLogs catch:', err);
    return [];
  }
}

export async function insertAuditLog(log: Record<string, any>) {
  try {
    const payload = toAuditLogSnake(log);
    const { data, error } = await supabase.from('audit_logs').insert([payload]).select();
    if (error) {
      console.warn('[Supabase] insertAuditLog warning:', error.message);
      return null;
    }
    return data && data[0] ? fromAuditLogSnake(data[0]) : null;
  } catch (err) {
    console.warn('[Supabase] insertAuditLog catch:', err);
    return null;
  }
}

