import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Boxes, Plus, Coffee, Edit } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { AddRawMaterialModal } from './AddRawMaterialModal';
import { RecipeEditorModal } from './RecipeEditorModal';
import { Product } from '../../types';
import toast from 'react-hot-toast';

export const InventoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const { rawMaterials, products, restockRawMaterial, toggleRawMaterialAvailability } = usePOSStore();
  const [tab, setTab] = useState<'raw' | 'recipes'>('raw');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [editingRecipeProduct, setEditingRecipeProduct] = useState<Product | null>(null);

  const mat = rawMaterials.find((m) => m.id === selectedId);

  const handleRestock = () => {
    if (selectedId && amount > 0) {
      restockRawMaterial(selectedId, amount);
      toast.success(t('toast.stockUpdated'));
      setSelectedId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            {t('inventory.title')}
          </h2>
          <p className="text-xs text-slate-400">{t('inventory.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setTab('raw')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${tab === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Insumos
            </button>
            <button
              onClick={() => setTab('recipes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${tab === 'recipes' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Recetas
            </button>
          </div>

          {tab === 'raw' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddMaterialOpen(true)}
            >
              + Añadir Insumo
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingRecipeProduct(null);
                setIsRecipeOpen(true);
              }}
            >
              + Crear Receta
            </Button>
          )}
        </div>
      </div>

      {tab === 'raw' ? (
        rawMaterials.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-white">No hay insumos registrados en Supabase</p>
            <p className="text-xs text-slate-400 mt-1">Añade tu primer insumo con el botón superior o sincroniza con la nube.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rawMaterials.map((m) => {
            const isLow = m.currentStock <= m.minStock;
            return (
              <div
                key={m.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                  m.isOutOfStock ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-white">{m.name}</h3>
                    {m.isOutOfStock ? (
                      <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">
                        Agotado
                      </span>
                    ) : (
                      <Badge variant={isLow ? 'warning' : 'success'} size="sm">
                        {isLow ? 'Bajo' : 'OK'}
                      </Badge>
                    )}
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-black text-white">{m.currentStock}</span>
                    <span className="text-xs text-slate-400 ml-1">{m.unit}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Mínimo: {m.minStock} {m.unit}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-400">Estado:</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleRawMaterialAvailability(m.id);
                        toast.success(m.isOutOfStock ? `${m.name}: Disponible` : `${m.name}: Agotado`);
                      }}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                        m.isOutOfStock
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isOutOfStock ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                      {m.isOutOfStock ? 'Agotado' : 'Disponible'}
                    </button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-3 font-semibold text-xs"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => { setSelectedId(m.id); setAmount(m.unit === 'ml' ? 1000 : 20); }}
                >
                  {t('inventory.addStock')}
                </Button>
              </div>
            );
          })}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.filter((p) => p.recipe).map((prod) => (
            <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    {prod.name}
                  </span>
                  <span className="font-bold text-emerald-400">{prod.price.toFixed(2)}€</span>
                </div>
                <div className="space-y-1 mt-2">
                  {prod.recipe?.map((item) => {
                    const r = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
                    return (
                      <div key={item.rawMaterialId} className="flex justify-between text-xs bg-slate-800/60 p-1.5 rounded">
                        <span className="text-slate-300 flex items-center gap-1">
                          {r?.isOutOfStock && <span className="text-[10px] text-rose-400 font-bold">[Agotado]</span>}
                          {r?.name || item.rawMaterialId}
                        </span>
                        <strong className="text-indigo-300">{item.quantity} {r?.unit}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                icon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => {
                  setEditingRecipeProduct(prod);
                  setIsRecipeOpen(true);
                }}
              >
                Editar Receta
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={`Reponer ${mat?.name || ''}`}>
        <div className="space-y-3">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-lg font-bold text-white"
          />
          <Button variant="success" size="lg" className="w-full font-bold" onClick={handleRestock}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <AddRawMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
      />

      <RecipeEditorModal
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        product={editingRecipeProduct}
      />
    </div>
  );
};
