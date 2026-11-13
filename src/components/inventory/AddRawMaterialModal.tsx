import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RawMaterial, Category, QuickColor } from '../../types';
import { Palette, RotateCcw } from 'lucide-react';
import { parseMoneyInput, roundMoney } from '../../utils/finance';
import toast from 'react-hot-toast';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: RawMaterial | null;
}

const LEGACY_TOKEN_TO_HEX: Record<string, string> = {
  sage: '#059669',
  slate: '#0284C7',
  terracotta: '#E11D48',
  amber: '#D97706',
  mauve: '#7C3AED',
};

const QUICK_HEX_SUGGESTIONS: { hex: string; label: string }[] = [
  { hex: '#8B5E34', label: 'Espresso' },
  { hex: '#059669', label: 'Salvia' },
  { hex: '#0284C7', label: 'Pizarra' },
  { hex: '#F40009', label: 'Rojo' },
  { hex: '#D97706', label: 'Ámbar' },
  { hex: '#7C3AED', label: 'Malva' },
];

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onClose,
  initialMaterial,
}) => {
  const { addRawMaterial, updateRawMaterial } = usePOSStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setIsSubmitting(false);
    if (initialMaterial) {
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

      const rawColor = initialMaterial.quickColor || initialMaterial.quick_color || 'default';
      if (rawColor !== 'default' && LEGACY_TOKEN_TO_HEX[rawColor]) {
        setQuickColor(LEGACY_TOKEN_TO_HEX[rawColor]);
      } else {
        setQuickColor(rawColor);
      }
    } else {
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
    }
  }, [initialMaterial, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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
      toast.error('El precio de venta para productos visibles en POS debe ser mayor a 0.00€');
      return;
    }

    const finalQuickColor = isSellable ? quickColor : 'default';

    setIsSubmitting(true);
    try {
      if (initialMaterial) {
        const res = await updateRawMaterial(initialMaterial.id, {
          name: cleanName,
          unit,
          currentStock: Math.max(0, Number(finalStock)),
          minStock: Math.max(0, Number(finalMinStock)),
          costPerUnit: Math.max(0, roundMoney(finalCost)),
          price: isSellable ? Math.max(0.01, roundMoney(finalPrice)) : undefined,
          category,
          isSellable,
          isQuickAccess,
          quickColor: finalQuickColor,
          quick_color: finalQuickColor,
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
          price: isSellable ? Math.max(0.01, roundMoney(finalPrice)) : undefined,
          category,
          isSellable,
          isQuickAccess,
          quickColor: finalQuickColor,
          quick_color: finalQuickColor,
          isOutOfStock: false,
        });
        if (!res.success) {
          toast.error(res.error || 'Error de red al crear el producto en Supabase');
          return;
        }
        toast.success(`Insumo "${cleanName}" añadido correctamente`);
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = `w-full min-h-[46px] rounded-xl px-3.5 py-2.5 text-sm font-medium border focus:outline-none transition ${
    isDark
      ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
      : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
  }`;

  const labelClasses = `text-xs font-semibold block mb-1.5 ${
    isDark ? 'text-[#9A9086]' : 'text-[#141210]'
  }`;

  const isHexActive = quickColor !== 'default' && /^#[0-9A-F]{6}$/i.test(String(quickColor));
  const pickerHexValue = isHexActive ? String(quickColor) : '#8B5E34';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={initialMaterial ? `Editar: ${initialMaterial.name}` : 'Añadir Nuevo Insumo / Producto'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="grid grid-cols-2 gap-3">
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
              className={`${inputClasses} tabular-nums`}
            />
          </div>

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
              className={`${inputClasses} font-bold tabular-nums disabled:opacity-40`}
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
              className={`${inputClasses} tabular-nums`}
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
              className={`${inputClasses} tabular-nums`}
            />
          </div>
        </div>

        {/* Toggles de Visibilidad POS y Botonera Rápida */}
        <div
          className={`space-y-2.5 pt-3 border-t ${
            isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
          }`}
        >
          <div
            className={`flex items-center justify-between p-3 rounded-2xl border ${
              isDark
                ? 'bg-[#211D1A] border-[#2A2420]'
                : 'bg-[#EFECE6] border-[#E2DDD5]'
            }`}
          >
            <div>
              <span className="text-sm font-semibold block">Mostrar en pantalla de ventas POS</span>
              <span
                className={`text-xs block ${
                  isDark ? 'text-[#9A9086]' : 'text-[#4A433D]'
                }`}
              >
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
              className="w-5 h-5 accent-[#141210] rounded cursor-pointer"
            />
          </div>

          <div
            className={`flex items-center justify-between p-3 rounded-2xl border ${
              isDark
                ? 'bg-[#211D1A] border-[#2A2420]'
                : 'bg-[#EFECE6] border-[#E2DDD5]'
            }`}
          >
            <div>
              <span className="text-sm font-semibold block">Añadir a Botones Rápidos</span>
              <span
                className={`text-xs block ${
                  isDark ? 'text-[#9A9086]' : 'text-[#4A433D]'
                }`}
              >
                Acceso directo de 1 toque en el panel superior del POS
              </span>
            </div>
            <input
              type="checkbox"
              disabled={!isSellable}
              checked={isQuickAccess}
              onChange={(e) => setIsQuickAccess(e.target.checked)}
              className="w-5 h-5 accent-[#141210] rounded cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Selector Hexadecimal Exacto (Visible cuando is_sellable = true) */}
          {isSellable && (
            <div
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420]'
                  : 'bg-[#EFECE6] border-[#E2DDD5]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    <Palette className="w-4 h-4 shrink-0" />
                    Color Cristal (HEX) en Botones Rápidos
                  </span>
                  <span
                    className={`text-xs block mt-0.5 ${
                      isDark ? 'text-[#9A9086]' : 'text-[#4A433D]'
                    }`}
                  >
                    Elige cualquier color exacto para el efecto Glassmorphism del botón rápido
                  </span>
                </div>

                {quickColor !== 'default' && (
                  <button
                    type="button"
                    onClick={() => setQuickColor('default')}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 cursor-pointer shrink-0 ${
                      isDark
                        ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] hover:border-[#3D352F]'
                        : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] hover:border-[#141210]'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Neutro
                  </button>
                )}
              </div>

              {/* Control Nativo Color + Input HEX Editable */}
              <div className="flex items-center gap-2.5">
                <label
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer flex-1 min-h-[48px] ${
                    isDark
                      ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                      : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                  }`}
                >
                  <input
                    type="color"
                    value={pickerHexValue}
                    onChange={(e) => setQuickColor(e.target.value.toUpperCase())}
                    aria-label="Selector de color HEX para botón rápido"
                    className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer shrink-0 p-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold block">
                      {quickColor === 'default' ? 'Neutro Quiet Luxury' : 'Color Cristal Activo'}
                    </span>
                    <span
                      className={`text-xs font-mono uppercase block ${
                        isDark ? 'text-[#9A9086]' : 'text-[#4A433D]'
                      }`}
                    >
                      {quickColor === 'default' ? 'default' : String(quickColor).toUpperCase()}
                    </span>
                  </div>
                </label>

                <input
                  type="text"
                  value={quickColor === 'default' ? '' : String(quickColor)}
                  placeholder="#F40009"
                  maxLength={7}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) {
                      setQuickColor('default');
                    } else {
                      setQuickColor(val.startsWith('#') ? val.toUpperCase() : `#${val.toUpperCase()}`);
                    }
                  }}
                  aria-label="Código hexadecimal"
                  className={`w-28 min-h-[48px] rounded-xl px-3 text-sm font-mono uppercase font-semibold border focus:outline-none ${
                    isDark
                      ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
                      : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
                  }`}
                />
              </div>

              {/* Sugerencias Rápidas HEX */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {QUICK_HEX_SUGGESTIONS.map((s) => {
                  const selected = String(quickColor).toUpperCase() === s.hex;
                  return (
                    <button
                      key={s.hex}
                      type="button"
                      onClick={() => setQuickColor(s.hex)}
                      title={`${s.label} (${s.hex})`}
                      className={`px-2.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
                        selected
                          ? isDark
                            ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold'
                            : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold'
                          : isDark
                          ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
                          : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15"
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
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="flex-1 font-bold"
          >
            {initialMaterial ? 'Guardar Cambios' : 'Guardar Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};