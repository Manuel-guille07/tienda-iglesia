import { create } from 'zustand';
import { Product, RawMaterial, CartItem, Sale, PaymentMethod, Role, RecipeItem } from '../types';
import {
  getRawMaterials,
  insertRawMaterial,
  deleteRawMaterial,
  getSales,
  insertSale,
  deleteSale,
  decrementStock,
  incrementStock,
  insertAuditLog,
  isValidUUID,
} from '../services/db';
import { useCloseoutStore } from './useCloseoutStore';
import { useTabStore } from './useTabStore';
import { roundMoney, toCents, fromCents, isValidNonNegativeMoney } from '../utils/finance';
import toast from 'react-hot-toast';

export interface ProductStockInfo {
  status: 'ok' | 'low' | 'out';
  availableUnits: number;
  minStockAlert: number;
  limitingItemName?: string;
}

export function getProductStockInfo(product: Product, rawMaterials: RawMaterial[]): ProductStockInfo {
  let minAvailableUnits = typeof product.directStock === 'number' ? product.directStock : Infinity;
  let minThreshold = typeof product.minDirectStock === 'number' ? product.minDirectStock : 0;
  let isOut = typeof product.directStock === 'number' && product.directStock <= 0;
  let isLow =
    typeof product.directStock === 'number' &&
    typeof product.minDirectStock === 'number' &&
    product.directStock > 0 &&
    product.directStock <= product.minDirectStock;
  let limitingItemName: string | undefined;

  if (product.recipe && product.recipe.length > 0 && rawMaterials.length > 0) {
    for (const ing of product.recipe) {
      const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      if (mat) {
        const reqQty = ing.quantity > 0 ? ing.quantity : 1;
        const possibleUnits = mat.isOutOfStock ? 0 : Math.floor(mat.currentStock / reqQty);
        if (possibleUnits < minAvailableUnits) {
          minAvailableUnits = possibleUnits;
        }
        if (mat.isOutOfStock || mat.currentStock <= 0 || mat.currentStock < reqQty) {
          isOut = true;
          limitingItemName = mat.name;
        } else if (mat.currentStock <= mat.minStock) {
          isLow = true;
          minThreshold = Math.max(minThreshold, mat.minStock);
          if (!limitingItemName) limitingItemName = mat.name;
        }
      }
    }
  }

  if (minAvailableUnits === Infinity) {
    minAvailableUnits = 99;
  }

  if (isOut || minAvailableUnits <= 0 || product.badge === 'Agotado') {
    return {
      status: 'out',
      availableUnits: 0,
      minStockAlert: minThreshold,
      limitingItemName,
    };
  }

  if (isLow || product.badge === 'Bajo') {
    return {
      status: 'low',
      availableUnits: minAvailableUnits,
      minStockAlert: minThreshold,
      limitingItemName,
    };
  }

  return {
    status: 'ok',
    availableUnits: minAvailableUnits,
    minStockAlert: minThreshold,
  };
}

export function buildDynamicProducts(rawMaterials: RawMaterial[], savedProducts: Product[] = []): Product[] {
  const colors = ['amber', 'orange', 'yellow', 'emerald', 'cyan', 'red', 'indigo', 'purple'];

  if (!rawMaterials || rawMaterials.length === 0) {
    return [];
  }

  return rawMaterials.map((mat, idx) => {
    const existing = savedProducts.find((p) => p.id === mat.id || p.name.toLowerCase() === mat.name.toLowerCase());
    const hasExplicitPrice = typeof mat.price === 'number' && !isNaN(mat.price);
    const basePrice = hasExplicitPrice
      ? (mat.price as number)
      : (mat.costPerUnit > 0 ? Number((mat.costPerUnit * 2).toFixed(2)) : 1.20);
    const finalPrice = hasExplicitPrice
      ? (mat.price as number)
      : (existing?.price !== undefined ? existing.price : Math.max(1.00, basePrice));

    const isSellable = mat.isSellable !== undefined
      ? mat.isSellable
      : (existing?.isSellable !== undefined ? existing.isSellable : true);

    const isQuickAccess = mat.isQuickAccess !== undefined
      ? mat.isQuickAccess
      : (existing?.isQuickAccess !== undefined ? existing.isQuickAccess : false);

    const quickColor = mat.quickColor || mat.quick_color || existing?.quickColor || existing?.quick_color || 'default';

    return {
      id: mat.id,
      name: mat.name,
      price: finalPrice,
      category: mat.category || existing?.category || 'cafeteria',
      description: `${mat.name} (${mat.unit}) - Stock: ${mat.currentStock}`,
      isPreset: isQuickAccess || Boolean(existing?.isPreset),
      isQuickAccess,
      isSellable,
      color: existing?.color || colors[idx % colors.length],
      quickColor,
      quick_color: quickColor,
      badge: mat.isOutOfStock || mat.currentStock <= 0 ? 'Agotado' : (mat.currentStock <= mat.minStock ? 'Bajo' : undefined),
      recipe: existing?.recipe || [
        { rawMaterialId: mat.id, quantity: 1 },
      ],
      directStock: mat.currentStock,
      minDirectStock: mat.minStock,
    };
  });
}

