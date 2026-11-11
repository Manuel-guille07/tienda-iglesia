import { User, RawMaterial, Product, CustomerTab } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Admin ELARX',
    pin: '0000',
    role: 'super_admin',
    avatar: '👑',
    email: 'admin@tienda.local',
    isActive: true
  },
  {
    id: 'user-1',
    name: 'Hermano Carlos',
    pin: '1234',
    role: 'Vendedor',
    avatar: '👨‍💼',
    email: 'carlos@iglesia.org',
    isActive: true
  },
  {
    id: 'user-2',
    name: 'Hermana María',
    pin: '5678',
    role: 'Tesorería',
    avatar: '👩‍💼',
    email: 'tesoreria@iglesia.org',
    isActive: true
  },
  {
    id: 'user-3',
    name: 'Pastor David',
    pin: '9999',
    role: 'Pastor',
    avatar: '🧔',
    email: 'pastor@iglesia.org',
    isActive: true
  }
];

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  {
    id: 'raw-capsule',
    name: 'Cápsulas Café Espresso',
    unit: 'unidades',
    currentStock: 120,
    minStock: 25,
    costPerUnit: 0.28
  },
  {
    id: 'raw-milk',
    name: 'Leche (ml)',
    unit: 'ml',
    currentStock: 6000,
    minStock: 1500,
    costPerUnit: 0.0012
  },
  {
    id: 'raw-cups',
    name: 'Vasos Desechables',
    unit: 'unidades',
    currentStock: 150,
    minStock: 30,
    costPerUnit: 0.05
  },
  {
    id: 'raw-stirrers',
    name: 'Azúcar y Removedores',
    unit: 'sobres',
    currentStock: 200,
    minStock: 40,
    costPerUnit: 0.02
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-cafe-solo',
    name: 'Café Solo / Espresso',
    price: 1.20,
    category: 'cafeteria',
    description: 'Café espresso recién preparado',
    isPreset: true,
    color: 'amber',
    badge: 'Popular',
    recipe: [
      { rawMaterialId: 'raw-capsule', quantity: 1 },
      { rawMaterialId: 'raw-cups', quantity: 1 },
      { rawMaterialId: 'raw-stirrers', quantity: 1 }
    ]
  },
  {
    id: 'prod-cafe-leche',
    name: 'Café con Leche',
    price: 1.50,
    category: 'cafeteria',
    description: 'Café espresso con leche espumada (150ml)',
    isPreset: true,
    color: 'orange',
    badge: 'Top Ventas',
    recipe: [
      { rawMaterialId: 'raw-capsule', quantity: 1 },
      { rawMaterialId: 'raw-milk', quantity: 150 },
      { rawMaterialId: 'raw-cups', quantity: 1 },
      { rawMaterialId: 'raw-stirrers', quantity: 1 }
    ]
  },
  {
    id: 'prod-cortado',
    name: 'Café Cortado',
    price: 1.30,
    category: 'cafeteria',
    description: 'Café con un toque de leche (60ml)',
    isPreset: true,
    color: 'amber',
    recipe: [
      { rawMaterialId: 'raw-capsule', quantity: 1 },
      { rawMaterialId: 'raw-milk', quantity: 60 },
      { rawMaterialId: 'raw-cups', quantity: 1 },
      { rawMaterialId: 'raw-stirrers', quantity: 1 }
    ]
  },
  {
    id: 'prod-capuchino',
    name: 'Capuchino Especial',
    price: 2.00,
    category: 'cafeteria',
    description: 'Espresso y cremosa espuma de leche',
    isPreset: true,
    color: 'yellow',
    recipe: [
      { rawMaterialId: 'raw-capsule', quantity: 1 },
      { rawMaterialId: 'raw-milk', quantity: 200 },
      { rawMaterialId: 'raw-cups', quantity: 1 },
      { rawMaterialId: 'raw-stirrers', quantity: 1 }
    ]
  },
  {
    id: 'prod-te',
    name: 'Té / Infusión',
    price: 1.20,
    category: 'cafeteria',
    description: 'Manzanilla, menta o té',
    isPreset: true,
    color: 'emerald',
    recipe: [
      { rawMaterialId: 'raw-cups', quantity: 1 },
      { rawMaterialId: 'raw-stirrers', quantity: 1 }
    ]
  },
  {
    id: 'prod-agua',
    name: 'Agua Mineral 500ml',
    price: 1.00,
    category: 'bebidas',
    description: 'Botella de agua mineral fría',
    isPreset: true,
    color: 'cyan',
    directStock: 48,
    minDirectStock: 12
  },
  {
    id: 'prod-refresco',
    name: 'Refresco Lata',
    price: 1.50,
    category: 'bebidas',
    description: 'Refresco variado 330ml',
    isPreset: true,
    color: 'red',
    directStock: 36,
    minDirectStock: 10
  },
  {
    id: 'prod-croissant',
    name: 'Croissant / Bollería',
    price: 1.50,
    category: 'snacks',
    description: 'Croissant artesanal',
    directStock: 20,
    minDirectStock: 5
  },
  {
    id: 'prod-donativo-1',
    name: 'Donativo Chiringuito 1€',
    price: 1.00,
    category: 'donativos',
    description: 'Ofrenda voluntaria pro-fondos',
    badge: 'Ofrenda'
  }
];

export const INITIAL_CUSTOMERS: CustomerTab[] = [
  {
    id: 'cust-1',
    name: 'Hermano Pedro Martínez',
    phone: '+34600112233',
    churchGroup: 'Diaconado',
    balance: 10.00,
    debt: 0.00,
    movements: [
      {
        id: 'mov-1',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        type: 'recarga',
        amount: 10.00,
        description: 'Recarga saldo en efectivo'
      }
    ]
  },
  {
    id: 'cust-2',
    name: 'Grupo de Alabanza',
    phone: '+34655443322',
    churchGroup: 'Alabanza',
    balance: 0.00,
    debt: 7.50,
    movements: [
      {
        id: 'mov-2',
        timestamp: new Date().toISOString(),
        type: 'deuda',
        amount: 7.50,
        description: 'Ensayos sábado: 5 Cafés'
      }
    ]
  },
  {
    id: 'cust-3',
    name: 'Hermana Marta López',
    phone: '+34677889900',
    churchGroup: 'Escuela Dominical',
    balance: 5.00,
    debt: 0.00,
    movements: []
  }
];

