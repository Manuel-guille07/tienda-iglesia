import React, { useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Boxes, Plus, Coffee, Edit, Trash2, CheckCircle, EyeOff, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AddRawMaterialModal } from './AddRawMaterialModal';
import { RecipeEditorModal } from './RecipeEditorModal';
import { Product, RawMaterial } from '../../types';
import toast from 'react-hot-toast';

export const InventoryScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const [confirmDeleteRecipeProd, setConfirmDeleteRecipeProd] = useState<Product | null>(null);
  const [confirmDeleteMaterial, setConfirmDeleteMaterial] = useState<RawMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mat = rawMaterials.find((m) => m.id === selectedId);

  const handleRestock = () => {
    if (isSubmitting) return;
    if (!selectedId) return;
    if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
      toast.error('La cantidad a reponer debe ser un número válido mayor a 0');
      return;
    }
    setIsSubmitting(true);
    try {
      restockRawMaterial(selectedId, amount);
      toast.success(t('toast.stockUpdated'));
      setSelectedId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteMaterial = async () => {
    if (isSubmitting || !confirmDeleteMaterial) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Eliminando de Supabase...');
    try {
      const success = await deleteRawMaterialAction(confirmDeleteMaterial.id);
      toast.dismiss(toastId);
      if (success) {
        toast.success(`"${confirmDeleteMaterial.name}" eliminado correctamente`);
      }
      setConfirmDeleteMaterial(null);
    } catch {
      toast.dismiss(toastId);
      toast.error('Error de red al eliminar el insumo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteRecipe = async () => {
    if (isSubmitting || !confirmDeleteRecipeProd) return;
    setIsSubmitting(true);
    try {
      const prodName = confirmDeleteRecipeProd.name;
      const success = await deleteProductRecipe(confirmDeleteRecipeProd.id);
      if (success) {
        toast.success(`Receta de "${prodName}" eliminada con éxito`);
      } else {
        toast.error('No se pudo eliminar la receta');
      }
      setConfirmDeleteRecipeProd(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'Cafés':
      case 'cafes':
        return 'Cafés';
      case 'bebidas':
        return 'Bebidas';
      case 'snacks':
        return 'Snacks';
      case 'donativos':
        return 'Donativos';
      case 'insumos':
        return 'Insumos / Desechables';
      default:
        return 'Cafetería';
    }
  };

  const recipeProducts = products.filter((p) => p.recipe && p.recipe.length > 0);

  const primaryText = isDark ? 'text-[#F4F0EA]' : 'text-[#141210]';
  const secondaryText = isDark ? 'text-[#9A9086]' : 'text-[#3D352F]';
  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';
  const stoneSurface = isDark
    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]';
  const darkStoneTag = isDark
    ? 'bg-[#2A2420] text-[#F4F0EA] border-[#3D352F]'
    : 'bg-[#E2DDD5] text-[#141210] border-[#D6CFC5]';
  const borderSubtle = isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]';

  const activeTabClass = isDark
    ? 'bg-[#EFECE6] text-[#141210] shadow-sm'
    : 'bg-[#141210] text-[#FAF8F5] shadow-sm';

  const inactiveTabClass = isDark
    ? 'bg-[#211D1A] text-[#F4F0EA] hover:bg-[#2A2420]'
    : 'bg-[#EFECE6] text-[#141210] hover:bg-[#E2DDD5]';

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-5 ${primaryText}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <Boxes className="w-5 h-5" />
            {t('inventory.title')}
          </h2>
          <p className={`text-xs mt-0.5 ${secondaryText}`}>{t('inventory.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className={`flex items-center gap-1 border p-1 rounded-full ${cardSurface}`}>
            <button
              type="button"
              onClick={() => setTab('raw')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                tab === 'raw' ? activeTabClass : inactiveTabClass
              }`}
            >
              Insumos & Catálogo
            </button>
            <button
              type="button"
              onClick={() => setTab('recipes')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                tab === 'recipes' ? activeTabClass : inactiveTabClass
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
              Añadir Producto / Insumo
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
              Crear Receta
            </Button>
          )}
        </div>
      </div>

      {tab === 'raw' ? (
        rawMaterials.length === 0 ? (
          <div className={`border rounded-3xl p-8 text-center ${cardSurface}`}>
            <Boxes className={`w-10 h-10 mx-auto mb-2 ${secondaryText}`} />
            <p className="font-semibold">No hay insumos ni productos registrados en Supabase</p>
            <p className={`text-xs mt-1 ${secondaryText}`}>
              Añade tu primer insumo o producto con el botón superior.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {rawMaterials.map((m) => {
              const isLow = m.currentStock <= m.minStock;
              const isSellable = m.isSellable !== false;

              return (
                <div
                  key={m.id}
                  className={`border rounded-3xl p-4 flex flex-col justify-between transition ${cardSurface} ${
                    m.isOutOfStock ? 'border-rose-600/50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-snug truncate">{m.name}</h3>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider block mt-0.5 ${secondaryText}`}>
                          {getCategoryLabel(m.category)}
                        </span>
                      </div>

                      {m.isOutOfStock ? (
                        <span className="text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-600/30 px-2.5 py-0.5 rounded-full shrink-0">
                          Agotado
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-600/30 px-2.5 py-0.5 rounded-full shrink-0">
                          Bajo
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full shrink-0 ${darkStoneTag}`}>
                          OK
                        </span>
                      )}
                    </div>

                    {/* Stock & Price Tags (Quiet Luxury High-Contrast Stone #E2DDD5 / Transparent) */}
                    <div className="my-3 flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black tabular-nums ${primaryText}`}>
                          {m.currentStock}
                        </span>
                        <span className={`text-xs font-medium ${secondaryText}`}>{m.unit}</span>
                      </div>

                      {isSellable && typeof m.price === 'number' && (
                        <span
                          className={`text-sm font-bold tabular-nums px-2.5 py-1 rounded-xl ${
                            isDark
                              ? 'bg-[#2A2420] text-[#F4F0EA]'
                              : 'bg-[#E2DDD5] text-[#141210]'
                          }`}
                        >
                          {m.price.toFixed(2)} €
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {isSellable ? (
                        <span className={`border px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold ${stoneSurface}`}>
                          <CheckCircle className="w-3 h-3" /> POS Visible
                        </span>
                      ) : (
                        <span className={`border px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium ${stoneSurface} ${secondaryText}`}>
                          <EyeOff className="w-3 h-3" /> Insumo Interno
                        </span>
                      )}
                      {m.isQuickAccess && (
                        <span className={`border px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold ${darkStoneTag}`}>
                          <Zap className="w-3 h-3" /> Botonera
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center justify-between mt-3 pt-2.5 border-t text-xs ${borderSubtle}`}>
                      <span className={`text-[11px] font-medium ${secondaryText}`}>Estado:</span>
                      <button
                        type="button"
                        onClick={() => {
                          toggleRawMaterialAvailability(m.id);
                          toast.success(m.isOutOfStock ? `${m.name}: Disponible` : `${m.name}: Agotado`);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                          m.isOutOfStock
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-600/30'
                            : stoneSurface
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.isOutOfStock
                              ? 'bg-rose-600'
                              : isDark
                              ? 'bg-[#EFECE6]'
                              : 'bg-[#141210]'
                          }`}
                        />
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
                      onClick={() => {
                        setSelectedId(m.id);
                        setAmount(m.unit === 'ml' ? 1000 : 20);
                      }}
                    >
                      {t('inventory.addStock')}
                    </Button>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMaterial(m);
                          setIsAddMaterialOpen(true);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold rounded-full border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'bg-[#211D1A] hover:bg-[#2A2420] border-[#2A2420] text-[#F4F0EA]'
                            : 'bg-[#EFECE6] hover:bg-[#E2DDD5] border-[#E2DDD5] text-[#141210]'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMaterial(m)}
                        className={`p-2 rounded-full border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086] hover:text-rose-400 hover:border-rose-700/50'
                            : 'bg-[#EFECE6] border-[#E2DDD5] text-[#3D352F] hover:text-rose-700 hover:border-rose-400'
                        }`}
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
      ) : recipeProducts.length === 0 ? (
        <div className={`border rounded-3xl p-8 text-center ${cardSurface}`}>
          <Coffee className={`w-10 h-10 mx-auto mb-2 ${secondaryText}`} />
          <p className="font-semibold">No hay recetas configuradas</p>
          <p className={`text-xs mt-1 ${secondaryText}`}>
            Crea tu primera receta de café o bebida con ingredientes múltiples.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {recipeProducts.map((prod) => (
            <div
              key={prod.id}
              className={`border rounded-3xl p-4 space-y-3 flex flex-col justify-between transition ${cardSurface}`}
            >
              <div>
                <div className={`flex justify-between items-center border-b pb-2.5 ${borderSubtle}`}>
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <Coffee className="w-4 h-4" />
                    {prod.name}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-xl ${
                      isDark ? 'bg-[#2A2420] text-[#F4F0EA]' : 'bg-[#E2DDD5] text-[#141210]'
                    }`}
                  >
                    {prod.price.toFixed(2)} €
                  </span>
                </div>
                <div className="space-y-1.5 mt-3">
                  <span className={`text-[11px] font-semibold block uppercase tracking-wider ${secondaryText}`}>
                    Ingredientes ({prod.recipe?.length || 0}):
                  </span>
                  {prod.recipe?.map((item) => {
                    const r = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
                    return (
                      <div
                        key={item.rawMaterialId}
                        className={`flex justify-between text-xs p-2.5 rounded-2xl border ${stoneSurface}`}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          {r?.isOutOfStock && (
                            <span className="text-[10px] text-rose-600 font-bold">[Agotado]</span>
                          )}
                          {r?.name || item.rawMaterialId}
                        </span>
                        <strong className="font-mono font-bold tabular-nums">
                          {item.quantity} {r?.unit || 'uds'}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center gap-2 pt-2.5 border-t ${borderSubtle}`}>
                <Button
                  variant="secondary"
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
                  type="button"
                  onClick={() => setConfirmDeleteRecipeProd(prod)}
                  className="px-3.5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-600/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Eliminar Receta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reponer Stock Modal */}
      <Modal
        isOpen={!!selectedId}
        onClose={() => !isSubmitting && setSelectedId(null)}
        title={`Reponer ${mat?.name || ''}`}
      >
        <div className="space-y-3">
          <input
            type="number"
            step="any"
            min="0"
            value={Number.isFinite(amount) ? amount : ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              setAmount(Number.isFinite(parsed) && !isNaN(parsed) ? Math.max(0, parsed) : 0);
            }}
            className={`w-full border rounded-2xl p-3 text-lg font-bold focus:outline-none tabular-nums ${
              isDark
                ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] focus:border-[#EFECE6]'
                : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] focus:border-[#141210]'
            }`}
          />
          <Button
            variant="primary"
            size="lg"
            disabled={isSubmitting || !Number.isFinite(amount) || amount <= 0}
            isLoading={isSubmitting}
            className="w-full font-bold"
            onClick={handleRestock}
          >
            Confirmar Reposición
          </Button>
        </div>
      </Modal>

      {/* Modal Confirmación Eliminación de Insumo / Producto */}
      {confirmDeleteMaterial && (
        <Modal
          isOpen={Boolean(confirmDeleteMaterial)}
          onClose={() => !isSubmitting && setConfirmDeleteMaterial(null)}
          title="Eliminar Insumo / Producto"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-600/30 p-3.5 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">
                  ¿Estás seguro de eliminar "{confirmDeleteMaterial.name}" de Supabase e inventario?
                </p>
                <p className={`text-xs mt-1 ${secondaryText}`}>
                  Esta acción eliminará permanentemente el registro de la tabla de inventario.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => setConfirmDeleteMaterial(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="flex-1 font-bold"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleConfirmDeleteMaterial}
              >
                Confirmar Eliminación
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Confirmación Eliminación de Receta */}
      {confirmDeleteRecipeProd && (
        <Modal
          isOpen={Boolean(confirmDeleteRecipeProd)}
          onClose={() => !isSubmitting && setConfirmDeleteRecipeProd(null)}
          title="Eliminar Receta"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-600/30 p-3.5 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">
                  ¿Estás seguro de eliminar la receta de "{confirmDeleteRecipeProd.name}"?
                </p>
                <p className={`text-xs mt-1 ${secondaryText}`}>
                  El producto permanecerá en el catálogo general pero dejará de consumir ingredientes de materia prima al venderse.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => setConfirmDeleteRecipeProd(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="flex-1 font-bold"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleConfirmDeleteRecipe}
              >
                Confirmar Eliminación
              </Button>
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