interface POSState {
  products: Product[];
  rawMaterials: RawMaterial[];
  cart: CartItem[];
  sales: Sale[];
  selectedCategory: string;
  searchQuery: string;
  isLoading: boolean;
  isProcessingSale: boolean;
  voidingSaleIds: string[];

  loadInitialData: () => Promise<void>;
  loadRawMaterials: () => Promise<void>;
  loadSales: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;

  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNote: (productId: string, notes: string) => void;
  clearCart: () => void;

  checkStockAvailability: (items: CartItem[]) => { available: boolean; missing: string[] };
  processSale: (params: {
    paymentMethod: PaymentMethod;
    amountTendered?: number;
    changeGiven?: number;
    customerTabId?: string;
    customerName?: string;
    sellerName: string;
    sellerRole: Role;
    notes?: string;
    donationSubMethod?: 'efectivo' | 'datafono';
    prepaidUsed?: number;
    netTabDebt?: number;
  }) => Promise<{ success: boolean; sale?: Sale; error?: string }>;
  processDonationSale: (params: {
    amount: number;
    sellerName: string;
    sellerRole: Role;
    notes?: string;
    donationSubMethod?: 'efectivo' | 'datafono';
    relatedSaleId?: string;
  }) => Promise<{ success: boolean; sale?: Sale; error?: string }>;

