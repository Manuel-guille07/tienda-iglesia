import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RawMaterial, Category } from '../../types';
import toast from 'react-hot-toast';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: RawMaterial | null;
}

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onClose,
  initialMaterial,
}) => {
  const { addRawMaterial, updateRawMaterial } = usePOSStore();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<RawMaterial['unit']>('unidades');
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(10);
  const [costPerUnit, setCostPerUnit] = useState<number>(0.10);
  const [price, setPrice] = useState<number>(1.50);
  const [category, setCategory] = useState<Category>('cafeteria');
  const [isSellable, setIsSellable] = useState<boolean>(true);
  const [isQuickAccess, setIsQuickAccess] = useState<boolean>(false);

  useEffect(() => {
    if (initialMaterial) {
      setName(initialMaterial.name);
      setUnit(initialMaterial.unit || 'unidades');
      setCurrentStock(initialMaterial.currentStock);
      setMinStock(initialMaterial.minStock);
      setCostPerUnit(initialMaterial.costPerUnit || 0);
      setPrice(initialMaterial.price ?? (initialMaterial.costPerUnit > 0 ? Number((initialMaterial.costPerUnit * 2).toFixed(2)) : 1.50));
      setCategory(initialMaterial.category || 'cafeteria');
      setIsSellable(initialMaterial.isSellable !== false);
      setIsQuickAccess(Boolean(initialMaterial.isQuickAccess));
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
    }
  }, [initialMaterial, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Por favor introduce el nombre del insumo o producto');
      return;
    }

    if (initialMaterial) {
      updateRawMaterial(initialMaterial.id, {
        name: name.trim(),
        unit,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 0,
        costPerUnit: Number(costPerUnit) || 0,
        price: isSellable ? (Number(price) || 0) : undefined,
        category,
        isSellable,
        isQuickAccess,
      });
      toast.success(`Producto "${name.trim()}" actualizado correctamente`);
    } else {
      addRawMaterial({
        name: name.trim(),
        unit,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 0,
        costPerUnit: Number(costPerUnit) || 0,
        price: isSellable ? (Number(price) || 0) : undefined,
        category,
        isSellable,
        isQuickAccess,
        isOutOfStock: false,
      });
      toast.success(`Insumo "${name.trim()}" añadido correctamente`);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMaterial ? `Editar: ${initialMaterial.name}` : 'Añadir Nuevo Insumo / Producto Directo'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-slate-200">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Insumo / Producto *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Coca-Cola 330ml, Café Molido, Vasos Desechables..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => {
                const cat = e.target.value as Category;
                setCategory(cat);
                if (cat === 'insumos') {
                  setIsSellable(false);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="cafeteria">Cafetería</option>
              <option value="bebidas">Bebidas</option>
              <option value="snacks">Snacks</option>
              <option value="insumos">Insumos / Desechables</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Unidad de Medida</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as RawMaterial['unit'])}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
            <label className="text-xs font-semibold text-slate-300 block mb-1">Coste Unitario (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Precio de Venta (€) {isSellable ? '*' : '(Opcional)'}
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              disabled={!isSellable}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Inicial</label>
            <input
              type="number"
              step="1"
              min="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Alerta Stock Mínimo</label>
            <input
              type="number"
              step="1"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Mostrar en pantalla de ventas POS</span>
              <span className="text-[10px] text-slate-400 block">
                Si está activo, este ítem estará visible para ser cobrado en el terminal
              </span>
            </div>
            <input
              type="checkbox"
              checked={isSellable}
              onChange={(e) => {
                setIsSellable(e.target.checked);
                if (!e.target.checked) setIsQuickAccess(false);
              }}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Añadir a Botonera Rápida</span>
              <span className="text-[10px] text-slate-400 block">
                Muestra un botón destacado de 1-clic en el panel superior del POS
              </span>
            </div>
            <input
              type="checkbox"
              disabled={!isSellable}
              checked={isQuickAccess}
              onChange={(e) => setIsQuickAccess(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1 font-bold">
            {initialMaterial ? 'Guardar Cambios' : 'Guardar Insumo / Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};