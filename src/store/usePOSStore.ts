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
} from '../services/db';
import { useCloseoutStore } from './useCloseoutStore';
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
  }) => { success: boolean; sale?: Sale; error?: string };

  restockRawMaterial: (materialId: string, amount: number) => void;
  adjustRawStock: (materialId: string, newStock: number) => void;
  adjustProductStock: (productId: string, newStock: number) => void;
  addRawMaterial: (material: Omit<RawMaterial, 'id'>) => RawMaterial;
  deleteRawMaterialAction: (materialId: string) => Promise<boolean>;
  toggleRawMaterialAvailability: (materialId: string) => void;
  updateRawMaterial: (materialId: string, updates: Partial<RawMaterial>) => void;
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
    const { cart, rawMaterials, checkStockAvailability } = get();
    const stockInfo = getProductStockInfo(product, rawMaterials);

    if (stockInfo.status === 'out') {
      toast.error(
        `Producto agotado: ${product.name}${stockInfo.limitingItemName && stockInfo.limitingItemName !== product.name ? ` (Insumo sin stock: ${stockInfo.limitingItemName})` : ''}`
      );
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const nextCart =
      existingIndex > -1
        ? cart.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...cart, { product, quantity: 1 }];

    const availability = checkStockAvailability(nextCart);
    if (!availability.available) {
      toast.error(`Stock insuficiente: ${availability.missing.join(', ')}`);
      return;
    }

    set({ cart: nextCart });

    if (stockInfo.status === 'low' && existingIndex === -1) {
      toast(`Alerta de stock bajo: ${product.name} (${stockInfo.availableUnits} disp.)`, {
        icon: '⚠️',
      });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (!Number.isFinite(quantity) || isNaN(quantity)) {
      toast.error('Cantidad inválida');
      return;
    }
    const cleanQty = Math.floor(quantity);
    if (cleanQty <= 0) {
      get().removeFromCart(productId);
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

  processSale: (params) => {
    const { cart, rawMaterials, products, sales, checkStockAvailability } = get();
    if (cart.length === 0) {
      return { success: false, error: 'El carrito está vacío' };
    }

    const stockCheck = checkStockAvailability(cart);
    if (!stockCheck.available) {
      return {
        success: false,
        error: `Insumos insuficientes: ${stockCheck.missing.join(', ')}`,
      };
    }

    const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const updatedRaw = [...rawMaterials];
    const itemsToDecrement: Array<{ id: string; name: string; qty: number }> = [];

    cart.forEach((item) => {
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

    const updatedProducts = buildDynamicProducts(updatedRaw, products);

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: [...cart],
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
      prepaidUsed: params.prepaidUsed,
      netTabDebt: params.netTabDebt,
    };

    const cleanPrepaidUsed =
      params.paymentMethod === 'fiado' &&
      typeof params.prepaidUsed === 'number' &&
      !isNaN(params.prepaidUsed) &&
      params.prepaidUsed > 0
        ? Number(params.prepaidUsed.toFixed(2))
        : 0;

    const cleanNetTabDebt =
      params.paymentMethod === 'fiado'
        ? typeof params.netTabDebt === 'number' && !isNaN(params.netTabDebt)
          ? Number(params.netTabDebt.toFixed(2))
          : Number(Math.max(0, total - cleanPrepaidUsed).toFixed(2))
        : undefined;

    if (params.paymentMethod === 'fiado' && cleanPrepaidUsed > 0) {
      useCloseoutStore.getState().addTabCredit({
        saleId: newSale.id,
        customerTabId: params.customerTabId,
        customerName: params.customerName,
        saleTotal: total,
        prepaidUsed: cleanPrepaidUsed,
        netTabDebt: cleanNetTabDebt ?? 0,
        timestamp: newSale.timestamp,
      });
    }

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
      sales: [newSale, ...sales],
      cart: [],
    });

    // Guardar en Supabase: insertar en sales y descontar stock de forma atómica con RPC 'decrement_stock'
    insertSale({
      total,
      payment_method: params.paymentMethod,
      donation_sub_method: params.donationSubMethod ?? null,
      user_name: params.sellerName,
      user_role: params.sellerRole,
      prepaid_used: params.paymentMethod === 'fiado' ? cleanPrepaidUsed : undefined,
      net_tab_debt: params.paymentMethod === 'fiado' ? cleanNetTabDebt : undefined,
    })
      .then(async (createdRows) => {
        const finalSaleId = createdRows && createdRows[0]?.id ? String(createdRows[0].id) : newSale.id;
        if (createdRows && createdRows[0]?.id) {
          set((state) => ({
            sales: state.sales.map((s) => (s.id === newSale.id ? { ...s, id: finalSaleId } : s)),
          }));
        }

        if (params.paymentMethod === 'fiado' && cleanPrepaidUsed > 0) {
          useCloseoutStore.getState().addTabCredit({
            saleId: finalSaleId,
            customerTabId: params.customerTabId,
            customerName: params.customerName,
            saleTotal: total,
            prepaidUsed: cleanPrepaidUsed,
            netTabDebt: cleanNetTabDebt ?? 0,
            timestamp: newSale.timestamp,
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
              timestamp: newSale.timestamp,
            },
          }).catch((auditErr) => {
            console.warn('[usePOSStore] Error al registrar tab_credit en audit_logs:', auditErr);
          });
        }

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
      })
      .catch((error) => {
        console.error('Error al registrar venta en Supabase:', error);
        toast.error('Error de red: La venta no pudo sincronizarse con la base de datos');
      });

    return { success: true, sale: newSale };
  },

  restockRawMaterial: (materialId, amount) => {
    let updatedItem: RawMaterial | undefined;
    const updatedRaw = get().rawMaterials.map((m) => {
      if (m.id === materialId) {
        updatedItem = { ...m, currentStock: m.currentStock + amount };
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

  adjustRawStock: (materialId, newStock) => {
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
    set({
      products: get().products.map((p) =>
        p.id === productId ? { ...p, directStock: Math.max(0, newStock) } : p
      ),
    });
  },

  addRawMaterial: (material) => {
    const tempId = `raw-${Date.now()}`;
    const newMaterial: RawMaterial = {
      ...material,
      id: tempId,
      isOutOfStock: material.isOutOfStock ?? false,
    };

    const updatedRaw = [...get().rawMaterials, newMaterial];
    const updatedProducts = buildDynamicProducts(updatedRaw, get().products);

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    insertRawMaterial(newMaterial)
      .then((saved) => {
        if (saved && saved.length > 0) {
          const savedItem = saved[0];
          const realId = String(savedItem.id);
          set((state) => {
            const withoutDuplicates = state.rawMaterials.filter(
              (m) => m.id !== realId || m.id === tempId
            );
            const hasTemp = withoutDuplicates.some((m) => m.id === tempId);
            const rawWithRealId = hasTemp
              ? withoutDuplicates.map((m) =>
                  m.id === tempId ? { ...m, ...savedItem, id: realId } : m
                )
              : [...withoutDuplicates, { ...savedItem, id: realId }];

            return {
              rawMaterials: rawWithRealId,
              products: buildDynamicProducts(rawWithRealId, state.products),
            };
          });
        } else {
          toast.error('Supabase no devolvió la confirmación del nuevo producto');
        }
      })
      .catch((error: any) => {
        console.error('Error al sincronizar nuevo insumo en Supabase:', error);
        toast.error(error?.message || 'Error de sincronización con Supabase al crear producto');
      });

    return newMaterial;
  },

  deleteRawMaterialAction: async (materialId: string) => {
    const updatedRaw = get().rawMaterials.filter((m) => m.id !== materialId);
    const updatedProducts = buildDynamicProducts(updatedRaw, get().products);

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    const success = await deleteRawMaterial(materialId);
    if (!success) {
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

  updateRawMaterial: (materialId, updates) => {
    let updatedItem: RawMaterial | undefined;
    const updatedRaw = get().rawMaterials.map((m) => {
      if (m.id === materialId) {
        updatedItem = { ...m, ...updates };
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
      insertRawMaterial(updatedItem)
        .then((saved) => {
          if (saved && saved.length > 0) {
            const savedItem = saved[0];
            set((state) => {
              const syncedRaw = state.rawMaterials.map((m) =>
                m.id === materialId || m.id === savedItem.id ? { ...m, ...savedItem } : m
              );
              return {
                rawMaterials: syncedRaw,
                products: buildDynamicProducts(syncedRaw, state.products),
              };
            });
          }
        })
        .catch((error: any) => {
          console.error('Error al sincronizar actualización de insumo en Supabase:', error);
          toast.error(error?.message || 'Error al actualizar el producto en Supabase');
        });
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
    const { sales, rawMaterials, products } = get();
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) {
      return { success: false, error: 'Venta no encontrada en el registro local' };
    }

    const updatedRaw = [...rawMaterials];
    const itemsToIncrement: Array<{ id: string; name: string; qty: number }> = [];

    // Restituir insumos si la venta tiene items asociados
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
          // Si es un producto directo mapeado al insumo
          const idx = updatedRaw.findIndex((m) => m.id === item.product?.id || m.name.toLowerCase() === item.product?.name.toLowerCase());
          const targetId = idx > -1 ? updatedRaw[idx].id : item.product?.id;
          const targetName = idx > -1 ? updatedRaw[idx].name : (item.product?.name || 'Producto');

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

    // 1. Actualizar estado local inmediatamente
    set({
      sales: sales.filter((s) => s.id !== saleId),
      rawMaterials: updatedRaw,
      products: updatedProducts,
    });

    // 2. Ejecutar RPC atómico 'increment_stock' en Supabase por cada insumo/producto devuelto
    for (const entry of itemsToIncrement) {
      try {
        await incrementStock(entry.id, entry.qty);
      } catch (rpcError: any) {
        console.error(`Error en RPC increment_stock para ${entry.id}:`, rpcError);
        toast.error(`Error al restaurar stock en Supabase para ${entry.name}`);
      }
    }

    // 3. Eliminar la venta en Supabase y refrescar inventario
    const deleted = await deleteSale(saleId);
    if (!deleted) {
      toast.error('Error al eliminar la venta anulada en Supabase');
    }
    await get().loadRawMaterials();

    return { success: true };
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
      if (sales.some((s) => s.id === sale.id)) return;
      set({ sales: [sale as Sale, ...sales] });
    } else if (eventType === 'UPDATE' && sale.id) {
      set({ sales: sales.map((s) => (s.id === sale.id ? ({ ...s, ...sale } as Sale) : s)) });
    }
  },
}));
