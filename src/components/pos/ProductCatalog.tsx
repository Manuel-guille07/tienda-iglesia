import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Plus, AlertTriangle, Ban } from 'lucide-react';

export const ProductCatalog: React.FC = () => {
  const { t } = useLanguage();
  const {
    products,
    rawMaterials,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addToCart,
  } = usePOSStore();

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: t('pos.categories.all') },
    { id: 'cafeteria', label: t('pos.categories.cafeteria') },
    { id: 'bebidas', label: t('pos.categories.bebidas') },
    { id: 'snacks', label: t('pos.categories.snacks') },
    { id: 'donativos', label: t('pos.categories.donativos') },
  ];

  const filteredProducts = products.filter((p) => {
    if (p.isSellable === false) return false;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pos.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {filteredProducts.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';

          const cardBorderClasses = isOut
            ? 'border-rose-500/60 bg-rose-950/15 hover:border-rose-500 opacity-75'
            : isLow
            ? 'border-amber-500/70 ring-1 ring-amber-500/20 bg-slate-900 hover:border-amber-400'
            : 'border-slate-800 bg-slate-900 hover:border-indigo-500/50';

          return (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className={`border rounded-xl p-3 flex flex-col justify-between transition-all duration-150 active:scale-98 cursor-pointer group shadow relative overflow-hidden ${cardBorderClasses}`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h3 className="font-semibold text-xs sm:text-sm text-white group-hover:text-indigo-300 transition line-clamp-1">
                    {product.name}
                  </h3>
                  {isOut ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-semibold shrink-0 tabular-nums">
                      <Ban className="w-2.5 h-2.5 text-rose-400" />
                      {t('pos.stock.out')}
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-semibold shrink-0 tabular-nums">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                      {t('pos.stock.low')} ({stockInfo.availableUnits})
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                      {stockInfo.availableUnits} ud.
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800/80">
                <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                  {product.price.toFixed(2)}€
                </span>

                <button
                  type="button"
                  className={`p-1.5 rounded-lg text-white transition shadow ${
                    isOut
                      ? 'bg-rose-900/50 text-rose-300 cursor-not-allowed'
                      : isLow
                      ? 'bg-amber-600 group-hover:bg-amber-500'
                      : 'bg-indigo-600 group-hover:bg-indigo-500'
                  }`}
                >
                  {isOut ? <Ban className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500">
          <p className="text-sm">No se encontraron productos con esos filtros.</p>
        </div>
      )}
    </div>
  );
};
