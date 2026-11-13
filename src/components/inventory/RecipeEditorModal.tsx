import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Product, RecipeItem } from '../../types';
import { Plus, Trash2, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const RecipeEditorModal: React.FC<Props> = ({ isOpen, onClose, product }) => {
  const { products, rawMaterials, updateProductRecipe, deleteProductRecipe } = usePOSStore();
  const [selectedId, setSelectedId] = useState('');
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setIsSubmitting(false);
    setConfirmDelete(false);
    if (product) {
      setSelectedId(product.id);
      setItems(product.recipe ? [...product.recipe] : []);
    } else {
      const first = products[0]?.id || '';
      setSelectedId(first);
      const prod = products.find((p) => p.id === first);
      setItems(prod?.recipe ? [...prod.recipe] : []);
    }
  }, [product, products, isOpen]);

  const handleAddItem = () => {
    if (rawMaterials.length === 0) return toast.error('No hay insumos disponibles');
    const unused = rawMaterials.find((m) => !items.some((it) => it.rawMaterialId === m.id));
    setItems([...items, { rawMaterialId: unused ? unused.id : rawMaterials[0].id, quantity: 1 }]);
  };

  const handleSave = () => {
    if (isSubmitting) return;
    if (!selectedId) return toast.error('Selecciona un producto');
    if (items.length === 0) return toast.error('Agrega al menos un insumo');
    for (const it of items) {
      if (!Number.isFinite(it.quantity) || isNaN(it.quantity) || it.quantity <= 0) {
        return toast.error('La cantidad de cada ingrediente debe ser un número válido mayor a 0');
      }
    }
    setIsSubmitting(true);
    try {
      updateProductRecipe(selectedId, items);
      toast.success('Receta guardada con éxito');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (isSubmitting || !selectedId) return;
    const current = products.find((p) => p.id === selectedId);
    if (!current) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteProductRecipe(selectedId);
      toast.success(`Receta de "${current.name}" eliminada correctamente`);
      onClose();
    } finally {
      setIsSubmitting(false);
      setConfirmDelete(false);
    }
  };

  const currentProd = products.find((p) => p.id === selectedId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={product ? `Editar Receta: ${product.name}` : 'Crear / Editar Receta'}
    >
      <div className="space-y-4">
        {!product && (
          <div>
            <label className="text-xs text-slate-300 block mb-1">Producto</label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setConfirmDelete(false);
                const p = products.find((x) => x.id === e.target.value);
                setItems(p?.recipe ? [...p.recipe] : []);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price.toFixed(2)}€) {p.recipe ? '✓ Con Receta' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentProd && (
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-400" /> {currentProd.name}
            </span>
            <span className="font-bold text-emerald-400">{currentProd.price.toFixed(2)}€</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300">Ingredientes de la Receta:</label>
            <button type="button" onClick={handleAddItem} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium">
              <Plus className="w-3.5 h-3.5" /> Añadir Insumo
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const mat = rawMaterials.find((m) => m.id === item.rawMaterialId);
              return (
                <div key={idx} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2">
                  <select
                    value={item.rawMaterialId}
                    onChange={(e) => {
                      const u = [...items];
                      u[idx].rawMaterialId = e.target.value;
                      setItems(u);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawMaterials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 w-28 shrink-0">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={Number.isFinite(item.quantity) ? item.quantity : ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const u = [...items];
                        u[idx].quantity = Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0;
                        setItems(u);
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center font-bold tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 truncate">{mat?.unit || 'uds'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Quitar de receta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          {currentProd?.recipe && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteRecipe}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmDelete ? '¿Confirmar?' : 'Eliminar Receta'}</span>
            </button>
          )}
          <Button variant="outline" disabled={isSubmitting} className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="flex-1 font-bold"
            onClick={handleSave}
          >
            Guardar Receta
          </Button>
        </div>
      </div>
    </Modal>
  );
};
