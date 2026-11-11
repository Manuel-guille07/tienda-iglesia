import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RawMaterial } from '../../types';
import toast from 'react-hot-toast';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({ isOpen, onClose }) => {
  const { addRawMaterial } = usePOSStore();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<RawMaterial['unit']>('unidades');
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(10);
  const [costPerUnit, setCostPerUnit] = useState<number>(0.10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Por favor introduce el nombre del insumo');
      return;
    }

    addRawMaterial({
      name: name.trim(),
      unit,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 0,
      costPerUnit: Number(costPerUnit) || 0,
      isOutOfStock: false,
    });

    toast.success(`Insumo "${name.trim()}" añadido correctamente`);
    setName('');
    setCurrentStock(50);
    setMinStock(10);
    setCostPerUnit(0.10);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Nuevo Insumo / Materia Prima">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs text-slate-300 block mb-1">Nombre del Insumo *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Sirope de Vainilla, Té Verde, Leche de Soja..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Unidad de Medida</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as RawMaterial['unit'])}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="unidades">Unidades (uds)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="gramos">Gramos (g)</option>
              <option value="sobres">Sobres / Bolsitas</option>
              <option value="paquetes">Paquetes</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Coste Unitario (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Stock Inicial</label>
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
            <label className="text-xs text-slate-300 block mb-1">Alerta Stock Mínimo</label>
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

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1 font-bold">
            Guardar Insumo
          </Button>
        </div>
      </form>
    </Modal>
  );
};