  restockRawMaterial: (materialId: string, amount: number) => Promise<boolean>;
  adjustRawStock: (materialId: string, newStock: number) => void;
  adjustProductStock: (productId: string, newStock: number) => void;
  addRawMaterial: (material: Omit<RawMaterial, 'id'>) => Promise<{ success: boolean; material?: RawMaterial; error?: string }>;
  deleteRawMaterialAction: (materialId: string) => Promise<boolean>;
  toggleRawMaterialAvailability: (materialId: string) => void;
  updateRawMaterial: (materialId: string, updates: Partial<RawMaterial>) => Promise<{ success: boolean; error?: string }>;
  updateProductRecipe: (productId: string, recipe: RecipeItem[]) => void;
  deleteProductRecipe: (productId: string) => Promise<boolean>;
  voidSale: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  handleRealtimeRawMaterial: (material: RawMaterial, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  handleRealtimeSale: (sale: Partial<Sale>, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  products: [],
  rawMaterials: [],
  cart: [],
  sales: [],
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,
  isProcessingSale: false,
  voidingSaleIds: [],

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const [rawRows, salesRows] = await Promise.all([
        getRawMaterials(),
        getSales(),
      ]);

      const rawMaterials: RawMaterial[] = (rawRows || []).map((item: any) => ({
        id: String(item.id),
        name: item.name,
        unit: item.unit || 'unidades',
        currentStock: Number(item.currentStock ?? item.current_stock ?? 0),
        minStock: Number(item.minStock ?? item.min_stock_alert ?? item.min_stock ?? 0),
        costPerUnit: Number(item.costPerUnit ?? item.cost_per_unit ?? 0),
        isOutOfStock: Boolean(item.isOutOfStock ?? (typeof item.is_available === 'boolean' ? !item.is_available : false)),
        category: item.category || 'cafeteria',
        isSellable: item.isSellable ?? item.is_sellable ?? true,
        isQuickAccess: item.isQuickAccess ?? item.is_quick_access ?? false,
        price:
          item.price !== null && item.price !== undefined && item.price !== '' && !isNaN(Number(item.price))
            ? Number(item.price)
            : undefined,
        quickColor: item.quickColor ?? item.quick_color ?? 'default',
        quick_color: item.quick_color ?? item.quickColor ?? 'default',
      }));

      const products = buildDynamicProducts(rawMaterials, get().products);

      set({
        rawMaterials,
        products,
        sales: salesRows || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('[usePOSStore] Error al cargar datos iniciales desde Supabase:', error);
      set({ isLoading: false });
    }
  },

  loadRawMaterials: async () => {
    try {
      const rawRows = await getRawMaterials();
      const rawMaterials: RawMaterial[] = (rawRows || []).map((item: any) => ({
        id: String(item.id),
        name: item.name,
        unit: item.unit || 'unidades',
        currentStock: Number(item.currentStock ?? item.current_stock ?? 0),
        minStock: Number(item.minStock ?? item.min_stock_alert ?? item.min_stock ?? 0),
        costPerUnit: Number(item.costPerUnit ?? item.cost_per_unit ?? 0),
        isOutOfStock: Boolean(item.isOutOfStock ?? (typeof item.is_available === 'boolean' ? !item.is_available : false)),
        category: item.category || 'cafeteria',
        isSellable: item.isSellable ?? item.is_sellable ?? true,
        isQuickAccess: item.isQuickAccess ?? item.is_quick_access ?? false,
        price:
          item.price !== null && item.price !== undefined && item.price !== '' && !isNaN(Number(item.price))
            ? Number(item.price)
            : undefined,
        quickColor: item.quickColor ?? item.quick_color ?? 'default',
        quick_color: item.quick_color ?? item.quickColor ?? 'default',
      }));

      const products = buildDynamicProducts(rawMaterials, get().products);

      set({ rawMaterials, products });
    } catch (error) {
      console.error('[usePOSStore] Error al cargar insumos desde Supabase:', error);
    }
  },

  loadSales: async () => {
    try {
      const salesRows = await getSales();
      set({ sales: salesRows || [] });
    } catch (error) {
      console.error('[usePOSStore] Error al cargar ventas desde Supabase:', error);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  addToCart: (product) => {
    if (!isValidNonNegativeMoney(product.price)) {
      toast.error(`Precio inválido en el producto: ${product.name}`);
      return;
    }
    const safeProduct: Product = {
      ...product,
      price: roundMoney(product.price),
    };

    const { cart, rawMaterials, checkStockAvailability } = get();
    const stockInfo = getProductStockInfo(safeProduct, rawMaterials);

    if (stockInfo.status === 'out') {
      toast.error(
        `Producto agotado: ${safeProduct.name}${stockInfo.limitingItemName && stockInfo.limitingItemName !== safeProduct.name ? ` (Insumo sin stock: ${stockInfo.limitingItemName})` : ''}`
      );
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === safeProduct.id);
    const nextCart =
      existingIndex > -1
        ? cart.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...cart, { product: safeProduct, quantity: 1 }];

    const availability = checkStockAvailability(nextCart);
    if (!availability.available) {
      toast.error(`Stock insuficiente: ${availability.missing.join(', ')}`);
      return;
    }

    set({ cart: nextCart });

    if (stockInfo.status === 'low' && existingIndex === -1) {
      toast(`Alerta de stock bajo: ${safeProduct.name} (${stockInfo.availableUnits} disp.)`, {
        icon: '⚠️',
      });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || Number.isNaN(quantity)) {
      toast.error('Cantidad inválida');
      return;
    }
    const cleanQty = Math.floor(quantity);
    if (cleanQty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    if (cleanQty > 9999) {
      toast.error('Cantidad máxima por línea excedida (máx. 9999)');
      return;
    }

    const currentCart = get().cart;
    const currentItem = currentCart.find((it) => it.product.id === productId);
    const nextCart = currentCart.map((item) =>
      item.product.id === productId ? { ...item, quantity: cleanQty } : item
    );

    if (currentItem && cleanQty > currentItem.quantity) {
      const availability = get().checkStockAvailability(nextCart);
      if (!availability.available) {
        toast.error(`Stock máximo alcanzado: ${availability.missing.join(', ')}`);
        return;
      }
    }

    set({ cart: nextCart });
  },

  updateItemNote: (productId, notes) => {
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, notes: notes.slice(0, 160) } : item
      ),
    });
  },

  clearCart: () => set({ cart: [] }),

  checkStockAvailability: (items) => {
    const { rawMaterials, products } = get();
    const requiredMaterials: Record<string, number> = {};
    const requiredDirectStock: Record<string, number> = {};
    const missing: string[] = [];

    items.forEach((item) => {
      if (item.product.recipe) {
        item.product.recipe.forEach((ing) => {
          const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
          if (mat?.isOutOfStock) {
            missing.push(`${mat.name}: Agotado / No disponible`);
          }
          requiredMaterials[ing.rawMaterialId] =
            (requiredMaterials[ing.rawMaterialId] || 0) + ing.quantity * item.quantity;
        });
      }
      if (typeof item.product.directStock === 'number') {
        requiredDirectStock[item.product.id] =
          (requiredDirectStock[item.product.id] || 0) + item.quantity;
      }
    });

    Object.entries(requiredMaterials).forEach(([matId, qtyRequired]) => {
      const mat = rawMaterials.find((m) => m.id === matId);
      if (!mat || mat.currentStock < qtyRequired) {
        missing.push(
          `${mat ? mat.name : 'Insumo'}: requiere ${qtyRequired} (disp: ${mat ? mat.currentStock : 0})`
        );
      }
    });

    Object.entries(requiredDirectStock).forEach(([prodId, qtyRequired]) => {
      const prod = products.find((p) => p.id === prodId);
      if (!prod || (prod.directStock ?? 0) < qtyRequired) {
        missing.push(
          `${prod ? prod.name : 'Producto'}: requiere ${qtyRequired} (disp: ${prod ? prod.directStock : 0})`
        );
      }
    });

    return {
      available: missing.length === 0,
      missing,
    };
  },

