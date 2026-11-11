export type Role = 'Vendedor' | 'Tesorería' | 'Pastor' | 'super_admin';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: Role;
  avatar?: string;
  email?: string;
  isActive?: boolean;
}

export type Category = 'cafeteria' | 'bebidas' | 'snacks' | 'donativos' | 'merchandising';

export interface RawMaterial {
  id: string;
  name: string;
  unit: 'unidades' | 'ml' | 'gramos' | 'sobres' | 'paquetes';
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  isOutOfStock?: boolean;
}

export interface RecipeItem {
  rawMaterialId: string;
  quantity: number; // e.g. 1 capsule, 150ml milk, 1 cup
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  description?: string;
  isPreset?: boolean; // Quick keypad button on cafeteria screen
  recipe?: RecipeItem[];
  directStock?: number; // for direct items like bottled water or snacks
  minDirectStock?: number;
  badge?: string;
  color?: string; // Color tag for UI button
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  customPrice?: number;
}

export type PaymentMethod = 'efectivo' | 'datafono' | 'fiado' | 'donativo' | 'consumo_interno';

export interface Sale {
  id: string;
  timestamp: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeGiven?: number;
  customerTabId?: string;
  customerName?: string;
  sellerName: string;
  sellerRole: Role;
  notes?: string;
  donationSubMethod?: 'efectivo' | 'datafono';
}

export interface TabMovement {
  id: string;
  timestamp: string;
  type: 'deuda' | 'pago' | 'recarga';
  amount: number;
  description: string;
  saleId?: string;
  paymentMethod?: 'efectivo' | 'datafono';
}

export interface CustomerTab {
  id: string;
  name: string;
  phone: string;
  balance: number; // Saldo prepago a favor
  debt: number;    // Saldo adeudado
  movements: TabMovement[];
  churchGroup?: string;
}

export interface Incident {
  id: string;
  timestamp: string;
  author: string;
  role: Role;
  text: string;
  category: 'caja' | 'maquinaria' | 'inventario' | 'otro';
}

export interface ShiftClose {
  id: string;
  timestamp: string;
  closedBy: string;
  role: Role;
  expectedCash: number;
  actualCash: number;
  totalCard: number;
  totalFiados: number;
  totalDonativos: number;
  totalConsumoInterno: number;
  totalCoffeesSold: number;
  totalSalesCount: number;
  totalRevenue: number;
  difference: number;
  notes?: string;
  incidents: Incident[];
  exportStatus: 'pending' | 'synced';
  salesCash?: number;
  tabPaymentsCash?: number;
  salesCard?: number;
  tabPaymentsCard?: number;
}

export type Language = 'es' | 'en';

export interface VoidAuditRecord {
  id: string;
  saleId: string;
  voidedBy: string;
  voidedByRole: string;
  timestamp: string;
  reason: string;
  returnedItems: { name: string; quantity: number }[];
  returnedAmount: number;
  paymentMethod: PaymentMethod;
}

