import React from 'react';
import { usePOSStore, getProductStockInfo } from '../../store/usePOSStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Plus, AlertTriangle, Ban, X } from 'lucide-react';

export const ProductCatalog: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    products,
    rawMaterials,
    cart,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addToCart,
  } = usePOSStore();

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'Cafés', label: 'Cafés' },
    { id: 'cafeteria', label: 'Cafetería' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'snacks', label: 'Snacks' },
    { id: 'donativos', label: 'Donativos' },
  ];

  // Mapa rápido de cantidades en el carrito para insignia "x2"
  const cartQtyMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cart]);

  const normalizeCat = (c?: string) =>
    (c || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const filteredProducts = products.filter((p) => {
    if (p.isSellable === false) return false;
    const matchesCategory =
      selectedCategory === 'all' ||
      normalizeCat(p.category) === normalizeCat(selectedCategory);
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Buscador Limpio de Alto Contraste */}
      <div className="relative">
        <Search
          className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${
            isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
          }`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('pos.searchPlaceholder')}
          className={`w-full min-h-[52px] pl-12 pr-12 py-3 rounded-full text-base font-medium border transition focus:outline-none ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA] placeholder-[#9A9086] focus:border-[#EFECE6]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]'
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Limpiar búsqueda"
            className={`w-9 h-9 rounded-full absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer ${
              isDark
                ? 'text-[#9A9086] hover:text-[#F4F0EA] hover:bg-[#211D1A]'
                : 'text-[#6E665E] hover:text-[#141210] hover:bg-[#EFECE6]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categorías en Píldoras (Horizontal Scroll, min-h-[48px], text-base font-medium) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[48px] px-6 rounded-full text-base font-medium whitespace-nowrap transition-all cursor-pointer select-none border ${
                isActive
                  ? isDark
                    ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] font-semibold shadow-sm'
                    : 'bg-[#141210] text-[#FAF8F5] border-[#141210] font-semibold shadow-sm'
                  : isDark
                  ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]/80 hover:text-[#F4F0EA] hover:border-[#3D352F] shadow-sm'
                  : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]/75 hover:text-[#141210] hover:border-[#CFC8BC]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cuadrícula Bento Tipográfica (2 cols en celular, 3 en tablet, 3-4 en PC) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredProducts.map((product) => {
          const stockInfo = getProductStockInfo(product, rawMaterials);
          const isOut = stockInfo.status === 'out';
          const isLow = stockInfo.status === 'low';
          const qtyInCart = cartQtyMap.get(product.id) || 0;

          // Superficie y bordes Quiet Luxury según estado (Modo oscuro con border-[#2A2420], bg-[#171412] y shadow-md)
          const surfaceClasses = isOut
            ? isDark
              ? 'bg-[#171412]/70 border border-rose-900/60 shadow-md shadow-black/40 opacity-55 cursor-not-allowed'
              : 'bg-[#FAF8F5]/60 border border-rose-300 opacity-60 cursor-not-allowed'
            : qtyInCart > 0
            ? isDark
              ? 'bg-[#171412] border border-[#EFECE6] ring-1 ring-[#EFECE6]/50 shadow-md shadow-black/50 cursor-pointer'
              : 'bg-[#FAF8F5] border border-[#141210] ring-1 ring-[#141210]/30 shadow-sm cursor-pointer'
            : isLow
            ? isDark
              ? 'bg-[#171412] border border-amber-500/50 hover:border-amber-400 shadow-md shadow-black/40 cursor-pointer'
              : 'bg-[#FAF8F5] border border-amber-500/70 hover:border-amber-600 shadow-sm cursor-pointer'
            : isDark
            ? 'bg-[#171412] border border-[#2A2420] hover:border-[#4A4038] hover:bg-[#1D1916] shadow-md shadow-black/45 cursor-pointer'
            : 'bg-[#FAF8F5] border border-[#E2DDD5] hover:border-[#CFC8BC] shadow-sm cursor-pointer';

          return (
            <div
              key={product.id}
              role="button"
              tabIndex={isOut ? -1 : 0}
              onClick={() => {
                if (!isOut) addToCart(product);
              }}
              onKeyDown={(e) => {
                if (!isOut && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  addToCart(product);
                }
              }}
              className={`rounded-3xl border p-4 sm:p-5 min-h-[148px] sm:min-h-[164px] flex flex-col justify-between transition-all duration-150 active:scale-[0.98] select-none relative ${surfaceClasses}`}
            >
              {/* Parte Superior: Nombre del producto + Insignia de cantidad en carrito ("x2") */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`text-lg font-medium leading-snug line-clamp-2 ${
                      isDark ? 'text-[#F4F0EA]' : 'text-[#141210]'
                    }`}
                  >
                    {product.name}
                  </h3>

                  {qtyInCart > 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums shrink-0 ${
                        isDark
                          ? 'bg-[#EFECE6] text-[#141210]'
                          : 'bg-[#141210] text-[#FAF8F5]'
                      }`}
                    >
                      x{qtyInCart}
                    </span>
                  )}
                </div>

                {/* Alertas discretas de Stock Bajo o Agotado */}
                {isOut ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}
                  >
                    <Ban className="w-3 h-3 shrink-0" />
                    {t('pos.stock.out')}
                  </span>
                ) : isLow ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border tabular-nums ${
                      isDark
                        ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {t('pos.stock.low')} · {stockInfo.availableUnits}
                  </span>
                ) : null}
              </div>

              {/* Parte Inferior: Precio en grande a la izquierda + Botón circular "+" (w-11 h-11) a la derecha */}
              <div className="flex items-end justify-between gap-2 pt-4 mt-auto">
                <span
                  className={`text-xl font-semibold tabular-nums tracking-tight ${
                    isDark ? 'text-[#F4F0EA]' : 'text-[#141210]'
                  }`}
                >
                  {product.price.toFixed(2)} €
                </span>

                <span
                  aria-hidden="true"
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    isOut
                      ? isDark
                        ? 'bg-[#211D1A] text-[#9A9086]'
                        : 'bg-[#EFECE6] text-[#6E665E]'
                      : isDark
                      ? 'bg-[#EFECE6] text-[#141210] shadow-sm'
                      : 'bg-[#141210] text-[#FAF8F5] shadow-sm'
                  }`}
                >
                  {isOut ? <Ban className="w-4 h-4" /> : <Plus className="w-5 h-5 stroke-[2.2]" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div
          className={`p-10 text-center rounded-3xl border ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] text-[#9A9086]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          <p className="text-base font-medium">No se encontraron productos con esos filtros.</p>
        </div>
      )}
    </div>
  );
};