  processSale: async (params) => {
    if (get().isProcessingSale) {
      return { success: false, error: 'Cobro ya en proceso, por favor espera...' };
    }

    set({ isProcessingSale: true });
    try {
      const { cart, rawMaterials, products, checkStockAvailability } = get();
      if (!cart || cart.length === 0) {
        return { success: false, error: 'El carrito está vacío' };
      }

      // Auditoría estricta de precios y cantidades en memoria (anti-manipulación / NaN / negativos)
      const sanitizedCart: CartItem[] = [];
      for (const item of cart) {
        if (
          typeof item.quantity !== 'number' ||
          !Number.isFinite(item.quantity) ||
          Number.isNaN(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isSafeInteger(Math.floor(item.quantity))
        ) {
          return {
            success: false,
            error: `Cantidad inválida en el carrito para ${item.product?.name || 'producto'}`,
          };
        }

        const canonicalProduct = products.find((p) => p.id === item.product.id);
        const rawUnitPrice =
          canonicalProduct && isValidNonNegativeMoney(canonicalProduct.price)
            ? canonicalProduct.price
            : item.customPrice ?? item.product.price;

        if (!isValidNonNegativeMoney(rawUnitPrice)) {
          return {
            success: false,
            error: `Precio corrupto o negativo detectado para ${item.product?.name || 'producto'}`,
          };
        }

        const safeUnitPrice = roundMoney(rawUnitPrice);
        sanitizedCart.push({
          ...item,
          quantity: Math.floor(item.quantity),
          product: {
            ...(canonicalProduct || item.product),
            price: safeUnitPrice,
          },
          customPrice: item.customPrice !== undefined ? safeUnitPrice : undefined,
        });
      }

      const total = fromCents(
        sanitizedCart.reduce((acc, item) => acc + toCents(item.product.price) * item.quantity, 0)
      );

      if (!Number.isFinite(total) || Number.isNaN(total) || total < 0) {
        return { success: false, error: 'Importe total inválido en el carrito' };
      }

      if (params.paymentMethod !== 'consumo_interno' && total <= 0) {
        return { success: false, error: 'El importe a cobrar debe ser mayor a 0.00€' };
      }

      if (params.paymentMethod === 'efectivo') {
        const tendered = params.amountTendered ?? 0;
        if (!Number.isFinite(tendered) || Number.isNaN(tendered) || toCents(tendered) < toCents(total)) {
          return {
            success: false,
            error: `Efectivo insuficiente para cubrir ${total.toFixed(2)}€`,
          };
        }
      }

      const stockCheck = checkStockAvailability(sanitizedCart);
      if (!stockCheck.available) {
        return {
          success: false,
          error: `Insumos insuficientes: ${stockCheck.missing.join(', ')}`,
        };
      }

      const updatedRaw = [...rawMaterials];
      const itemsToDecrement: Array<{ id: string; name: string; qty: number }> = [];

      sanitizedCart.forEach((item) => {
        if (item.product.recipe && item.product.recipe.length > 0) {
          item.product.recipe.forEach((ing) => {
            const qtyToDiscount = ing.quantity * item.quantity;
            const matIndex = updatedRaw.findIndex((m) => m.id === ing.rawMaterialId);
            const matName = matIndex > -1 ? updatedRaw[matIndex].name : item.product.name;

            if (matIndex > -1) {
              const nextStock = Math.max(0, updatedRaw[matIndex].currentStock - qtyToDiscount);
              updatedRaw[matIndex] = {
                ...updatedRaw[matIndex],
                currentStock: nextStock,
                isOutOfStock: nextStock <= 0,
              };
            }

            const existing = itemsToDecrement.find((d) => d.id === ing.rawMaterialId);
            if (existing) {
              existing.qty += qtyToDiscount;
            } else {
              itemsToDecrement.push({ id: ing.rawMaterialId, name: matName, qty: qtyToDiscount });
            }
          });
        } else {
          const qtyToDiscount = item.quantity;
          const matIndex = updatedRaw.findIndex((m) => m.id === item.product.id);
          if (matIndex > -1) {
            const nextStock = Math.max(0, updatedRaw[matIndex].currentStock - qtyToDiscount);
            updatedRaw[matIndex] = {
              ...updatedRaw[matIndex],
              currentStock: nextStock,
              isOutOfStock: nextStock <= 0,
            };
          }

          const existing = itemsToDecrement.find((d) => d.id === item.product.id);
          if (existing) {
            existing.qty += qtyToDiscount;
          } else {
            itemsToDecrement.push({ id: item.product.id, name: item.product.name, qty: qtyToDiscount });
          }
        }
      });

      const cleanPrepaidUsed =
        params.paymentMethod === 'fiado' &&
        typeof params.prepaidUsed === 'number' &&
        Number.isFinite(params.prepaidUsed) &&
        !Number.isNaN(params.prepaidUsed) &&
        params.prepaidUsed > 0
          ? roundMoney(Math.min(total, params.prepaidUsed))
          : 0;

      const cleanNetTabDebt =
        params.paymentMethod === 'fiado'
          ? typeof params.netTabDebt === 'number' &&
            Number.isFinite(params.netTabDebt) &&
            !Number.isNaN(params.netTabDebt)
            ? roundMoney(Math.max(0, Math.min(total, params.netTabDebt)))
            : roundMoney(Math.max(0, total - cleanPrepaidUsed))
          : undefined;

      // 1. PERSISTENCIA FIRST (Evita Carritos Fantasma: si falla Supabase, el carrito sigue 100% intacto)
      const createdRows = await insertSale({
        total,
        payment_method: params.paymentMethod,
        donation_sub_method: params.donationSubMethod ?? null,
        user_name: params.sellerName,
        user_role: params.sellerRole,
        prepaid_used: params.paymentMethod === 'fiado' ? cleanPrepaidUsed : undefined,
        net_tab_debt: params.paymentMethod === 'fiado' ? cleanNetTabDebt : undefined,
      });

      const createdRow = createdRows?.[0];
      if (!createdRow || !createdRow.id) {
        return {
          success: false,
          error: 'No se recibió confirmación del servidor al registrar la venta. El carrito se mantiene intacto.',
        };
      }

      const finalSaleId = String(createdRow.id);
      const confirmedSale: Sale = {
        id: finalSaleId,
        timestamp: createdRow.timestamp || new Date().toISOString(),
        items: sanitizedCart,
        total,
        paymentMethod: params.paymentMethod,
        amountTendered: params.amountTendered,
        changeGiven: params.changeGiven,
        customerTabId: params.customerTabId,
        customerName: params.customerName,
        sellerName: params.sellerName,
        sellerRole: params.sellerRole,
        notes: params.notes,
        donationSubMethod: params.donationSubMethod,
        prepaidUsed: params.paymentMethod === 'fiado' ? cleanPrepaidUsed : undefined,
        netTabDebt: cleanNetTabDebt,
      };

      const updatedProducts = buildDynamicProducts(updatedRaw, products);

      // 2. Actualizar estado local de forma atómica (deduplicando si Realtime llegó antes) y vaciar carrito
      set((state) => ({
        rawMaterials: updatedRaw,
        products: updatedProducts,
        sales: [confirmedSale, ...state.sales.filter((s) => s.id !== finalSaleId)],
        cart: [],
      }));

      // 3. Descontar stock con RPC atómica en Supabase
      if (itemsToDecrement.length > 0) {
        for (const entry of itemsToDecrement) {
          try {
            await decrementStock(entry.id, entry.qty);
          } catch (rpcError: any) {
            console.error(`Error en RPC decrement_stock para ${entry.id}:`, rpcError);
            toast.error(`Error al descontar stock en Supabase para ${entry.name}`);
          }
        }
        await get().loadRawMaterials();
      }

      // 4. Registrar crédito consumido en audit_logs si fue fiado con saldo previo
      if (params.paymentMethod === 'fiado' && cleanPrepaidUsed > 0) {
        useCloseoutStore.getState().addTabCredit({
          saleId: finalSaleId,
          customerTabId: params.customerTabId,
          customerName: params.customerName,
          saleTotal: total,
          prepaidUsed: cleanPrepaidUsed,
          netTabDebt: cleanNetTabDebt ?? 0,
          timestamp: confirmedSale.timestamp,
        });

        insertAuditLog({
          action_type: 'tab_credit',
          user_name: params.sellerName,
          user_role: params.sellerRole,
          saleId: finalSaleId,
          returnedAmount: cleanPrepaidUsed,
          paymentMethod: 'fiado',
          reason: 'Saldo a favor aplicado en venta fiada',
          details: {
            saleId: finalSaleId,
            customerTabId: params.customerTabId,
            customerName: params.customerName,
            saleTotal: total,
            prepaidUsed: cleanPrepaidUsed,
            netTabDebt: cleanNetTabDebt ?? 0,
            timestamp: confirmedSale.timestamp,
          },
        }).catch((auditErr) => {
          console.warn('[usePOSStore] Error al registrar tab_credit en audit_logs:', auditErr);
        });
      }

      return { success: true, sale: confirmedSale };
    } catch (error: any) {
      console.error('Error al registrar venta en Supabase:', error);
      return {
        success: false,
        error:
          error?.message ||
          'Error de red: La venta no pudo guardarse en Supabase. Tu pedido sigue intacto en el carrito.',
      };
    } finally {
      set({ isProcessingSale: false });
    }
  },

  processDonationSale: async (params) => {
    const cleanAmount = roundMoney(params.amount);
    if (!Number.isFinite(cleanAmount) || Number.isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Importe de donativo inválido' };
    }

    try {
      const donativoProduct = get().products.find((p) => p.category === 'donativos');
      const createdRows = await insertSale({
        total: cleanAmount,
        payment_method: 'donativo',
        donation_sub_method: params.donationSubMethod || 'efectivo',
        user_name: params.sellerName,
        user_role: params.sellerRole,
      });

      const created = createdRows?.[0];
      if (!created || !created.id) {
        return { success: false, error: 'No se pudo confirmar el registro del donativo en Supabase' };
      }

      const donationSale: Sale = {
        id: String(created.id),
        timestamp: created.timestamp || new Date().toISOString(),
        items: [
          {
            product: donativoProduct
              ? { ...donativoProduct, price: cleanAmount }
              : {
                  id: 'prod-donativo-cambio',
                  name: 'Donativo (Cambio de compra)',
                  price: cleanAmount,
                  category: 'donativos',
                  description: 'Cambio voluntario convertido en donativo para la obra',
                },
            quantity: 1,
          },
        ],
        total: cleanAmount,
        paymentMethod: 'donativo',
        donationSubMethod: params.donationSubMethod || 'efectivo',
        amountTendered: cleanAmount,
        changeGiven: 0,
        sellerName: params.sellerName,
        sellerRole: params.sellerRole,
        notes: params.notes?.trim()
          ? `Donativo por cambio de compra: ${params.notes.trim()}`
          : params.relatedSaleId
          ? `Donativo por cambio de compra (Venta #${params.relatedSaleId.slice(-6)})`
          : 'Donativo por cambio de compra',
      };

      set((state) => ({
        sales: [donationSale, ...state.sales.filter((s) => s.id !== donationSale.id)],
      }));

      return { success: true, sale: donationSale };
    } catch (error: any) {
      console.error('Error al registrar donativo por cambio en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error de red al registrar el donativo en Supabase',
      };
    }
  },

  restockRawMaterial: async (materialId, amount) => {
    if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      return false;
    }
    const target = get().rawMaterials.find((m) => m.id === materialId);
    if (!target) return false;

    const updatedItem: RawMaterial = {
      ...target,
      currentStock: Math.max(0, Number((target.currentStock + amount).toFixed(2))),
      isOutOfStock: false,
    };

    try {
      const saved = await insertRawMaterial(updatedItem);
      const synced = saved?.[0] || updatedItem;
      const updatedRaw = get().rawMaterials.map((m) =>
        m.id === materialId ? { ...m, ...synced } : m
      );
      set({
        rawMaterials: updatedRaw,
        products: buildDynamicProducts(updatedRaw, get().products),
      });
      return true;
    } catch (error) {
      console.error('Error al sincronizar reposición de stock en Supabase:', error);
      return false;
    }
  },

