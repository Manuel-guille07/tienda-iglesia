import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RawMaterial, Category, QuickColor } from '../../types';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: RawMaterial | null;
}

export const QUIET_LUXURY_QUICK_COLORS: {
  id: QuickColor;
  label: string;
  hint: string;
  swatchClass: string;
}[] = [
  {
    id: 'default',
    label: 'Piedra / Café',
    hint: 'Estándar neutro',
    swatchClass: 'bg-[#7A6F64]',
  },
  {
    id: 'sage',
    label: 'Verde Salvia',
    hint: 'Tés y saludables',
    swatchClass: 'bg-emerald-600',
  },
  {
    id: 'slate',
    label: 'Azul Pizarra',
    hint: 'Agua y bebidas frías',
    swatchClass: 'bg-sky-600',
  },
  {
    id: 'terracotta',
    label: 'Rojo Ladrillo',
    hint: 'Postres y dulces',
    swatchClass: 'bg-rose-600',
  },
  {
    id: 'amber',
    label: 'Ámbar / Mostaza',
    hint: 'Bollería y panadería',
    swatchClass: 'bg-amber-600',
  },
  {
    id: 'mauve',
    label: 'Malva / Púrpura',
    hint: 'Especiales y donativos',
    swatchClass: 'bg-purple-600',
  },
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
  const [costPerUnit, setCostPerUnit] = useState<number>(0.10);
  const [price, setPrice] = useState<number>(1.50);
  const [category, setCategory] = useState<Category>('cafeteria');
  const [isSellable, setIsSellable] = useState<boolean>(true);
  const [isQuickAccess, setIsQuickAccess] = useState<boolean>(false);
  const [quickColor, setQuickColor] = useState<QuickColor>('default');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setIsSubmitting(false);
    if (initialMaterial) {
      setName(initialMaterial.name);
      setUnit(initialMaterial.unit || 'unidades');
      setCurrentStock(initialMaterial.currentStock);
      setMinStock(initialMaterial.minStock);
      setCostPerUnit(initialMaterial.costPerUnit || 0);
      setPrice(
        initialMaterial.price ??
          (initialMaterial.costPerUnit > 0
            ? Number((initialMaterial.costPerUnit * 2).toFixed(2))
            : 1.50)
      );
      setCategory(initialMaterial.category || 'cafeteria');
      setIsSellable(initialMaterial.isSellable !== false);
      setIsQuickAccess(Boolean(initialMaterial.isQuickAccess));
      setQuickColor(
        (initialMaterial.quickColor || initialMaterial.quick_color || 'default') as QuickColor
      );
    } else {
      setName('');
      setUnit('unidades');
      setCurrentStock(50);
      setMinStock(10);
      setCostPerUnit(0.10);
      setPrice(1.50);
      setCategory('cafeteria');
      setIsSellable(true);
      setIsQuickAccess(false);
      setQuickColor('default');
    }
  }, [initialMaterial, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Por favor introduce el nombre del insumo o producto');
      return;
    }

    if (
      !Number.isFinite(currentStock) ||
      isNaN(currentStock) ||
      currentStock < 0 ||
      !Number.isFinite(minStock) ||
      isNaN(minStock) ||
      minStock < 0 ||
      !Number.isFinite(costPerUnit) ||
      isNaN(costPerUnit) ||
      costPerUnit < 0
    ) {
      toast.error('El stock, alerta mínima y coste unitario deben ser números válidos mayores o iguales a 0');
      return;
    }

    if (isSellable && (!Number.isFinite(price) || isNaN(price) || price <= 0)) {
      toast.error('El precio de venta para productos visibles en POS debe ser mayor a 0.00€');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialMaterial) {
        updateRawMaterial(initialMaterial.id, {
          name: cleanName,
          unit,
          currentStock: Math.max(0, Number(currentStock)),
          minStock: Math.max(0, Number(minStock)),
          costPerUnit: Math.max(0, Number(costPerUnit)),
          price: isSellable ? Math.max(0.01, Number(price)) : undefined,
          category,
          isSellable,
          isQuickAccess,
          quickColor: isSellable ? quickColor : 'default',
          quick_color: isSellable ? quickColor : 'default',
        });
        toast.success(`Producto "${cleanName}" actualizado correctamente`);
      } else {
        addRawMaterial({
          name: cleanName,
          unit,
          currentStock: Math.max(0, Number(currentStock)),
          minStock: Math.max(0, Number(minStock)),
          costPerUnit: Math.max(0, Number(costPerUnit)),
          price: isSellable ? Math.max(0.01, Number(price)) : undefined,
          category,
          isSellable,
          isQuickAccess,
          quickColor: isSellable ? quickColor : 'default',
          quick_color: isSellable ? quickColor : 'default',
          isOutOfStock: false,
        });
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
    isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
  }`;

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
            placeholder="ej. Café con Leche, Agua Mineral, Croissant..."
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
              <option value="cafeteria">Cafetería</option>
              <option value="bebidas">Bebidas</option>
              <option value="snacks">Snacks</option>
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
              type="number"
              step="0.01"
              min="0"
              value={Number.isFinite(costPerUnit) ? costPerUnit : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setCostPerUnit(Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0);
              }}
              className={`${inputClasses} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelClasses}>
              Precio de Venta (€) {isSellable ? '*' : '(Opcional)'}
            </label>
            <input
              type="number"
              step="0.05"
              min="0.01"
              disabled={!isSellable}
              value={Number.isFinite(price) ? price : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setPrice(Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0);
              }}
              className={`${inputClasses} font-bold tabular-nums disabled:opacity-40`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>Stock Inicial</label>
            <input
              type="number"
              step="1"
              min="0"
              value={Number.isFinite(currentStock) ? currentStock : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setCurrentStock(Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0);
              }}
              className={`${inputClasses} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelClasses}>Alerta Stock Mínimo</label>
            <input
              type="number"
              step="1"
              min="0"
              value={Number.isFinite(minStock) ? minStock : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setMinStock(Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0);
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
                  isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
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
                  isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
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

          {/* Selector de Color Curado Quiet Luxury (Visible cuando is_sellable = true) */}
          {isSellable && (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420]'
                  : 'bg-[#EFECE6] border-[#E2DDD5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold block">
                    Color Semántico en Botones Rápidos
                  </span>
                  <span
                    className={`text-xs block ${
                      isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                    }`}
                  >
                    Tinte sutil exclusivo para el teclado rápido (el catálogo se mantiene neutro)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {QUIET_LUXURY_QUICK_COLORS.map((c) => {
                  const isSelected = quickColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setQuickColor(c.id)}
                      className={`min-h-[46px] px-3 py-2 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer select-none ${
                        isSelected
                          ? isDark
                            ? 'bg-[#171412] border-[#EFECE6] ring-1 ring-[#EFECE6]'
                            : 'bg-[#FAF8F5] border-[#141210] ring-1 ring-[#141210]'
                          : isDark
                          ? 'bg-[#171412]/60 border-[#2A2420] hover:border-[#3D352F]'
                          : 'bg-[#FAF8F5]/80 border-[#E2DDD5] hover:border-[#CFC8BC]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white shadow-inner ${c.swatchClass}`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate leading-tight">
                          {c.label}
                        </span>
                        <span
                          className={`text-[10px] block truncate ${
                            isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                          }`}
                        >
                          {c.hint}
                        </span>
                      </div>
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