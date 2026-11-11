import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Boxes, Plus, Coffee, Edit, Trash2, CheckCircle, EyeOff, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { AddRawMaterialModal } from './AddRawMaterialModal';
import { RecipeEditorModal } from './RecipeEditorModal';
import { Product, RawMaterial } from '../../types';
import toast from 'react-hot-toast';

export const InventoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const {
    rawMaterials,
    products,
    restockRawMaterial,
    toggleRawMaterialAvailability,
    deleteRawMaterialAction,
    deleteProductRecipe,
  } = usePOSStore();

  const [tab, setTab] = useState<'raw' | 'recipes'>('raw');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [editingRecipeProduct, setEditingRecipeProduct] = useState<Product | null>(null);

  // State for recipe deletion modal
  const [confirmDeleteRecipeProd, setConfirmDeleteRecipeProd] = useState<Product | null>(null);

  const mat = rawMaterials.find((m) => m.id === selectedId);

  const handleRestock = () => {
    if (selectedId && amount > 0) {
      restockRawMaterial(selectedId, amount);
      toast.success(t('toast.stockUpdated'));
      setSelectedId(null);
    }
  };

  const handleDeleteMaterial = async (material: RawMaterial) => {
    if (window.confirm(`¿Estás seguro de eliminar "${material.name}" de Supabase e inventario?`)) {
      const toastId = toast.loading('Eliminando de Supabase...');
      const success = await deleteRawMaterialAction(material.id);
      toast.dismiss(toastId);
      if (success) {
        toast.success(`"${material.name}" eliminado correctamente`);
      }
    }
  };

  const handleConfirmDeleteRecipe = async () => {
    if (!confirmDeleteRecipeProd) return;
    const prodName = confirmDeleteRecipeProd.name;
    const success = await deleteProductRecipe(confirmDeleteRecipeProd.id);
    if (success) {
      toast.success(`Receta de "${prodName}" eliminada con éxito`);
    } else {
      toast.error('No se pudo eliminar la receta');
    }
    setConfirmDeleteRecipeProd(null);
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'bebidas': return 'Bebidas';
      case 'snacks': return 'Snacks';
      case 'insumos': return 'Insumos / Desechables';
      default: return 'Cafetería';
    }
  };

  const recipeProducts = products.filter((p) => p.recipe && p.recipe.length > 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header Banner */}
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
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                tab === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Insumos & Catálogo
            </button>
            <button
              onClick={() => setTab('recipes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                tab === 'recipes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recetas ({recipeProducts.length})
            </button>
          </div>

          {tab === 'raw' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingMaterial(null);
                setIsAddMaterialOpen(true);
              }}
            >
              + Añadir Producto / Insumo
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
            <p className="font-semibold text-white">No hay insumos ni productos registrados en Supabase</p>
            <p className="text-xs text-slate-400 mt-1">Añade tu primer insumo o producto con el botón superior.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rawMaterials.map((m) => {
              const isLow = m.currentStock <= m.minStock;
              const isSellable = m.isSellable !== false;

              return (
                <div
                  key={m.id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                    m.isOutOfStock ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <h3 className="font-bold text-sm text-white leading-snug">{m.name}</h3>
                        <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block mt-0.5">
                          {getCategoryLabel(m.category)}
                        </span>
                      </div>
                      {m.isOutOfStock ? (
                        <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full shrink-0">
                          Agotado
                        </span>
                      ) : (
                        <Badge variant={isLow ? 'warning' : 'success'} size="sm">
                          {isLow ? 'Bajo' : 'OK'}
                        </Badge>
                      )}
                    </div>

                    <div className="my-2 flex items-baseline justify-between">
                      <div>
                        <span className="text-3xl font-black text-white">{m.currentStock}</span>
                        <span className="text-xs text-slate-400 ml-1">{m.unit}</span>
                      </div>
                      {isSellable && typeof m.price === 'number' && (
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                          {m.price.toFixed(2)}€
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                      {isSellable ? (
                        <span className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-cyan-400" /> POS Visible
                        </span>
                      ) : (
                        <span className="bg-slate-850 text-slate-400 border border-slate-750 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <EyeOff className="w-3 h-3 text-slate-500" /> Insumo Interno
                        </span>
                      )}
                      {m.isQuickAccess && (
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" /> Botonera
                        </span>
                      )}
                    </div>

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

                  <div className="space-y-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full font-semibold text-xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => { setSelectedId(m.id); setAmount(m.unit === 'ml' ? 1000 : 20); }}
                    >
                      {t('inventory.addStock')}
                    </Button>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setEditingMaterial(m);
                          setIsAddMaterialOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMaterial(m)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar insumo / producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        recipeProducts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Coffee className="w-10 h-10 mx-auto text-amber-500/60 mb-2" />
            <p className="font-semibold text-white">No hay recetas configuradas</p>
            <p className="text-xs text-slate-400 mt-1">Crea tu primera receta de café o bebida con ingredientes múltiples.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recipeProducts.map((prod) => (
              <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-amber-400" />
                      {prod.name}
                    </span>
                    <span className="font-bold text-emerald-400">{prod.price.toFixed(2)}€</span>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Ingredientes ({prod.recipe?.length || 0}):
                    </span>
                    {prod.recipe?.map((item) => {
                      const r = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
                      return (
                        <div key={item.rawMaterialId} className="flex justify-between text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-750">
                          <span className="text-slate-200 flex items-center gap-1 font-medium">
                            {r?.isOutOfStock && <span className="text-[10px] text-rose-400 font-bold">[Agotado]</span>}
                            {r?.name || item.rawMaterialId}
                          </span>
                          <strong className="text-indigo-300 font-mono">{item.quantity} {r?.unit || 'uds'}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    icon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setEditingRecipeProduct(prod);
                      setIsRecipeOpen(true);
                    }}
                  >
                    Editar Receta
                  </Button>
                  <button
                    onClick={() => setConfirmDeleteRecipeProd(prod)}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Eliminar Receta"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Reponer Stock Modal */}
      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={`Reponer ${mat?.name || ''}`}>
        <div className="space-y-3">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
          />
          <Button variant="success" size="lg" className="w-full font-bold" onClick={handleRestock}>
            Confirmar Reposición
          </Button>
        </div>
      </Modal>

      {/* Modal Confirmación Eliminación de Receta */}
      {confirmDeleteRecipeProd && (
        <Modal
          isOpen={Boolean(confirmDeleteRecipeProd)}
          onClose={() => setConfirmDeleteRecipeProd(null)}
          title="Eliminar Receta"
        >
          <div className="space-y-4 text-slate-200">
            <div className="flex items-start gap-3 bg-rose-950/30 border border-rose-800/50 p-3.5 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  ¿Estás seguro de eliminar la receta de "{confirmDeleteRecipeProd.name}"?
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  El producto permanecerá en el catálogo general pero dejará de consumir ingredientes de materia prima al venderse.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeleteRecipeProd(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecipe}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      <AddRawMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => {
          setIsAddMaterialOpen(false);
          setEditingMaterial(null);
        }}
        initialMaterial={editingMaterial}
      />

      <RecipeEditorModal
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        product={editingRecipeProduct}
      />
    </div>
  );
};