  adjustRawStock: (materialId, newStock) => {
    if (!Number.isFinite(newStock) || Number.isNaN(newStock) || newStock < 0) return;
    let updatedItem: RawMaterial | undefined;
    const updatedRaw = get().rawMaterials.map((m) => {
      if (m.id === materialId) {
        updatedItem = { ...m, currentStock: Math.max(0, newStock) };
        return updatedItem;
      }
      return m;
    });

    const updatedProducts = buildDynamicProducts(updatedRaw, get().products);

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    if (updatedItem) {
      insertRawMaterial(updatedItem).catch((error) => {
        console.error('Error al sincronizar stock de insumo en Supabase:', error);
      });
    }
  },

  adjustProductStock: (productId, newStock) => {
    if (!Number.isFinite(newStock) || Number.isNaN(newStock) || newStock < 0) return;
    set({
      products: get().products.map((p) =>
        p.id === productId ? { ...p, directStock: Math.max(0, newStock) } : p
      ),
    });
  },

  addRawMaterial: async (material) => {
    try {
      const saved = await insertRawMaterial({
        ...material,
        currentStock: Math.max(0, Number(material.currentStock || 0)),
        minStock: Math.max(0, Number(material.minStock || 0)),
        costPerUnit: Math.max(0, Number(material.costPerUnit || 0)),
        price: material.price !== undefined ? roundMoney(Math.max(0, material.price)) : undefined,
        isOutOfStock: material.isOutOfStock ?? false,
      });

      if (!saved || saved.length === 0) {
        return { success: false, error: 'Supabase no devolvió la confirmación del nuevo producto' };
      }

      const savedItem = saved[0] as RawMaterial;
      const realId = String(savedItem.id);

      set((state) => {
        const nextRaw = [savedItem, ...state.rawMaterials.filter((m) => m.id !== realId)];
        return {
          rawMaterials: nextRaw,
          products: buildDynamicProducts(nextRaw, state.products),
        };
      });

      return { success: true, material: savedItem };
    } catch (error: any) {
      console.error('Error al sincronizar nuevo insumo en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error de sincronización con Supabase al crear producto',
      };
    }
  },

