import { Category, QuickColor, RawMaterial } from '../types';
import { supabase } from '../lib/supabase';

export interface MasterProductTemplate {
  id: string;
  name: string;
  category: Category;
  unit: RawMaterial['unit'];
  quickColor: QuickColor;
  imageUrl?: string;
  suggestedPrice?: number;
  updatedAt: string;
  isBuiltIn?: boolean;
}

const STORAGE_KEY = 'el_chiringuito_master_catalog_v1';

/**
 * Plantillas maestras base para acelerar el alta en nuevas iglesias/sedes.
 * El super_admin puede enriquecerlas con imágenes 3D recortadas o añadir nuevas.
 */
const BUILT_IN_TEMPLATES: MasterProductTemplate[] = [
  {
    id: 'tpl-cafe-con-leche',
    name: 'Café con Leche',
    category: 'Cafés',
    unit: 'unidades',
    quickColor: '#8B5E34',
    suggestedPrice: 1.5,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-cafe-solo',
    name: 'Café Solo',
    category: 'Cafés',
    unit: 'unidades',
    quickColor: '#6F4E37',
    suggestedPrice: 1.2,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-cafe-cortado',
    name: 'Café Cortado',
    category: 'Cafés',
    unit: 'unidades',
    quickColor: '#9A5B13',
    suggestedPrice: 1.3,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-te-infusion',
    name: 'Té / Infusión',
    category: 'cafeteria',
    unit: 'unidades',
    quickColor: '#2D6A4F',
    suggestedPrice: 1.2,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-agua-500',
    name: 'Agua Mineral 500ml',
    category: 'bebidas',
    unit: 'unidades',
    quickColor: '#355C7D',
    suggestedPrice: 1.0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-refresco-lata',
    name: 'Refresco Lata 330ml',
    category: 'bebidas',
    unit: 'unidades',
    quickColor: '#6B4E71',
    suggestedPrice: 1.5,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-croissant',
    name: 'Croissant',
    category: 'snacks',
    unit: 'unidades',
    quickColor: '#B57B3B',
    suggestedPrice: 1.5,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'tpl-napolitana',
    name: 'Napolitana Chocolate',
    category: 'snacks',
    unit: 'unidades',
    quickColor: '#7A4B3A',
    suggestedPrice: 1.6,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
  },
];

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function readStoredTemplates(): MasterProductTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredTemplates(templates: MasterProductTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Ignorar límites de almacenamiento
  }
}

function mergeTemplates(
  base: MasterProductTemplate[],
  overrides: MasterProductTemplate[]
): MasterProductTemplate[] {
  const byKey = new Map<string, MasterProductTemplate>();

  for (const tpl of base) {
    byKey.set(normalizeName(tpl.name), tpl);
  }
  for (const tpl of overrides) {
    if (!tpl?.name) continue;
    const key = normalizeName(tpl.name);
    const prev = byKey.get(key);
    byKey.set(key, {
      ...prev,
      ...tpl,
      isBuiltIn: prev?.isBuiltIn ?? tpl.isBuiltIn ?? false,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aHasImg = a.imageUrl ? 1 : 0;
    const bHasImg = b.imageUrl ? 1 : 0;
    if (bHasImg !== aHasImg) return bHasImg - aHasImg;
    return a.name.localeCompare(b.name, 'es');
  });
}

export function getMasterTemplatesSync(): MasterProductTemplate[] {
  return mergeTemplates(BUILT_IN_TEMPLATES, readStoredTemplates());
}

/**
 * Carga plantillas maestras combinando caché local + registros sincronizados en Supabase (si existen).
 */
export async function loadMasterTemplates(): Promise<MasterProductTemplate[]> {
  const local = readStoredTemplates();
  try {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const remote: MasterProductTemplate[] = data.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || '').trim(),
        category: (row.category || 'cafeteria') as Category,
        unit: (row.unit || 'unidades') as RawMaterial['unit'],
        quickColor: (row.quick_color || row.quickColor || 'default') as QuickColor,
        imageUrl: row.image_url || row.imageUrl || undefined,
        suggestedPrice:
          row.suggested_price !== null && row.suggested_price !== undefined
            ? Number(row.suggested_price)
            : undefined,
        updatedAt: row.updated_at || new Date().toISOString(),
        isBuiltIn: false,
      }));
      const mergedRemote = mergeTemplates(local, remote);
      writeStoredTemplates(mergedRemote);
      return mergeTemplates(BUILT_IN_TEMPLATES, mergedRemote);
    }
  } catch {
    // Fallback silencioso a catálogo local si la tabla product_templates aún no existe
  }

  return mergeTemplates(BUILT_IN_TEMPLATES, local);
}

/**
 * Guarda o actualiza una plantilla en el Catálogo Maestro (exclusivo para super_admin).
 */
export async function saveMasterTemplate(input: {
  name: string;
  category: Category;
  unit: RawMaterial['unit'];
  quickColor: QuickColor;
  imageUrl?: string;
  suggestedPrice?: number;
}): Promise<MasterProductTemplate> {
  const cleanName = input.name.trim();
  const slug = normalizeName(cleanName).replace(/[^a-z0-9]+/g, '-');
  const existingLocal = readStoredTemplates();
  const existingMatch = existingLocal.find(
    (t) => normalizeName(t.name) === normalizeName(cleanName)
  );

  const template: MasterProductTemplate = {
    id: existingMatch?.id || `tpl-${slug || Date.now()}`,
    name: cleanName,
    category: input.category,
    unit: input.unit,
    quickColor: input.quickColor || 'default',
    imageUrl: input.imageUrl?.trim() || undefined,
    suggestedPrice: input.suggestedPrice,
    updatedAt: new Date().toISOString(),
    isBuiltIn: existingMatch?.isBuiltIn ?? false,
  };

  const updatedLocal = [
    template,
    ...existingLocal.filter((t) => normalizeName(t.name) !== normalizeName(cleanName)),
  ];
  writeStoredTemplates(updatedLocal);

  // Intento no bloqueante de sincronización con tabla product_templates si está aprovisionada en dev
  try {
    await supabase.from('product_templates').upsert(
      {
        name: template.name,
        category: template.category,
        unit: template.unit,
        quick_color: template.quickColor,
        image_url: template.imageUrl || null,
        suggested_price: template.suggestedPrice ?? null,
        updated_at: template.updatedAt,
      },
      { onConflict: 'name' }
    );
  } catch {
    // Silencioso: la plantilla ya está guardada en localStorage
  }

  return template;
}
