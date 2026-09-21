import React, { useState, useEffect } from 'react';
import {
  IconBarChart3,
  IconIndianRupee,
  IconTrendingUp,
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconLayers,
  IconHelpCircle,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { PageMeta } from '../components/common/PageMeta';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { products, formatCurrency, currency } = useInventory();
  const [costingMethod, setCostingMethod] = useState<'fifo' | 'weighted_avg'>('fifo');
  const [reportData, setReportData] = useState<{
    fifo_total_valuation: number;
    weighted_avg_total_valuation: number;
    total_units: number;
    total_skus: number;
    category_breakdown: { category: string; valuation: number; units: number }[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getValuationReport().then((data) => {
      if (isMounted && data && typeof data.fifo_total_valuation === 'number') {
        setReportData(data);
      }
    }).catch((err) => {
      console.warn('Could not load backend valuation report:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [products]);

  // Dynamic valuation based on database report or local inventory state
  const totalValuation = products.reduce(
    (sum, p) => sum + p.currentStock * Number(p.costPrice || 0),
    0
  );

  const fifoValuation = reportData ? reportData.fifo_total_valuation : totalValuation;
  const weightedAvgValuation = reportData ? reportData.weighted_avg_total_valuation : totalValuation;

  const currentDisplayedValuation =
    costingMethod === 'fifo' ? fifoValuation : weightedAvgValuation;

  const totalUnits = reportData ? reportData.total_units : products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalSkus = reportData ? reportData.total_skus : products.length;

  // Category Breakdown dynamically sourced from DB report
  const chartData = reportData && reportData.category_breakdown?.length > 0
    ? reportData.category_breakdown.map((item) => ({
        name: item.category,
        valuation: Math.round(item.valuation),
        units: item.units,
      }))
    : Object.entries(
        products.reduce<Record<string, { valuation: number; count: number }>>((acc, p) => {
          if (!acc[p.category]) acc[p.category] = { valuation: 0, count: 0 };
          const itemCost = Number(p.costPrice || 0);
          acc[p.category].valuation += p.currentStock * itemCost;
          acc[p.category].count += p.currentStock;
          return acc;
        }, {})
      ).map(([cat, data]) => ({
        name: cat,
        valuation: Math.round(data.valuation),
        units: data.count,
      }));

  const COLORS = ['#0E7490', '#059669', '#d97706', '#dc2626', '#475569'];

  return (
    <div className="space-y-6">
      <PageMeta
        title="Inventory Valuation & Financial Reports | Invenza Inventory"
        description="Dynamic inventory valuation models comparing FIFO and Weighted Average cost streams with category capital distribution."
        canonicalPath="/reports"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Inventory Valuation & Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare FIFO vs Weighted Average Costing models derived from immutable ledger receipts.
          </p>
        </div>

        {/* Costing Method Selector */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-1 text-xs font-semibold shadow-subtle self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCostingMethod('fifo')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              costingMethod === 'fifo'
                ? 'bg-teal-700 text-white shadow-subtle font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            FIFO Method
          </button>
          <button
            type="button"
            onClick={() => setCostingMethod('weighted_avg')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              costingMethod === 'weighted_avg'
                ? 'bg-teal-700 text-white shadow-subtle font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Weighted Average
          </button>
        </div>
      </div>

      {/* Valuation Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card">
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {costingMethod === 'fifo' ? 'FIFO Total Asset Valuation' : 'Weighted Avg Total Asset Valuation'}
          </span>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {formatCurrency(currentDisplayedValuation)}
          </div>
          <div className="mt-2 text-xs text-teal-700 dark:text-teal-400 font-semibold">
            {costingMethod === 'fifo'
              ? 'Based on First-In chronological lot liquidation'
              : 'Based on periodic blended acquisition costs'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card">
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total In-Stock Physical Units
          </span>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalUnits} pcs
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Across {totalSkus} registered catalog SKUs
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card">
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Method Cost Variance
          </span>
          <div className="mt-3 text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            +{formatCurrency(Math.abs(fifoValuation - weightedAvgValuation))}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            FIFO asset premium due to recent inflation
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Asset Value by Product Category ({currency})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Visual comparison of total capital allocated across inventory divisions
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} opacity={isDark ? 0.3 : 0.8} />
              <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748B'} fontSize={11} tickLine={false} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748B'} fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#131924' : '#FFFFFF',
                  borderColor: isDark ? '#1E2636' : '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  boxShadow: isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                }}
                formatter={(val: any) => [formatCurrency(val), 'Valuation']}
              />
              <Bar dataKey="valuation" fill={isDark ? '#0E7490' : '#0D9488'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
