import React, { useState, useEffect } from 'react';
import {
  IconArrowLeftRight,
  IconPlus,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconTrash2,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { Pagination } from '../components/common/Pagination';

export const Transfers: React.FC = () => {
  const {
    transfers,
    locations,
    products,
    createTransfer,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  interface TransferItemInput {
    productId: string;
    quantity: number;
  }

  // Transfer Form State
  const [sourceId, setSourceId] = useState(locations[0]?.id || '');
  const [targetId, setTargetId] = useState(locations[1]?.id || '');
  const [transferItems, setTransferItems] = useState<TransferItemInput[]>([
    { productId: products[0]?.id || '', quantity: 5 },
  ]);
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    if (!sourceId && locations[0]) {
      setSourceId(locations[0].id);
    }
    if ((!targetId || targetId === sourceId) && locations.length > 1) {
      const alternate = locations.find((l) => l.id !== (sourceId || locations[0]?.id));
      if (alternate) setTargetId(alternate.id);
    }
  }, [locations, sourceId, targetId]);

  useEffect(() => {
    if (products.length > 0 && transferItems.length === 1 && !transferItems[0].productId) {
      setTransferItems([{ productId: products[0].id, quantity: 5 }]);
    }
  }, [products]);

  const handleAddLineItem = () => {
    const selectedProductIds = new Set(transferItems.map((it) => it.productId));
    const nextProduct = products.find((p) => !selectedProductIds.has(p.id)) || products[0];
    if (!nextProduct) return;

    setTransferItems((prev) => [
      ...prev,
      {
        productId: nextProduct.id,
        quantity: 1,
      },
    ]);
  };

  const handleUpdateItem = (index: number, updates: Partial<TransferItemInput>) => {
    setTransferItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenModal = () => {
    setErrorMsg(null);
    setTransferItems([
      { productId: products[0]?.id || '', quantity: 5 },
    ]);
    setTransferNotes('');
    setIsModalOpen(true);
  };

  const filteredTransfers = transfers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceLocationName.toLowerCase().includes(q) ||
      t.targetLocationName.toLowerCase().includes(q)
    );
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransfers = filteredTransfers.slice(startIndex, startIndex + pageSize);

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sourceId === targetId) {
      setErrorMsg('Source warehouse and destination warehouse must be different.');
      return;
    }

    if (transferItems.length === 0) {
      setErrorMsg('Please add at least one product to transfer.');
      return;
    }

    // Check for empty product or invalid quantity
    for (let i = 0; i < transferItems.length; i++) {
      const item = transferItems[i];
      if (!item.productId) {
        setErrorMsg(`Item #${i + 1}: Please select a product.`);
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        setErrorMsg(`Item #${i + 1}: Quantity to transfer must be at least 1.`);
        return;
      }
    }

    // Check for duplicate products
    const productIds = transferItems.map((it) => it.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      setErrorMsg('Duplicate products selected. Please combine quantities or select distinct products.');
      return;
    }

    // Check inventory availability in source warehouse
    const sourceLocName = locations.find((l) => l.id === sourceId)?.name || 'source warehouse';
    for (const item of transferItems) {
      const prod = products.find((p) => p.id === item.productId);
      const available = prod?.locationStock[sourceId] || 0;
      if (available < item.quantity) {
        setErrorMsg(
          `Insufficient stock for "${prod?.name || prod?.sku || 'selected item'}". Available in ${sourceLocName}: ${available}, Requested: ${item.quantity}`
        );
        return;
      }
    }

    createTransfer(
      sourceId,
      targetId,
      transferItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      transferNotes
    );

    setIsModalOpen(false);
    setTransferNotes('');
  };

  return (
    <div className="space-y-6">
      <PageMeta
        title="Inter-Warehouse Stock Transfers | Invenza Inventory"
        description="Bilateral inter-warehouse stock transfer protocol with dual-entry ledger validation across source and destination nodes."
        canonicalPath="/transfers"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Inter-Warehouse Stock Transfers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Relocate inventory between hubs. Creates paired cryptographic ledger entries for source
            and destination locations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors self-start sm:self-auto"
        >
          <IconPlus className="h-4 w-4" />
          Initiate Stock Transfer
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-3 shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer #, source, or target..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Total Transfers: <span className="font-bold text-slate-800 dark:text-slate-200">{transfers.length}</span>
        </div>
      </div>

      {/* Transfers List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-4">Transfer #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Source Warehouse</th>
                <th className="py-2.5 px-3">Destination Warehouse</th>
                <th className="py-2.5 px-3">Items Transferred</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconArrowLeftRight className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {searchQuery ? 'No transfers match your search query.' : 'No stock transfers recorded yet.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((tr) => (
                  <tr
                    key={tr.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                      {tr.transferNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {tr.date}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {tr.sourceLocationName}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {tr.targetLocationName}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        {tr.items.map((it, idx) => (
                          <span key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">
                              {it.quantity}x
                            </span>{' '}
                            {it.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {tr.notes || 'Regional inventory balance'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5">
                        <IconCheck className="h-3 w-3" /> Completed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTransfers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="transfers"
        />
      </div>

      {/* Initiate Transfer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initiate Inter-Warehouse Transfer"
        subtitle="Dispatches inventory from origin facility and credits target ledger upon transit confirmation"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitTransfer} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs border border-rose-500/20 font-medium">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Warehouse (Origin) *
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
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
                Destination Warehouse *
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} : {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Items / SKUs Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transfer Items (SKUs) *
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({transferItems.length} {transferItems.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
              >
                <IconPlus className="h-3.5 w-3.5" /> Add another item
              </button>
            </div>

            {/* Column Headers for alignment */}
            <div className="flex items-center gap-2 px-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex-1 min-w-0">Select Product / SKU *</span>
              <span className="w-28 sm:w-32 shrink-0 text-center">Quantity to Transfer *</span>
              {transferItems.length > 1 && <span className="w-8 shrink-0"></span>}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {transferItems.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const availableStock = prod?.locationStock[sourceId] || 0;
                const isOverStock = availableStock > 0 && item.quantity > availableStock;
                const isOutOfStock = availableStock === 0;

                return (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] space-y-1.5"
                  >
                    {/* Horizontal row with Product and Quantity sitting side-by-side */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.productId}
                          onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600 truncate"
                        >
                          {products.length === 0 ? (
                            <option value="" disabled>No products in catalog</option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} : {p.name} (Avail: {p.locationStock[sourceId] || 0} {p.unitOfMeasure})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="w-28 sm:w-32 shrink-0">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              quantity: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                          placeholder="Qty"
                        />
                      </div>

                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 shrink-0 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove item"
                        >
                          <IconTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Stock Feedback / Warning message below the input row */}
                    <div className="flex items-center justify-between text-[11px] px-1">
                      {isOutOfStock ? (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Out of stock in origin warehouse (0 available)</span>
                        </div>
                      ) : isOverStock ? (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Exceeds stock: only {availableStock} {prod?.unitOfMeasure || 'pcs'} in source hub</span>
                        </div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400">
                          Available: <strong className="text-teal-700 dark:text-teal-400 font-mono">{availableStock} {prod?.unitOfMeasure || 'pcs'}</strong>
                          {prod?.unitOfMeasure ? ` · ${Math.max(0, availableStock - item.quantity)} remaining after transfer` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add another item button */}
            <button
              type="button"
              onClick={handleAddLineItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline pt-1"
            >
              <IconPlus className="h-3.5 w-3.5" /> Add another item
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transfer Manifest Notes / Waybill
            </label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="e.g. Courier Waybill #WB-99120, Inter-facility van"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

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
              className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
            >
              Execute Stock Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
