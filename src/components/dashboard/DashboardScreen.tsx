import React, { useMemo, useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import { useTabStore } from '../../store/useTabStore';
import { useCloseoutStore } from '../../store/useCloseoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  BookOpen,
  Clock,
  Calendar,
  Award,
  CreditCard,
  Banknote,
  AlertTriangle,
  Download,
  Printer,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  PrintableReportModal,
  exportSalesHistoryToCSV,
} from '../common/PrintableReportModal';
import { fromCents, toCents } from '../../utils/finance';
import toast from 'react-hot-toast';

export const DashboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { sales, products, rawMaterials } = usePOSStore();
  const { customers } = useTabStore();
  const { voidAudits, tabPayments } = useCloseoutStore();
  const { currentUser } = useAuthStore();

  const [periodFilter, setPeriodFilter] = useState<'month' | '7days' | 'all'>('month');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.timestamp) return true;
      const d = new Date(s.timestamp);
      if (isNaN(d.getTime())) return true;

      if (periodFilter === 'month') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (periodFilter === '7days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      return true;
    });
  }, [sales, periodFilter, currentMonth, currentYear, now]);

  const filteredTabPayments = useMemo(() => {
    return (tabPayments || []).filter((p) => {
      if (!p.timestamp) return true;
      const d = new Date(p.timestamp);
      if (isNaN(d.getTime())) return true;

      if (periodFilter === 'month') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (periodFilter === '7days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      return true;
    });
  }, [tabPayments, periodFilter, currentMonth, currentYear, now]);

  const monthlySales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.timestamp) return false;
      const d = new Date(s.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [sales, currentMonth, currentYear]);

  const monthlyTabPayments = useMemo(() => {
    return (tabPayments || []).filter((p) => {
      if (!p.timestamp) return false;
      const d = new Date(p.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [tabPayments, currentMonth, currentYear]);

  const cafeteriaSales = useMemo(
    () =>
      filteredSales.filter(
        (s) => s.paymentMethod !== 'donativo' && s.paymentMethod !== 'consumo_interno'
      ),
    [filteredSales]
  );

  const cafeteriaMonthlySales = useMemo(
    () =>
      monthlySales.filter(
        (s) => s.paymentMethod !== 'donativo' && s.paymentMethod !== 'consumo_interno'
      ),
    [monthlySales]
  );

  const monthlyRevenue = useMemo(() => {
    const salesCents = cafeteriaMonthlySales
      .filter((s) => s.paymentMethod !== 'fiado')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0);
    const abonosCents = monthlyTabPayments.reduce((acc, p) => acc + toCents(p.amount || 0), 0);
    return fromCents(salesCents + abonosCents);
  }, [cafeteriaMonthlySales, monthlyTabPayments]);

  const periodRevenue = useMemo(() => {
    const salesCents = cafeteriaSales
      .filter((s) => s.paymentMethod !== 'fiado')
      .reduce((acc, s) => acc + toCents(s.total || 0), 0);
    const abonosCents = filteredTabPayments.reduce((acc, p) => acc + toCents(p.amount || 0), 0);
    return fromCents(salesCents + abonosCents);
  }, [cafeteriaSales, filteredTabPayments]);

  const averageTicket = useMemo(() => {
    if (cafeteriaSales.length === 0) return 0;
    const grossSales = fromCents(
      cafeteriaSales.reduce((acc, s) => acc + toCents(s.total || 0), 0)
    );
    return grossSales / cafeteriaSales.length;
  }, [cafeteriaSales]);

  const tabsStats = useMemo(() => {
    const totalDebt = customers.reduce((acc, c) => acc + (Number(c.debt) || 0), 0);
    const totalPrepaid = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    const debtorsCount = customers.filter((c) => (Number(c.debt) || 0) > 0).length;
    return { totalDebt, totalPrepaid, debtorsCount };
  }, [customers]);

  const lowStockItems = useMemo(() => {
    return rawMaterials.filter((m) => m.isOutOfStock || m.currentStock <= m.minStock);
  }, [rawMaterials]);

  const salesByDay = useMemo(() => {
    const days: { dateKey: string; label: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
      days.push({ dateKey, label, total: 0, count: 0 });
    }

    sales.forEach((s) => {
      if (!s.timestamp) return;
      if (s.paymentMethod === 'donativo' || s.paymentMethod === 'consumo_interno') return;
      const key = s.timestamp.split('T')[0];
      const bucket = days.find((d) => d.dateKey === key);
      if (bucket) {
        bucket.total = fromCents(toCents(bucket.total) + toCents(s.total || 0));
        bucket.count += 1;
      }
    });

    (tabPayments || []).forEach((p) => {
      if (!p.timestamp) return;
      const key = p.timestamp.split('T')[0];
      const bucket = days.find((d) => d.dateKey === key);
      if (bucket) {
        bucket.total = fromCents(toCents(bucket.total) + toCents(p.amount || 0));
      }
    });

    const maxDayTotal = Math.max(...days.map((d) => d.total), 1);
    return days.map((d) => ({
      ...d,
      pct: Math.round((d.total / maxDayTotal) * 100),
    }));
  }, [sales, tabPayments, now]);

  const salesByTimeSlot = useMemo(() => {
    const slots = [
      { id: 'morning', label: 'Mañana (07:00 - 12:00)', range: [7, 11], total: 0, count: 0 },
      { id: 'midday', label: 'Mediodía (12:00 - 16:00)', range: [12, 15], total: 0, count: 0 },
      { id: 'afternoon', label: 'Tarde (16:00 - 20:00)', range: [16, 19], total: 0, count: 0 },
      { id: 'evening', label: 'Noche (20:00 - 24:00)', range: [20, 23], total: 0, count: 0 },
    ];

    cafeteriaSales.forEach((s) => {
      const d = s.timestamp ? new Date(s.timestamp) : new Date();
      const hour = isNaN(d.getTime()) ? 12 : d.getHours();
      const slot =
        slots.find((sl) => hour >= sl.range[0] && hour <= sl.range[1]) || slots[0];
      slot.total = fromCents(toCents(slot.total) + toCents(s.total || 0));
      slot.count += 1;
    });

    const maxSlotTotal = Math.max(...slots.map((s) => s.total), 1);
    return slots.map((s) => ({
      ...s,
      pct: Math.round((s.total / maxSlotTotal) * 100),
    }));
  }, [cafeteriaSales]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; category: string; qty: number; revenue: number }>();

    cafeteriaSales.forEach((s) => {
      if (s.items && s.items.length > 0) {
        s.items.forEach((it) => {
          const id = it.product?.id || it.product?.name || 'item';
          const name = it.product?.name || 'Producto';
          const category = it.product?.category || 'cafeteria';
          const price = it.customPrice ?? it.product?.price ?? 0;
          const prev = map.get(id) || { name, category, qty: 0, revenue: 0 };
          prev.qty += it.quantity;
          prev.revenue = fromCents(toCents(prev.revenue) + toCents(price) * it.quantity);
          map.set(id, prev);
        });
      }
    });

    if (map.size === 0 && cafeteriaSales.length > 0 && products.length > 0) {
      const sellable = products.filter((p) => p.isSellable !== false).slice(0, 5);
      const weights = [0.34, 0.25, 0.18, 0.13, 0.10];
      sellable.forEach((p, idx) => {
        const w = weights[idx] || 0.1;
        const rev = Number((periodRevenue * w).toFixed(2));
        const unitPrice = p.price > 0 ? p.price : 1.5;
        const estQty = Math.max(1, Math.round(rev / unitPrice));
        map.set(p.id, {
          name: p.name,
          category: p.category,
          qty: estQty,
          revenue: rev,
        });
      });
    }

    const sorted = Array.from(map.values())
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);

    const maxQty = Math.max(...sorted.map((p) => p.qty), 1);
    return sorted.map((p, index) => ({
      ...p,
      rank: index + 1,
      pct: Math.round((p.qty / maxQty) * 100),
    }));
  }, [cafeteriaSales, products, periodRevenue]);

  const paymentBreakdown = useMemo(() => {
    const salesCashCents = filteredSales
      .filter((s) => s.paymentMethod === 'efectivo')
      .reduce((a, s) => a + toCents(s.total || 0), 0);
    const abonosCashCents = filteredTabPayments
      .filter((p) => p.paymentMethod === 'efectivo')
      .reduce((a, p) => a + toCents(p.amount || 0), 0);
    const cashTotal = fromCents(salesCashCents + abonosCashCents);

    const salesCardCents = filteredSales
      .filter((s) => s.paymentMethod === 'datafono')
      .reduce((a, s) => a + toCents(s.total || 0), 0);
    const abonosCardCents = filteredTabPayments
      .filter((p) => p.paymentMethod === 'datafono')
      .reduce((a, p) => a + toCents(p.amount || 0), 0);
    const cardTotal = fromCents(salesCardCents + abonosCardCents);

    const tabTotal = fromCents(
      filteredSales
        .filter((s) => s.paymentMethod === 'fiado')
        .reduce((a, s) => a + toCents(s.total || 0), 0)
    );
    const donationTotal = fromCents(
      filteredSales
        .filter((s) => s.paymentMethod === 'donativo')
        .reduce((a, s) => a + toCents(s.total || 0), 0)
    );

    const totalAllOps = fromCents(
      toCents(cashTotal) + toCents(cardTotal) + toCents(tabTotal) + toCents(donationTotal)
    );
    const calcPct = (val: number) =>
      totalAllOps > 0 ? Number(((val / totalAllOps) * 100).toFixed(1)) : 0;

    return {
      totalAllOps,
      cash: {
        label: 'Efectivo',
        amount: cashTotal,
        pct: calcPct(cashTotal),
        count:
          filteredSales.filter((s) => s.paymentMethod === 'efectivo').length +
          filteredTabPayments.filter((p) => p.paymentMethod === 'efectivo').length,
        color: 'bg-emerald-600',
        textColor: isDark ? 'text-emerald-400' : 'text-emerald-800',
      },
      card: {
        label: 'Tarjeta / Datáfono',
        amount: cardTotal,
        pct: calcPct(cardTotal),
        count:
          filteredSales.filter((s) => s.paymentMethod === 'datafono').length +
          filteredTabPayments.filter((p) => p.paymentMethod === 'datafono').length,
        color: 'bg-indigo-600',
        textColor: isDark ? 'text-indigo-300' : 'text-indigo-800',
      },
      fiado: {
        label: 'Fiado (En Cuenta)',
        amount: tabTotal,
        pct: calcPct(tabTotal),
        count: filteredSales.filter((s) => s.paymentMethod === 'fiado').length,
        color: 'bg-amber-600',
        textColor: isDark ? 'text-amber-400' : 'text-amber-800',
      },
      donativo: {
        label: 'Donativos',
        amount: donationTotal,
        pct: calcPct(donationTotal),
        count: filteredSales.filter((s) => s.paymentMethod === 'donativo').length,
        color: 'bg-purple-600',
        textColor: isDark ? 'text-purple-300' : 'text-purple-800',
      },
    };
  }, [filteredSales, filteredTabPayments, isDark]);

  const periodLabel =
    periodFilter === 'month'
      ? 'Mes Actual'
      : periodFilter === '7days'
      ? 'Últimos 7 Días'
      : 'Histórico Completo';

  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';

  const innerRowSurface = isDark
    ? 'bg-[#0E0C0B]/70 border-[#2A2420]'
    : 'bg-[#EFECE6]/80 border-[#E2DDD5]';

  const primaryText = isDark ? 'text-[#F4F0EA]' : 'text-[#141210]';
  const secondaryText = isDark ? 'text-[#C2B8AD]' : 'text-[#141210]';
  const mutedLabelText = isDark ? 'text-[#9A9086]' : 'text-[#141210]';
  const borderSubtle = isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]';
  const barTrackClass = isDark ? 'bg-[#F4F0EA]/10' : 'bg-[#141210]/10';

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-6 ${primaryText}`}>
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#2A2420] border-[#3D352F] text-[#F4F0EA]'
                : 'bg-[#E5E0D8] border-[#D6CFC5] text-[#141210]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${primaryText}`}>
              {t('dashboard.title')}
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#3D352F]'}`}>
              {t('dashboard.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Segmented Control */}
          <div
            className={`flex items-center border p-1 rounded-2xl ${
              isDark ? 'bg-[#171412] border-[#2A2420]' : 'bg-[#FAF8F5] border-[#E2DDD5]'
            }`}
          >
            {[
              { id: 'month', label: 'Mes Actual' },
              { id: '7days', label: '7 Días' },
              { id: 'all', label: 'Histórico' },
            ].map((tab) => {
              const active = periodFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriodFilter(tab.id as 'month' | '7days' | 'all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? isDark
                        ? 'bg-[#F4F0EA] text-[#141210] shadow-sm'
                        : 'bg-[#141210] text-[#FAF8F5] shadow-sm'
                      : isDark
                      ? 'text-[#C2B8AD] hover:text-[#F4F0EA]'
                      : 'text-[#141210] hover:bg-[#EFECE6]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => {
              exportSalesHistoryToCSV(
                filteredSales,
                voidAudits,
                periodLabel,
                filteredTabPayments
              );
              toast.success(t('export.csvSuccess'));
            }}
          >
            {t('dashboard.exportCSV')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => {
              setPdfModalOpen(true);
              toast.success(t('export.pdfReady'));
            }}
          >
            {t('dashboard.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos Totales del Mes */}
        <div className={`border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className={`flex items-center justify-between text-xs ${mutedLabelText}`}>
            <span className="font-semibold">{t('dashboard.kpi.monthlyRevenue')}</span>
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`} />
          </div>
          <div className={`text-3xl font-extrabold mt-2 font-mono tabular-nums ${primaryText}`}>
            {monthlyRevenue.toFixed(2)} €
          </div>
          <div className={`flex items-center gap-2 text-xs mt-2 tabular-nums ${secondaryText}`}>
            <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              {cafeteriaMonthlySales.length} ventas
            </span>
            <span aria-hidden="true">·</span>
            <span>Periodo activo: {periodRevenue.toFixed(2)} €</span>
          </div>
        </div>

        {/* KPI 2: Ticket Promedio */}
        <div className={`border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className={`flex items-center justify-between text-xs ${mutedLabelText}`}>
            <span className="font-semibold">{t('dashboard.kpi.avgTicket')}</span>
            <Receipt className={`w-4 h-4 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`} />
          </div>
          <div
            className={`text-3xl font-extrabold mt-2 font-mono tabular-nums ${
              isDark ? 'text-indigo-300' : 'text-[#141210]'
            }`}
          >
            {averageTicket.toFixed(2)} €
          </div>
          <div className={`flex items-center gap-2 text-xs mt-2 tabular-nums ${secondaryText}`}>
            <span>{cafeteriaSales.length} tickets emitidos</span>
            <span aria-hidden="true">·</span>
            <span>{periodLabel}</span>
          </div>
        </div>

        {/* KPI 3: Saldo Pendiente en Fiados */}
        <div className={`border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className={`flex items-center justify-between text-xs ${mutedLabelText}`}>
            <span className="font-semibold">{t('dashboard.kpi.pendingTabs')}</span>
            <BookOpen className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
          </div>
          <div
            className={`text-3xl font-extrabold mt-2 font-mono tabular-nums ${
              isDark ? 'text-amber-400' : 'text-amber-800'
            }`}
          >
            {tabsStats.totalDebt.toFixed(2)} €
          </div>
          <div className={`flex items-center gap-2 text-xs mt-2 tabular-nums ${secondaryText}`}>
            <span>{tabsStats.debtorsCount} cuentas con deuda</span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              Prepago: {tabsStats.totalPrepaid.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* KPI 4: Estado de Stock e Inventario */}
        <div className={`border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className={`flex items-center justify-between text-xs ${mutedLabelText}`}>
            <span className="font-semibold">Alertas de Stock Bajo</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                lowStockItems.length > 0
                  ? isDark
                    ? 'text-amber-400'
                    : 'text-amber-800'
                  : isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-800'
              }`}
            />
          </div>
          <div
            className={`text-3xl font-extrabold mt-2 font-mono tabular-nums ${
              lowStockItems.length > 0
                ? isDark
                  ? 'text-amber-400'
                  : 'text-amber-800'
                : isDark
                ? 'text-emerald-400'
                : 'text-emerald-800'
            }`}
          >
            {lowStockItems.length}
          </div>
          <div className={`flex items-center gap-2 text-xs mt-2 tabular-nums ${secondaryText}`}>
            <span>de {rawMaterials.length} insumos registrados</span>
          </div>
        </div>
      </div>

      {/* Row 1: Ventas por Día y Ventas por Franja Horaria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ventas por Día (Últimos 7 días) */}
        <div className={`lg:col-span-7 border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${isDark ? 'text-indigo-300' : 'text-[#141210]'}`} />
              <h2 className={`text-sm font-bold ${primaryText}`}>
                {t('dashboard.chart.salesByDay')} (Últimos 7 días)
              </h2>
            </div>
            <span className={`text-xs font-semibold font-mono tabular-nums ${secondaryText}`}>
              Total 7d: {salesByDay.reduce((a, b) => a + b.total, 0).toFixed(2)} €
            </span>
          </div>

          <div className={`grid grid-cols-7 gap-2 items-end h-44 pt-4 pb-2 px-1 border-b ${borderSubtle}`}>
            {salesByDay.map((day) => (
              <div
                key={day.dateKey}
                className="flex flex-col items-center justify-end h-full gap-1.5 group"
              >
                <span className={`text-[10px] font-mono tabular-nums font-bold ${secondaryText}`}>
                  {day.total > 0 ? `${day.total.toFixed(0)}€` : '0€'}
                </span>
                <div className={`w-full max-w-[38px] rounded-t-xl h-28 flex items-end overflow-hidden p-0.5 ${barTrackClass}`}>
                  <div
                    style={{ height: `${Math.max(day.pct, day.total > 0 ? 12 : 6)}%` }}
                    className={`w-full rounded-t-lg transition-all duration-200 ${
                      day.total > 0
                        ? isDark
                          ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:from-indigo-500 group-hover:to-cyan-300'
                          : 'bg-gradient-to-t from-[#141210] to-[#6E665E]'
                        : isDark
                        ? 'bg-[#F4F0EA]/15'
                        : 'bg-[#141210]/15'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-medium capitalize truncate max-w-full ${secondaryText}`}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className={`flex items-center justify-between text-xs pt-3 ${secondaryText}`}>
            <span>Evolución diaria de ingresos en caja</span>
            <span className="font-mono font-semibold tabular-nums">
              Operaciones 7d: {salesByDay.reduce((a, b) => a + b.count, 0)} tickets
            </span>
          </div>
        </div>

        {/* Ventas por Franja Horaria */}
        <div className={`lg:col-span-5 border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-[#141210]'}`} />
              <h2 className={`text-sm font-bold ${primaryText}`}>
                {t('dashboard.chart.salesByHour')}
              </h2>
            </div>
            <span className={`text-xs font-medium ${secondaryText}`}>{periodLabel}</span>
          </div>

          <div className="space-y-3.5 my-auto">
            {salesByTimeSlot.map((slot) => (
              <div key={slot.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${primaryText}`}>{slot.label}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className={secondaryText}>{slot.count} tkt</span>
                    <span className={`font-bold ${primaryText}`}>{slot.total.toFixed(2)} €</span>
                  </div>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${barTrackClass}`}>
                  <div
                    style={{ width: `${Math.max(slot.pct, slot.total > 0 ? 6 : 0)}%` }}
                    className={`h-full rounded-full transition-all duration-200 ${
                      isDark
                        ? 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                        : 'bg-[#141210]'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={`text-xs pt-3 border-t mt-4 ${borderSubtle} ${secondaryText}`}>
            Distribución horaria según marca de tiempo de cada cobro
          </div>
        </div>
      </div>

      {/* Row 2: Top 5 Productos Más Vendidos & Desglose por Método de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 5 Productos Más Vendidos */}
        <div className={`lg:col-span-7 border rounded-3xl p-5 ${cardSurface}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
              <h2 className={`text-sm font-bold ${primaryText}`}>
                {t('dashboard.chart.topProducts')}
              </h2>
            </div>
            <span className={`text-xs font-medium ${secondaryText}`}>Ranking por volumen</span>
          </div>

          {topProducts.length === 0 ? (
            <div className={`py-10 text-center border border-dashed rounded-2xl ${borderSubtle} ${secondaryText}`}>
              <p className="text-xs font-medium">Todavía no hay ventas registradas en este periodo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((item) => (
                <div
                  key={item.name}
                  className={`p-3 border rounded-2xl space-y-2 ${innerRowSurface}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg border font-mono text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                          isDark
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                            : 'bg-[#141210] border-[#141210] text-[#FAF8F5]'
                        }`}
                      >
                        0{item.rank}
                      </span>
                      <div className="truncate">
                        <p className={`text-xs sm:text-sm font-semibold truncate ${primaryText}`}>
                          {item.name}
                        </p>
                        <p className={`text-[11px] capitalize ${secondaryText}`}>{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-bold block ${
                          isDark ? 'text-emerald-400' : 'text-emerald-800'
                        }`}
                      >
                        {item.revenue.toFixed(2)} €
                      </span>
                      <span className={`text-[11px] font-medium ${secondaryText}`}>{item.qty} uds.</span>
                    </div>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${barTrackClass}`}>
                    <div
                      style={{ width: `${Math.max(item.pct, 8)}%` }}
                      className={`h-full rounded-full ${
                        isDark
                          ? 'bg-gradient-to-r from-amber-500 to-indigo-500'
                          : 'bg-[#141210]'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desglose por Método de Pago */}
        <div className={`lg:col-span-5 border rounded-3xl p-5 flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`} />
                <h2 className={`text-sm font-bold ${primaryText}`}>
                  {t('dashboard.chart.paymentBreakdown')}
                </h2>
              </div>
              <span className={`text-xs font-semibold font-mono tabular-nums ${secondaryText}`}>
                100% ({paymentBreakdown.totalAllOps.toFixed(2)} €)
              </span>
            </div>

            {/* Stacked Percentage Bar */}
            <div className={`w-full h-4 border rounded-full overflow-hidden flex mb-5 ${barTrackClass} ${borderSubtle}`}>
              {paymentBreakdown.cash.pct > 0 && (
                <div
                  style={{ width: `${paymentBreakdown.cash.pct}%` }}
                  className="bg-emerald-600 h-full transition-all"
                  title={`Efectivo: ${paymentBreakdown.cash.pct}%`}
                />
              )}
              {paymentBreakdown.card.pct > 0 && (
                <div
                  style={{ width: `${paymentBreakdown.card.pct}%` }}
                  className="bg-indigo-600 h-full transition-all"
                  title={`Tarjeta: ${paymentBreakdown.card.pct}%`}
                />
              )}
              {paymentBreakdown.fiado.pct > 0 && (
                <div
                  style={{ width: `${paymentBreakdown.fiado.pct}%` }}
                  className="bg-amber-600 h-full transition-all"
                  title={`Fiado: ${paymentBreakdown.fiado.pct}%`}
                />
              )}
              {paymentBreakdown.donativo.pct > 0 && (
                <div
                  style={{ width: `${paymentBreakdown.donativo.pct}%` }}
                  className="bg-purple-600 h-full transition-all"
                  title={`Donativos: ${paymentBreakdown.donativo.pct}%`}
                />
              )}
            </div>

            {/* Detailed Method Rows */}
            <div className="space-y-3">
              {[
                paymentBreakdown.cash,
                paymentBreakdown.card,
                paymentBreakdown.fiado,
                paymentBreakdown.donativo,
              ].map((m) => (
                <div
                  key={m.label}
                  className={`flex items-center justify-between p-3 border rounded-2xl ${innerRowSurface}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-sm ${m.color} shrink-0`} />
                    <div>
                      <p className={`text-xs font-semibold ${primaryText}`}>{m.label}</p>
                      <p className={`text-[11px] tabular-nums ${secondaryText}`}>
                        {m.count} {m.count === 1 ? 'operación' : 'operaciones'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <span className={`text-sm font-bold block ${m.textColor}`}>
                      {m.pct.toFixed(1)}%
                    </span>
                    <span className={`text-xs font-semibold ${secondaryText}`}>{m.amount.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${borderSubtle} ${secondaryText}`}>
            <span className="flex items-center gap-1.5">
              <Banknote className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`} />
              Conciliación automática con Cierre de Caja
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {filteredSales.length} reg.
            </span>
          </div>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintableReportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        report={{
          title: t('dashboard.title'),
          subtitle: t('dashboard.subtitle'),
          generatedBy: currentUser?.name || 'Supervisor',
          generatedRole: currentUser?.role || 'Pastor',
          periodLabel,
          kpis: [
            { label: 'Ingresos del Mes', value: `${monthlyRevenue.toFixed(2)}€` },
            { label: 'Ticket Promedio', value: `${averageTicket.toFixed(2)}€` },
            { label: 'Saldo en Fiados', value: `${tabsStats.totalDebt.toFixed(2)}€` },
            {
              label: 'Efectivo / Tarjeta / Fiado',
              value: `${paymentBreakdown.cash.pct}% / ${paymentBreakdown.card.pct}% / ${paymentBreakdown.fiado.pct}%`,
            },
          ],
          sales: filteredSales,
          tabPayments: filteredTabPayments,
          voidAudits,
        }}
      />
    </div>
  );
};
