import React, { useState, useEffect, useRef } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SegmentedControl } from '../ui/SegmentedControl';
import { QuickButtonCardPreview, resolveQuickAccentColor } from '../pos/QuickCafeteriaKeypad';
import { RawMaterial, Category, QuickColor } from '../../types';
import {
  Palette,
  RotateCcw,
  Upload,
  Sparkles,
  Trash2,
  Search,
  Layers,
  PlusCircle,
  Check,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, parseMoneyInput, roundMoney } from '../../utils/finance';
import {
  extractDominantColorFromImageUrl,
  processProductImageFile,
} from '../../utils/colorExtractor';
import {
  getMasterTemplatesSync,
  loadMasterTemplates,
  MasterProductTemplate,
  saveMasterTemplate,
} from '../../services/masterCatalog';
import { notifySuperadminMissingProductImage } from '../../services/notifications';
import { cn } from '../../lib/cn';
import toast from 'react-hot-toast';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: RawMaterial | null;
}

const LEGACY_TOKEN_TO_HEX: Record<string, string> = {
  sage: '#2D6A4F',
  slate: '#355C7D',
  terracotta: '#A63A3A',
  amber: '#9A5B13',
  mauve: '#6B4E71',
};

const QUICK_HEX_SUGGESTIONS: { hex: string; label: string }[] = [
  { hex: '#8B5E34', label: 'Espresso' },
  { hex: '#2D6A4F', label: 'Salvia' },
  { hex: '#355C7D', label: 'Pizarra' },
  { hex: '#A63A3A', label: 'Terracota' },
  { hex: '#9A5B13', label: 'Ámbar' },
  { hex: '#6B4E71', label: 'Ciruela' },
];