  deleteRawMaterialAction: async (materialId: string) => {
    const previousRaw = get().rawMaterials;
    const previousProducts = get().products;
    const updatedRaw = previousRaw.filter((m) => m.id !== materialId);
    const updatedProducts = buildDynamicProducts(updatedRaw, previousProducts);

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    const success = await deleteRawMaterial(materialId);
    if (!success) {
      set({ rawMaterials: previousRaw, products: previousProducts });
      toast.error('Error al eliminar el insumo de Supabase');
    }
    return success;
  },

  toggleRawMaterialAvailability: (materialId) => {
    let updatedItem: RawMaterial | undefined;
    const updatedRaw = get().rawMaterials.map((m) => {
      if (m.id === materialId) {
        updatedItem = { ...m, isOutOfStock: !m.isOutOfStock };
        return updatedItem;
      }
      return m;
    });

    const updatedProducts = buildDynamicProducts(updatedRaw, get().products);

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    if (updatedItem) {
      insertRawMaterial(updatedItem).catch((error: any) => {
        console.error('Error al sincronizar disponibilidad de insumo en Supabase:', error);
        toast.error(error?.message || 'Error de disponibilidad en Supabase');
      });
    }
  },

  updateRawMaterial: async (materialId, updates) => {
    const existing = get().rawMaterials.find((m) => m.id === materialId);
    if (!existing) {
      return { success: false, error: 'Insumo no encontrado' };
    }

    const candidate: RawMaterial = {
      ...existing,
      ...updates,
      price: updates.price !== undefined ? roundMoney(Math.max(0, updates.price)) : existing.price,
    };

    try {
      const saved = await insertRawMaterial(candidate);
      const savedItem = (saved && saved[0]) || candidate;

      set((state) => {
        const syncedRaw = state.rawMaterials.map((m) =>
          m.id === materialId || m.id === savedItem.id ? { ...m, ...savedItem } : m
        );
        return {
          rawMaterials: syncedRaw,
          products: buildDynamicProducts(syncedRaw, state.products),
        };
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error al sincronizar actualización de insumo en Supabase:', error);
      return {
        success: false,
        error: error?.message || 'Error al actualizar el producto en Supabase',
      };
    }
  },

  updateProductRecipe: (productId, recipe) => {
    set({
      products: get().products.map((p) =>
        p.id === productId ? { ...p, recipe } : p
      ),
    });
  },

  deleteProductRecipe: async (productId: string) => {
    const { products } = get();
    const target = products.find((p) => p.id === productId);
    if (!target) return false;

    set({
      products: products.map((p) =>
        p.id === productId ? { ...p, recipe: undefined } : p
      ),
    });
    return true;
  },

  voidSale: async (saleId: string) => {
    if (get().voidingSaleIds.includes(saleId)) {
      return { success: false, error: 'Esta venta ya está siendo anulada...' };
    }

    const { sales, rawMaterials, products } = get();
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) {
      return { success: false, error: 'Venta no encontrada o ya fue anulada' };
    }

    set((state) => ({ voidingSaleIds: [...state.voidingSaleIds, saleId] }));
    try {
      // 1. Eliminar venta en Supabase PRIMERO si es UUID real: evita inconsistencia si falla red
      if (isValidUUID(saleId)) {
        try {
          const deleted = await deleteSale(saleId);
          if (!deleted) {
            return { success: false, error: 'No se pudo eliminar la venta en Supabase' };
          }
        } catch (err: any) {
          console.error('Error al eliminar venta anulada en Supabase:', err);
          return {
            success: false,
            error: err?.message || 'Error de red al anular la venta en Supabase. No se modificó el stock.',
          };
        }
      }

      const updatedRaw = [...rawMaterials];
      const itemsToIncrement: Array<{ id: string; name: string; qty: number }> = [];

      // 2. Calcular restitución de stock de ingredientes o producto directo
      if (targetSale.items && targetSale.items.length > 0) {
        targetSale.items.forEach((item) => {
          if (item.product?.recipe && item.product.recipe.length > 0) {
            item.product.recipe.forEach((ing) => {
              const returnedQty = ing.quantity * item.quantity;
              const idx = updatedRaw.findIndex((m) => m.id === ing.rawMaterialId);
              const matName = idx > -1 ? updatedRaw[idx].name : item.product.name;

              if (idx > -1) {
                const newStock = updatedRaw[idx].currentStock + returnedQty;
                updatedRaw[idx] = {
                  ...updatedRaw[idx],
                  currentStock: newStock,
                  isOutOfStock: false,
                };
              }

              const existing = itemsToIncrement.find((d) => d.id === ing.rawMaterialId);
              if (existing) {
                existing.qty += returnedQty;
              } else {
                itemsToIncrement.push({ id: ing.rawMaterialId, name: matName, qty: returnedQty });
              }
            });
          } else {
            const idx = updatedRaw.findIndex(
              (m) =>
                m.id === item.product?.id ||
                m.name.toLowerCase() === item.product?.name.toLowerCase()
            );
            const targetId = idx > -1 ? updatedRaw[idx].id : item.product?.id;
            const targetName = idx > -1 ? updatedRaw[idx].name : item.product?.name || 'Producto';

            if (idx > -1) {
              const newStock = updatedRaw[idx].currentStock + item.quantity;
              updatedRaw[idx] = {
                ...updatedRaw[idx],
                currentStock: newStock,
                isOutOfStock: false,
              };
            }

            if (targetId) {
              const existing = itemsToIncrement.find((d) => d.id === targetId);
              if (existing) {
                existing.qty += item.quantity;
              } else {
                itemsToIncrement.push({ id: targetId, name: targetName, qty: item.quantity });
              }
            }
          }
        });
      }

      const updatedProducts = buildDynamicProducts(updatedRaw, products);

      // 3. Actualizar estado local (desaparece del turno activo y Cierre de Caja resta ese monto al instante)
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== saleId),
        rawMaterials: updatedRaw,
        products: updatedProducts,
      }));

      // 4. Si fue venta fiada, revertir deuda/saldo a favor del cliente
      if (targetSale.paymentMethod === 'fiado') {
        await useTabStore.getState().revertSaleFromTab(targetSale);
      }

      // 5. Ejecutar RPC atómico 'increment_stock' en Supabase por cada insumo/producto devuelto
      for (const entry of itemsToIncrement) {
        try {
          await incrementStock(entry.id, entry.qty);
        } catch (rpcError: any) {
          console.error(`Error en RPC increment_stock para ${entry.id}:`, rpcError);
          toast.error(`Error al restaurar stock en Supabase para ${entry.name}`);
        }
      }

      await get().loadRawMaterials();
      return { success: true };
    } finally {
      set((state) => ({
        voidingSaleIds: state.voidingSaleIds.filter((id) => id !== saleId),
      }));
    }
  },

  handleRealtimeRawMaterial: (material, eventType) => {
    const { rawMaterials, products } = get();
    let updated: RawMaterial[];

    if (eventType === 'DELETE') {
      if (!material.id) {
        get().loadRawMaterials();
        return;
      }
      updated = rawMaterials.filter((m) => m.id !== material.id);
    } else if (eventType === 'INSERT') {
      if (rawMaterials.some((m) => m.id === material.id)) {
        updated = rawMaterials.map((m) => (m.id === material.id ? { ...m, ...material } : m));
      } else {
        const tempMatchIdx = rawMaterials.findIndex(
          (m) => m.id.startsWith('raw-') && m.name.trim().toLowerCase() === material.name.trim().toLowerCase()
        );
        if (tempMatchIdx > -1) {
          updated = rawMaterials.map((m, idx) => (idx === tempMatchIdx ? { ...m, ...material } : m));
        } else {
          updated = [material, ...rawMaterials];
        }
      }
    } else {
      const exists = rawMaterials.some((m) => m.id === material.id);
      updated = exists
        ? rawMaterials.map((m) => (m.id === material.id ? { ...m, ...material } : m))
        : [material, ...rawMaterials];
    }

    const updatedProducts = buildDynamicProducts(updated, products);
    set({ rawMaterials: updated, products: updatedProducts });
  },

  handleRealtimeSale: (sale, eventType) => {
    const { sales } = get();
    if (eventType === 'DELETE' && sale.id) {
      set({ sales: sales.filter((s) => s.id !== sale.id) });
    } else if (eventType === 'INSERT' && sale.id) {
      const existing = sales.find((s) => s.id === sale.id);
      if (existing) {
        // Preservar ítems y contexto fiado si el dispositivo actual ya los tiene en memoria
        set({
          sales: sales.map((s) =>
            s.id === sale.id
              ? {
                  ...s,
                  ...sale,
                  items: s.items?.length ? s.items : (sale.items || []),
                  prepaidUsed: s.prepaidUsed ?? sale.prepaidUsed,
                  netTabDebt: s.netTabDebt ?? sale.netTabDebt,
                  customerTabId: s.customerTabId ?? sale.customerTabId,
                  customerName: s.customerName ?? sale.customerName,
                }
              : s
          ),
        });
        return;
      }
      set({ sales: [sale as Sale, ...sales] });
    } else if (eventType === 'UPDATE' && sale.id) {
      set({
        sales: sales.map((s) =>
          s.id === sale.id
            ? ({
                ...s,
                ...sale,
                items: s.items?.length ? s.items : (sale.items || []),
              } as Sale)
            : s
        ),
      });
    }
  },
}));
