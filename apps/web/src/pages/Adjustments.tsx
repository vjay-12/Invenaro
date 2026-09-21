import React, { useState, useEffect } from 'react';
import {
  IconSlidersHorizontal,
  IconPlus,
  IconSearch,
  IconAlertTriangle,
  IconShieldAlert,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { AdjustmentReasonCode } from '../types/inventory';
import { ReasonBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { Pagination } from '../components/common/Pagination';

export const Adjustments: React.FC = () => {
  const {
    adjustments,
    products,
    locations,
    createAdjustment,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [newCountedStock, setNewCountedStock] = useState<number>(10);
  const [reasonCode, setReasonCode] = useState<AdjustmentReasonCode>('audit');
  const [auditNotes, setAuditNotes] = useState('');

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
    if (!productId && products[0]) setProductId(products[0].id);
  }, [locations, products, locationId, productId]);

  const selectedProduct = products.find((p) => p.id === productId);
  const currentLocStock = selectedProduct?.locationStock[locationId] || 0;
  const delta = newCountedStock - currentLocStock;

  const handleProductChange = (prodId: string) => {
    setProductId(prodId);
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setNewCountedStock(p.locationStock[locationId] || 0);
    }
  };

  const handleLocationChange = (locId: string) => {
    setLocationId(locId);
    if (selectedProduct) {
      setNewCountedStock(selectedProduct.locationStock[locId] || 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId || delta === 0) return;

    createAdjustment(
      productId,
      locationId,
      newCountedStock,
      reasonCode,
      auditNotes
    );

    setIsModalOpen(false);
    setAuditNotes('');
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    const q = searchQuery.toLowerCase().trim();
    const prod = products.find((p) => p.id === adj.productId);
    const matchesSearch =
      !q ||
      adj.adjustmentNumber.toLowerCase().includes(q) ||
      adj.reasonCode.toLowerCase().includes(q) ||
      (prod && (prod.name.toLowerCase().includes(q) || prod.sku.toLowerCase().includes(q))) ||
      (adj.author && adj.author.toLowerCase().includes(q));

    const matchesReason = reasonFilter === 'all' || adj.reasonCode === reasonFilter;

    return matchesSearch && matchesReason;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, reasonFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAdjustments = filteredAdjustments.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      <PageMeta
        title="Stock Adjustments & Physical Audits | Invenza Inventory"
        description="Physical inventory reconciliations, cycle count reconciliations, and scrap adjustments bound to immutable ledger audit records."
        canonicalPath="/adjustments"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Adjustments & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record physical inventory variances, scrap, damage, and cycle counts. Every adjustment is
            bound to an immutable audit record and justification note.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const cur = products[0]?.locationStock[locations[0]?.id || ''] || 0;
            setNewCountedStock(cur);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors self-start sm:self-auto"
        >
          <IconPlus className="h-4 w-4" />
          Record Stock Adjustment
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-3 shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search adjustment #, SKU, reason, author..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        {/* Reason Code Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'damage', 'loss', 'miscount', 'return', 'audit'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReasonFilter(r)}
              className={`rounded-md px-3 py-1 text-xs font-mono font-semibold uppercase whitespace-nowrap transition-colors ${
                reasonFilter === r
                  ? 'bg-teal-700 text-white shadow-subtle font-bold'
                  : 'border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {r === 'all' ? 'All Reasons' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-4">Adjustment #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3">Warehouse</th>
                <th className="py-2.5 px-3 text-right">Previous</th>
                <th className="py-2.5 px-3 text-right">Counted</th>
                <th className="py-2.5 px-3 text-right">Variance Delta</th>
                <th className="py-2.5 px-3">Reason Code</th>
                <th className="py-2.5 px-3">Auditor Notes</th>
                <th className="py-2.5 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconSlidersHorizontal className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {searchQuery || reasonFilter !== 'all' ? 'No adjustments match your filter criteria.' : 'No stock adjustments recorded yet.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAdjustments.map((adj) => {
                  const prod = products.find((p) => p.id === adj.productId);
                  const loc = locations.find((l) => l.id === adj.locationId);
                  const uom = prod?.unitOfMeasure || 'pcs';

                  return (
                    <tr
                      key={adj.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                        {adj.adjustmentNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(adj.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {prod?.name || 'Product'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {prod?.sku || 'SKU'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {loc?.name || 'Warehouse'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {adj.previousStock} {uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {adj.newStock} {uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            adj.delta > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {adj.delta > 0 ? `+${adj.delta}` : adj.delta} {uom}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <ReasonBadge reason={adj.reasonCode} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate text-[11px]">
                        {adj.notes || 'Routine physical cycle reconciliation'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {adj.author}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredAdjustments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="adjustments"
        />
      </div>

      {/* Record Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Physical Inventory Adjustment"
        subtitle="Registers physical count variance into the immutable movement ledger"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Facility / Warehouse
              </label>
              <select
                value={locationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} : {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select SKU / Product
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {products.length === 0 ? (
                  <option value="" disabled>No products in catalog</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} : {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Variance Preview Panel */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div>
                <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  System Recorded Balance
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">
                  {currentLocStock} {selectedProduct?.unitOfMeasure || 'pcs'}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Physical Count Input
                </div>
                <input
                  type="number"
                  min="0"
                  value={newCountedStock}
                  onChange={(e) => setNewCountedStock(parseInt(e.target.value, 10) || 0)}
                  className="w-28 text-center mx-auto text-lg sm:text-xl font-bold font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131924] py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600 mt-0.5"
                />
              </div>

              <div>
                <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Variance Delta
                </div>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    delta === 0
                      ? 'text-slate-400'
                      : delta > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} {selectedProduct?.unitOfMeasure || 'pcs'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason Code
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as AdjustmentReasonCode)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="audit">AUDIT (Routine Cycle Count)</option>
                <option value="damage">DAMAGE (In-warehouse Damaged Goods)</option>
                <option value="loss">LOSS (Unaccounted Physical Discrepancy)</option>
                <option value="miscount">MISCOUNT (Correcting Earlier Typo)</option>
                <option value="return">RETURN (Customer Return to Active Stock)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Auditor / Justification Notes *
              </label>
              <input
                type="text"
                required
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {delta === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs border border-amber-500/20">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <span>Counted quantity matches current system balance. No variance to post.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={delta === 0}
              className={`rounded-lg px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors ${
                delta === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              Commit Adjustment Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