export function isSuperAdminRole(role?: string): boolean {
  const norm = (role || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim();
  return norm === 'superadmin';
}

type CreationMode = 'template' | 'custom';

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onClose,
  initialMaterial,
}) => {
  const { addRawMaterial, updateRawMaterial } = usePOSStore();
  const { currentUser } = useAuthStore();
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creationMode, setCreationMode] = useState<CreationMode>('template');
  const [templates, setTemplates] = useState<MasterProductTemplate[]>(() =>
    getMasterTemplatesSync()
  );
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MasterProductTemplate | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<RawMaterial['unit']>('unidades');
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(10);
  const [costPerUnit, setCostPerUnit] = useState<number>(0.1);
  const [price, setPrice] = useState<number>(1.5);
  const [stockDraft, setStockDraft] = useState<string>('50');
  const [minStockDraft, setMinStockDraft] = useState<string>('10');
  const [costDraft, setCostDraft] = useState<string>('0.1');
  const [priceDraft, setPriceDraft] = useState<string>('1.5');
  const [category, setCategory] = useState<Category>('Cafés');
  const [isSellable, setIsSellable] = useState<boolean>(true);
  const [isQuickAccess, setIsQuickAccess] = useState<boolean>(false);
  const [quickColor, setQuickColor] = useState<QuickColor>('default');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [saveAsMaster, setSaveAsMaster] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    loadMasterTemplates()
      .then((loaded) => setTemplates(loaded))
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setIsSubmitting(false);
    setIsProcessingImage(false);
    setTemplateSearch('');
    setSelectedTemplate(null);
    setSaveAsMaster(false);

    if (initialMaterial) {
      setCreationMode('custom');
      const initCost = initialMaterial.costPerUnit || 0;
      const initPrice =
        initialMaterial.price ??
        (initialMaterial.costPerUnit > 0
          ? Number((initialMaterial.costPerUnit * 2).toFixed(2))
          : 1.5);
      setName(initialMaterial.name);
      setUnit(initialMaterial.unit || 'unidades');
      setCurrentStock(initialMaterial.currentStock);
      setMinStock(initialMaterial.minStock);
      setCostPerUnit(initCost);
      setPrice(initPrice);
      setStockDraft(String(initialMaterial.currentStock));
      setMinStockDraft(String(initialMaterial.minStock));
      setCostDraft(String(initCost));
      setPriceDraft(String(initPrice));
      setCategory(initialMaterial.category || 'cafeteria');
      setIsSellable(initialMaterial.isSellable !== false);
      setIsQuickAccess(Boolean(initialMaterial.isQuickAccess));
      setImageUrl(initialMaterial.imageUrl || initialMaterial.image_url || '');

      const rawColor = initialMaterial.quickColor || initialMaterial.quick_color || 'default';
      if (rawColor !== 'default' && LEGACY_TOKEN_TO_HEX[rawColor]) {
        setQuickColor(LEGACY_TOKEN_TO_HEX[rawColor]);
      } else {
        setQuickColor(rawColor);
      }
    } else {
      setCreationMode('template');
      setName('');
      setUnit('unidades');
      setCurrentStock(50);
      setMinStock(10);
      setCostPerUnit(0.1);
      setPrice(1.5);
      setStockDraft('50');
      setMinStockDraft('10');
      setCostDraft('0.1');
      setPriceDraft('1.5');
      setCategory('Cafés');
      setIsSellable(true);
      setIsQuickAccess(false);
      setQuickColor('default');
      setImageUrl('');
    }
  }, [initialMaterial, isOpen]);

  const handleSelectTemplate = (tpl: MasterProductTemplate) => {
    setSelectedTemplate(tpl);
    setName(tpl.name);
    setCategory(tpl.category);
    setUnit(tpl.unit || 'unidades');
    setQuickColor(tpl.quickColor || 'default');
    setImageUrl(tpl.imageUrl || '');
    setIsSellable(tpl.category !== 'insumos');
    const suggested = tpl.suggestedPrice ?? 1.5;
    setPrice(suggested);
    setPriceDraft(String(suggested));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen PNG o WebP válida');
      return;
    }

    setIsProcessingImage(true);
    try {
      const processed = await processProductImageFile(file, 256);
      setImageUrl(processed.dataUrl);
      if (processed.dominantColor) {
        setQuickColor(processed.dominantColor);
        toast.success(`Imagen 3D optimizada · Color ${processed.dominantColor} extraído`);
      } else {
        toast.success('Imagen 3D optimizada a WebP');
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo procesar la imagen');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRecalculateColor = async () => {
    if (!imageUrl.trim()) return;
    setIsProcessingImage(true);
    try {
      const extracted = await extractDominantColorFromImageUrl(imageUrl);
      if (extracted) {
        setQuickColor(extracted);
        toast.success(`Color dominante recalculado: ${extracted}`);
      } else {
        toast.error('No se detectó un color dominante claro en la imagen');
      }
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!initialMaterial && creationMode === 'template' && !selectedTemplate) {
      toast.error('Selecciona una plantilla del Catálogo Predefinido o cambia a "Crear desde cero"');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Por favor introduce el nombre del insumo o producto');
      return;
    }

    const finalStock = parseMoneyInput(stockDraft) ?? currentStock;
    const finalMinStock = parseMoneyInput(minStockDraft) ?? minStock;
    const finalCost = parseMoneyInput(costDraft) ?? costPerUnit;
    const finalPrice = parseMoneyInput(priceDraft) ?? price;

    if (
      !Number.isFinite(finalStock) ||
      isNaN(finalStock) ||
      finalStock < 0 ||
      !Number.isFinite(finalMinStock) ||
      isNaN(finalMinStock) ||
      finalMinStock < 0 ||
      !Number.isFinite(finalCost) ||
      isNaN(finalCost) ||
      finalCost < 0
    ) {
      toast.error(
        'El stock, alerta mínima y coste unitario deben ser números válidos mayores o iguales a 0'
      );
      return;
    }

    if (isSellable && (!Number.isFinite(finalPrice) || isNaN(finalPrice) || finalPrice <= 0)) {
      toast.error(`El precio de venta para productos visibles en POS debe ser mayor a ${formatCurrency(0)}`);
      return;
    }

    const finalQuickColor = isSellable ? quickColor : 'default';
    const finalImageUrl = imageUrl.trim() ? imageUrl.trim() : undefined;
    const cleanPrice = isSellable ? Math.max(0.01, roundMoney(finalPrice)) : undefined;

    setIsSubmitting(true);
    try {
      if (initialMaterial) {
        const res = await updateRawMaterial(initialMaterial.id, {
          name: cleanName,
          unit,
          currentStock: Math.max(0, Number(finalStock)),
          minStock: Math.max(0, Number(finalMinStock)),
          costPerUnit: Math.max(0, roundMoney(finalCost)),
          price: cleanPrice,
          category,
          isSellable,
          isQuickAccess,
          quickColor: finalQuickColor,
          quick_color: finalQuickColor,
          imageUrl: finalImageUrl || '',
          image_url: finalImageUrl || '',
        });
        if (!res.success) {
          toast.error(res.error || 'Error de red al actualizar el producto en Supabase');
          return;
        }
        toast.success(`Producto "${cleanName}" actualizado correctamente`);
      } else {
        const res = await addRawMaterial({
          name: cleanName,
          unit,
          currentStock: Math.max(0, Number(finalStock)),
          minStock: Math.max(0, Number(finalMinStock)),
          costPerUnit: Math.max(0, roundMoney(finalCost)),
          price: cleanPrice,
          category,
          isSellable,
          isQuickAccess,
          quickColor: finalQuickColor,
          quick_color: finalQuickColor,
          imageUrl: finalImageUrl,
          image_url: finalImageUrl,
          isOutOfStock: false,
        });
        if (!res.success) {
          toast.error(res.error || 'Error de red al crear el producto en Supabase');
          return;
        }
        toast.success(`Producto "${cleanName}" añadido correctamente`);
      }

      // Guardar como plantilla maestra si el super_admin activó la opción
      if (isSuperAdmin && saveAsMaster && isSellable) {
        await saveMasterTemplate({
          name: cleanName,
          category,
          unit,
          quickColor: finalQuickColor,
          imageUrl: finalImageUrl,
          suggestedPrice: cleanPrice,
        });
        const refreshed = await loadMasterTemplates();
        setTemplates(refreshed);
        toast.success(`"${cleanName}" guardado en el Catálogo Predefinido`);
      }

      // Notificación fire-and-forget al superadmin si el producto vendible no tiene imagen 3D
      if (isSellable && !finalImageUrl) {
        notifySuperadminMissingProductImage({
          productName: cleanName,
          category,
          price: cleanPrice,
          createdBy: currentUser?.name || currentUser?.email || 'Admin POS',
          createdByRole: currentUser?.role,
          action: initialMaterial ? 'updated' : 'created',
        });
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      tpl.name.toLowerCase().includes(q) ||
      String(tpl.category).toLowerCase().includes(q)
    );
  });

  const isLockedToTemplate = !initialMaterial && creationMode === 'template' && Boolean(selectedTemplate);

  const inputClasses =
    'w-full min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-medium border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] placeholder:text-[var(--ql-text-muted)] focus:outline-none focus:border-[var(--ql-text-primary)] transition-colors disabled:opacity-45';

  const labelClasses = 'text-xs font-semibold block mb-1.5 text-[var(--ql-text-secondary)]';

  const isHexActive = quickColor !== 'default' && /^#[0-9A-F]{6}$/i.test(String(quickColor));
  const pickerHexValue = isHexActive ? String(quickColor) : '#8B5E34';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      maxWidth="lg"
      title={initialMaterial ? `Editar: ${initialMaterial.name}` : 'Añadir Producto / Insumo'}
      description={
        initialMaterial
          ? 'Ajusta stock, precio, visibilidad POS o imagen 3D'
          : 'Elige una plantilla del Catálogo Predefinido o crea uno desde cero'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de modo solo al crear un producto nuevo */}
        {!initialMaterial && (
          <SegmentedControl<CreationMode>
            layoutId="ql-inventory-create-mode"
            variant="surface"
            size="sm"
            fullWidth
            ariaLabel="Modo de creación de producto"
            value={creationMode}
            onChange={(nextMode) => {
              setCreationMode(nextMode);
              if (nextMode === 'custom') {
                setSelectedTemplate(null);
              }
            }}
            options={[
              {
                value: 'template',
                label: 'Catálogo Predefinido',
                icon: <Layers className="w-3.5 h-3.5" />,
                badge: templates.length,
              },
              {
                value: 'custom',
                label: 'Crear desde cero',
                icon: <PlusCircle className="w-3.5 h-3.5" />,
              },
            ]}
          />
        )}

        {/* Pestaña 1: Selector de Catálogo Predefinido (Multi-Iglesia) */}
        {!initialMaterial && creationMode === 'template' && (
          <div className="space-y-3">
            {!selectedTemplate ? (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ql-text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Buscar plantilla (ej. Café con leche, Croissant, Agua)..."
                    className="w-full min-h-[42px] pl-10 pr-3.5 rounded-full text-sm border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] text-[var(--ql-text-primary)] placeholder:text-[var(--ql-text-muted)] focus:outline-none focus:border-[var(--ql-hairline-strong)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-0.5">
                  {filteredTemplates.map((tpl) => {
                    const accent = resolveQuickAccentColor(tpl.quickColor, tpl.category);
                    const hasImg = Boolean(tpl.imageUrl);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl)}
                        style={{
                          borderColor: `color-mix(in srgb, ${accent} 22%, var(--ql-hairline))`,
                        }}
                        className="group relative overflow-hidden rounded-2xl pl-4 pr-3 py-3 text-left border bg-[var(--ql-bg-elevated)] hover:bg-[var(--ql-bg-card)] transition-colors cursor-pointer select-none min-h-[78px] flex flex-col justify-between ql-focus-ring"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-1.5 top-2.5 bottom-2.5 w-[3px] rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                        {hasImg && (
                          <img
                            src={tpl.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-1.5 -bottom-1.5 w-14 h-14 object-contain opacity-95 drop-shadow-[0_4px_8px_rgba(20,18,16,0.18)]"
                          />
                        )}
                        <div className={cn('relative z-10', hasImg && 'pr-8')}>
                          <span className="text-xs sm:text-sm font-semibold text-[var(--ql-text-primary)] line-clamp-2 leading-snug block">
                            {tpl.name}
                          </span>
                          <span className="text-[10.5px] text-[var(--ql-text-muted)] capitalize block mt-0.5">
                            {tpl.category}
                          </span>
                        </div>
                        <div className="relative z-10 mt-1.5 flex items-center gap-1.5">
                          {hasImg ? (
                            <Badge variant="success" size="sm">
                              3D lista
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-[var(--ql-text-muted)]">
                              Plantilla base
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredTemplates.length === 0 && (
                  <p className="text-xs text-center py-6 text-[var(--ql-text-muted)]">
                    No hay plantillas que coincidan. Puedes crear el producto en la pestaña{' '}
                    <strong className="text-[var(--ql-text-primary)]">Crear desde cero</strong>.
                  </p>
                )}
              </>
            ) : (
              /* Resumen de Plantilla Seleccionada (autocompletada: solo editar precio y stock) */
              <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="success" size="sm">
                      <Check className="w-3 h-3" /> Plantilla aplicada
                    </Badge>
                    <span className="text-xs text-[var(--ql-text-secondary)] truncate capitalize">
                      {category} · {unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Cambiar
                  </Button>
                </div>

                <div className="max-w-[220px]">
                  <QuickButtonCardPreview
                    name={name}
                    price={price}
                    category={category}
                    quickColor={quickColor}
                    imageUrl={imageUrl}
                  />
                </div>

                <p className="text-[11px] text-[var(--ql-text-secondary)]">
                  Nombre, categoría, imagen y color ya están configurados. Solo ajusta el{' '}
                  <strong className="text-[var(--ql-text-primary)]">precio de venta</strong> y el{' '}
                  <strong className="text-[var(--ql-text-primary)]">stock</strong> para tu iglesia.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Campos de identidad (editables en Crear desde cero o al Editar) */}
        {!isLockedToTemplate && (creationMode === 'custom' || Boolean(initialMaterial)) && (
          <>
            <div>
              <label className={labelClasses}>Nombre del Insumo / Producto *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Capuchino, Agua Mineral, Croissant..."
                className={inputClasses}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Categoría</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as Category;
                    setCategory(cat);
                    if (cat === 'insumos') {
                      setIsSellable(false);
                    }
                  }}
                  className={inputClasses}
                >
                  <option value="Cafés">Cafés</option>
                  <option value="cafeteria">Cafetería</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="snacks">Snacks</option>
                  <option value="donativos">Donativos</option>
                  <option value="insumos">Insumos / Desechables</option>
                </select>
              </div>

              <div>
                <label className={labelClasses}>Unidad de Medida</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as RawMaterial['unit'])}
                  className={inputClasses}
                >
                  <option value="unidades">Unidades (uds)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="gramos">Gramos (g)</option>
                  <option value="sobres">Sobres / Bolsitas</option>
                  <option value="paquetes">Paquetes</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Campos numéricos (siempre visibles salvo cuando falta elegir plantilla) */}
        {(creationMode === 'custom' || Boolean(initialMaterial) || Boolean(selectedTemplate)) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>
                  Precio de Venta (€) {isSellable ? '*' : '(Opcional)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={!isSellable}
                  value={priceDraft}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setPriceDraft('');
                      setPrice(0);
                      return;
                    }
                    if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
                    setPriceDraft(raw);
                    const parsed = parseMoneyInput(raw);
                    if (parsed !== null) setPrice(parsed);
                  }}
                  onBlur={() => {
                    const safeVal = parseMoneyInput(priceDraft) ?? 0;
                    setPriceDraft(String(safeVal));
                    setPrice(safeVal);
                  }}
                  className={cn(inputClasses, 'font-semibold ql-num')}
                />
              </div>

              <div>
                <label className={labelClasses}>Coste Unitario (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={costDraft}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setCostDraft('');
                      setCostPerUnit(0);
                      return;
                    }
                    if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
                    setCostDraft(raw);
                    const parsed = parseMoneyInput(raw);
                    if (parsed !== null) setCostPerUnit(parsed);
                  }}
                  onBlur={() => {
                    const safeVal = parseMoneyInput(costDraft) ?? 0;
                    setCostDraft(String(safeVal));
                    setCostPerUnit(safeVal);
                  }}
                  className={cn(inputClasses, 'ql-num')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Stock Inicial</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stockDraft}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setStockDraft('');
                      setCurrentStock(0);
                      return;
                    }
                    if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
                    setStockDraft(raw);
                    const parsed = parseMoneyInput(raw);
                    if (parsed !== null) setCurrentStock(parsed);
                  }}
                  onBlur={() => {
                    const safeVal = parseMoneyInput(stockDraft) ?? 0;
                    setStockDraft(String(safeVal));
                    setCurrentStock(safeVal);
                  }}
                  className={cn(inputClasses, 'ql-num')}
                />
              </div>

              <div>
                <label className={labelClasses}>Alerta Stock Mínimo</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={minStockDraft}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setMinStockDraft('');
                      setMinStock(0);
                      return;
                    }
                    if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
                    setMinStockDraft(raw);
                    const parsed = parseMoneyInput(raw);
                    if (parsed !== null) setMinStock(parsed);
                  }}
                  onBlur={() => {
                    const safeVal = parseMoneyInput(minStockDraft) ?? 0;
                    setMinStockDraft(String(safeVal));
                    setMinStock(safeVal);
                  }}
                  className={cn(inputClasses, 'ql-num')}
                />
              </div>
            </div>

            {/* Toggles de visibilidad POS y Botones Rápidos */}
            <div className="space-y-2 pt-3 border-t border-[var(--ql-hairline)]">
              {!isLockedToTemplate && (
                <label className="flex items-center justify-between p-3 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold block text-[var(--ql-text-primary)]">
                      Mostrar en pantalla de ventas POS
                    </span>
                    <span className="text-xs block text-[var(--ql-text-secondary)]">
                      Visible para ser cobrado en el mostrador
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSellable}
                    onChange={(e) => {
                      setIsSellable(e.target.checked);
                      if (!e.target.checked) setIsQuickAccess(false);
                    }}
                    className="w-5 h-5 accent-[var(--ql-accent-bg)] rounded cursor-pointer"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-3 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] cursor-pointer">
                <div>
                  <span className="text-sm font-semibold block text-[var(--ql-text-primary)]">
                    Añadir a Botones Rápidos
                  </span>
                  <span className="text-xs block text-[var(--ql-text-secondary)]">
                    Acceso directo de 1 toque en el panel superior del POS
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isSellable}
                  checked={isQuickAccess}
                  onChange={(e) => setIsQuickAccess(e.target.checked)}
                  className="w-5 h-5 accent-[var(--ql-accent-bg)] rounded cursor-pointer disabled:opacity-40"
                />
              </label>

              {/* BLOQUE EXCLUSIVO SUPERADMIN: Subida de Imagen 3D recortada + Color automático + Plantilla Maestra */}
              {isSuperAdmin && isSellable && (
                <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline-strong)] bg-[var(--ql-bg-elevated)] space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[var(--ql-text-primary)] shrink-0" />
                      <div>
                        <span className="text-sm font-semibold block text-[var(--ql-text-primary)]">
                          Imagen 3D Recortada & Plantilla Maestra
                        </span>
                        <span className="text-[11px] text-[var(--ql-text-secondary)] block">
                          PNG/WebP transparente · Compresión automática y extracción de color
                        </span>
                      </div>
                    </div>
                    <Badge variant="purple" size="sm">
                      Superadmin
                    </Badge>
                  </div>

                  {/* Vista previa en vivo idéntica al Botón Rápido + Controles de imagen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--ql-text-muted)] block mb-1.5">
                        Vista previa en vivo
                      </span>
                      <QuickButtonCardPreview
                        name={name}
                        price={price}
                        category={category}
                        quickColor={quickColor}
                        imageUrl={imageUrl}
                      />
                    </div>

                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        isLoading={isProcessingImage}
                        disabled={isProcessingImage}
                        icon={<Upload className="w-3.5 h-3.5" />}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        {imageUrl ? 'Cambiar imagen PNG/WebP' : 'Subir imagen PNG/WebP'}
                      </Button>

                      {imageUrl && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            disabled={isProcessingImage}
                            icon={<RefreshCw className="w-3.5 h-3.5" />}
                            onClick={handleRecalculateColor}
                            className="flex-1"
                          >
                            Recalcular color
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={isProcessingImage}
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => setImageUrl('')}
                            aria-label="Quitar imagen"
                            className="text-[var(--ql-tone-terracotta)]"
                          >
                            Quitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interruptor Guardar en Catálogo Predefinido (Plantilla Maestra) */}
                  <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] cursor-pointer">
                    <div className="flex items-start gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-[var(--ql-tone-amber)] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs sm:text-sm font-semibold block text-[var(--ql-text-primary)]">
                          Guardar en Catálogo Predefinido (Plantilla Maestra)
                        </span>
                        <span className="text-[11px] block text-[var(--ql-text-secondary)]">
                          Foto 3D y color disponibles para reutilizar sin volver a subir
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={saveAsMaster}
                      onChange={(e) => setSaveAsMaster(e.target.checked)}
                      className="w-5 h-5 accent-[var(--ql-accent-bg)] rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              )}

              {/* Acento mineral / HEX manual (solo si no está bloqueado a plantilla) */}
              {isSellable && !isLockedToTemplate && (
                <div className="p-3.5 rounded-2xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-elevated)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold flex items-center gap-1.5 text-[var(--ql-text-primary)]">
                      <Palette className="w-3.5 h-3.5 text-[var(--ql-text-secondary)]" />
                      Acento mineral (barra 3 px y borde)
                    </span>

                    {quickColor !== 'default' && (
                      <button
                        type="button"
                        onClick={() => setQuickColor('default')}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Auto categoría
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] cursor-pointer flex-1 min-h-[42px]">
                      <input
                        type="color"
                        value={pickerHexValue}
                        onChange={(e) => setQuickColor(e.target.value.toUpperCase())}
                        aria-label="Selector de color HEX"
                        className="w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer shrink-0 p-0"
                      />
                      <span className="text-xs font-medium text-[var(--ql-text-secondary)] truncate">
                        {quickColor === 'default'
                          ? 'Automático por categoría'
                          : String(quickColor).toUpperCase()}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={quickColor === 'default' ? '' : String(quickColor)}
                      placeholder="#8B5E34"
                      maxLength={7}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (!val) {
                          setQuickColor('default');
                        } else {
                          setQuickColor(
                            val.startsWith('#') ? val.toUpperCase() : `#${val.toUpperCase()}`
                          );
                        }
                      }}
                      aria-label="Código hexadecimal"
                      className="w-24 min-h-[42px] rounded-xl px-2.5 text-xs ql-num uppercase font-semibold border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] focus:outline-none focus:border-[var(--ql-text-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_HEX_SUGGESTIONS.map((s) => {
                      const selected = String(quickColor).toUpperCase() === s.hex;
                      return (
                        <button
                          key={s.hex}
                          type="button"
                          onClick={() => setQuickColor(s.hex)}
                          className={cn(
                            'px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors',
                            selected
                              ? 'bg-[var(--ql-accent-bg)] text-[var(--ql-accent-text)] border-transparent font-semibold'
                              : 'bg-[var(--ql-bg-card)] border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)]'
                          )}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.hex }}
                          />
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting ||
              isProcessingImage ||
              (!initialMaterial && creationMode === 'template' && !selectedTemplate)
            }
            isLoading={isSubmitting}
            className="flex-1 font-semibold"
          >
            {initialMaterial ? 'Guardar Cambios' : 'Guardar Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
