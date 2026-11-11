import { create } from 'zustand';
import { Product, RawMaterial, CartItem, Sale, PaymentMethod, Role, RecipeItem } from '../types';
import { getRawMaterials, insertRawMaterial, deleteRawMaterial, getSales, insertSale, deleteSale, updateRawMaterialStock } from '../services/db';
import toast from 'react-hot-toast';

export function buildDynamicProducts(rawMaterials: RawMaterial[], savedProducts: Product[] = []): Product[] {
  const colors = ['amber', 'orange', 'yellow', 'emerald', 'cyan', 'red', 'indigo', 'purple'];

  if (!rawMaterials || rawMaterials.length === 0) {
    return [];
  }

  return rawMaterials.map((mat, idx) => {
    const existing = savedProducts.find((p) => p.id === mat.id || p.name.toLowerCase() === mat.name.toLowerCase());
    const basePrice = mat.price !== undefined && mat.price !== null
      ? mat.price
      : (mat.costPerUnit > 0 ? Number((mat.costPerUnit * 2).toFixed(2)) : 1.20);
    const finalPrice = existing?.price !== undefined ? existing.price : (mat.price !== undefined ? mat.price : Math.max(1.00, basePrice));

    const isSellable = mat.isSellable !== undefined
      ? mat.isSellable
      : (existing?.isSellable !== undefined ? existing.isSellable : true);

    const isQuickAccess = mat.isQuickAccess !== undefined
      ? mat.isQuickAccess
      : (existing?.isQuickAccess !== undefined ? existing.isQuickAccess : false);

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
        price: typeof item.price === 'number' ? item.price : undefined,
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
        price: typeof item.price === 'number' ? item.price : undefined,
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
    const { cart } = get();
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      set({ cart: updatedCart });
    } else {
      set({ cart: [...cart, { product, quantity: 1 }] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },

  updateItemNote: (productId, notes) => {
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
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
    const affectedRawMaterials: RawMaterial[] = [];

    cart.forEach((item) => {
      if (item.product.recipe) {
        item.product.recipe.forEach((ing) => {
          const matIndex = updatedRaw.findIndex((m) => m.id === ing.rawMaterialId);
          if (matIndex > -1) {
            updatedRaw[matIndex] = {
              ...updatedRaw[matIndex],
              currentStock: Math.max(0, updatedRaw[matIndex].currentStock - ing.quantity * item.quantity),
            };
            if (!affectedRawMaterials.some((m) => m.id === updatedRaw[matIndex].id)) {
              affectedRawMaterials.push(updatedRaw[matIndex]);
            }
          }
        });
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
    };

    set({
      rawMaterials: updatedRaw,
      products: updatedProducts,
      sales: [newSale, ...sales],
      cart: [],
    });

    // Guardar en Supabase: insertar en sales y luego actualizar stock en raw_materials
    insertSale({
      total,
      payment_method: params.paymentMethod,
      donation_sub_method: params.donationSubMethod ?? null,
      user_name: params.sellerName,
      user_role: params.sellerRole,
    })
      .then(async (createdRows) => {
        if (createdRows && createdRows[0]?.id) {
          const realId = createdRows[0].id;
          set((state) => ({
            sales: state.sales.map((s) => (s.id === newSale.id ? { ...s, id: realId } : s)),
          }));
        }

        if (affectedRawMaterials.length > 0) {
          for (const mat of affectedRawMaterials) {
            const successUpdate = await updateRawMaterialStock(mat.id, mat.currentStock);
            if (!successUpdate) {
              console.error(`Error al actualizar stock de insumo ${mat.id} en Supabase`);
              toast.error(`Error crítico: No se pudo actualizar el stock en Supabase para ${mat.name}`);
            }
          }
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
          set((state) => {
            const rawWithRealId = state.rawMaterials.map((m) =>
              m.id === tempId ? { ...m, id: String(savedItem.id) } : m
            );
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
      insertRawMaterial(updatedItem).catch((error: any) => {
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
    const restoredMaterials: RawMaterial[] = [];

    // Restituir insumos si la venta tiene items asociados
    if (targetSale.items && targetSale.items.length > 0) {
      targetSale.items.forEach((item) => {
        if (item.product?.recipe && item.product.recipe.length > 0) {
          item.product.recipe.forEach((ing) => {
            const idx = updatedRaw.findIndex((m) => m.id === ing.rawMaterialId);
            if (idx > -1) {
              const returnedQty = ing.quantity * item.quantity;
              const newStock = updatedRaw[idx].currentStock + returnedQty;
              updatedRaw[idx] = {
                ...updatedRaw[idx],
                currentStock: newStock,
                isOutOfStock: false,
              };
              if (!restoredMaterials.some((m) => m.id === updatedRaw[idx].id)) {
                restoredMaterials.push(updatedRaw[idx]);
              }
            }
          });
        } else {
          // Si es un producto directo mapeado al insumo
          const idx = updatedRaw.findIndex((m) => m.id === item.product?.id || m.name.toLowerCase() === item.product?.name.toLowerCase());
          if (idx > -1) {
            const newStock = updatedRaw[idx].currentStock + item.quantity;
            updatedRaw[idx] = {
              ...updatedRaw[idx],
              currentStock: newStock,
              isOutOfStock: false,
            };
            if (!restoredMaterials.some((m) => m.id === updatedRaw[idx].id)) {
              restoredMaterials.push(updatedRaw[idx]);
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

    // 2. Ejecutar UPDATE en raw_materials en Supabase sumando el stock restituido
    for (const mat of restoredMaterials) {
      await updateRawMaterialStock(mat.id, mat.currentStock);
    }

    // 3. Eliminar la venta en Supabase
    await deleteSale(saleId);

    return { success: true };
  },

  handleRealtimeRawMaterial: (material, eventType) => {
    const { rawMaterials, products } = get();
    let updated: RawMaterial[];

    if (eventType === 'DELETE') {
      updated = rawMaterials.filter((m) => m.id !== material.id);
    } else if (eventType === 'INSERT') {
      if (rawMaterials.some((m) => m.id === material.id)) return;
      updated = [material, ...rawMaterials];
    } else {
      updated = rawMaterials.map((m) => (m.id === material.id ? { ...m, ...material } : m));
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
