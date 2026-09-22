import React, { useState, useEffect } from 'react';
import {
  IconFileDown,
  IconPlus,
  IconSearch,
  IconCheck,
  IconClock,
  IconWarehouse,
  IconPackage,
  IconTrash2,
  IconAlertTriangle,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useLicense } from '../context/LicenseContext';
import { PurchaseOrder, POLineItem } from '../types/inventory';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { WarehouseSelectDropdown } from '../components/common/WarehouseSelectDropdown';
import { ProductSearchDropdown } from '../components/common/ProductSearchDropdown';
import { Pagination } from '../components/common/Pagination';

export const PurchaseOrders: React.FC = () => {
  const {
    purchaseOrders,
    products,
    locations,
    selectedLocationId,
    formatCurrency,
    createPurchaseOrder,
    receiveGoods,
  } = useInventory();
  const license = useLicense();
  const isMultiGodown = license.hasModule('multi_godown');

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [grnNotes, setGrnNotes] = useState('');

  // Selected warehouse metadata
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // Create PO Form state
  const [supplierName, setSupplierName] = useState('');
  const [targetLocationId, setTargetLocationId] = useState(
    selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || '')
  );
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNotes, setPoNotes] = useState('');

  useEffect(() => {
    if (selectedLocationId !== 'all') {
      setTargetLocationId(selectedLocationId);
    } else if (!targetLocationId && locations.length > 0) {
      setTargetLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const [lineItems, setLineItems] = useState<POLineItem[]>([
    {
      productId: products[0]?.id || '',
      sku: products[0]?.sku || '',
      name: products[0]?.name || '',
      orderedQty: 20,
      receivedQty: 0,
      unitCost: products[0]?.costPrice || 50,
    },
  ]);

  const handleAddLineItem = () => {
    const p = products[0];
    if (!p) return;
    setLineItems((prev) => [
      ...prev,
      {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        orderedQty: 10,
        receivedQty: 0,
        unitCost: p.costPrice,
      },
    ]);
  };

  const handleUpdateItem = (index: number, updates: Partial<POLineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    if (!p) return;
    handleUpdateItem(index, {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      unitCost: p.costPrice,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () =>
    lineItems.reduce((acc, it) => acc + it.orderedQty * it.unitCost, 0);

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !targetLocationId || lineItems.length === 0) return;

    const targetLoc = locations.find((l) => l.id === targetLocationId);

    createPurchaseOrder({
      supplierName,
      targetLocationId,
      targetLocationName: targetLoc?.name || 'Warehouse',
      orderDate,
      items: lineItems,
      totalAmount: calculateGrandTotal(),
      notes: poNotes,
    });

    setIsCreateModalOpen(false);
    setSupplierName('');
    setPoNotes('');
    setTargetLocationId(selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || ''));
  };

  const handleConfirmGRN = () => {
    if (!receivingPO) return;
    receiveGoods(receivingPO.id, grnNotes);
    setReceivingPO(null);
    setGrnNotes('');
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    if (selectedLocationId !== 'all' && po.targetLocationId !== selectedLocationId) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q) ||
      po.targetLocationName.toLowerCase().includes(q)
    );
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLocationId]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPOs = filteredPOs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      <PageMeta
        title="Purchase Orders & GRN Receipts | Invenza Inventory"
        description="Procurement orders, supplier delivery reconciliation, and automated goods received note (GRN) posting to the double-entry movement ledger."
        canonicalPath="/purchase-orders"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Purchase Orders & Goods Inward (GRN)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue orders to suppliers and record verified deliveries. Confirming receipts automatically
            credits warehouse inventory and posts IN movement entries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors self-start sm:self-auto"
        >
          <IconPlus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Active Warehouse Filter Banner */}
      {isMultiGodown && selectedLocationId !== 'all' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/90 dark:border-teal-500/25 dark:bg-teal-500/10 px-4 py-3 text-xs text-teal-900 dark:text-teal-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 shrink-0">
              <IconWarehouse className="h-4 w-4" />
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Target Warehouse Filter: </span>
              <strong className="text-slate-900 dark:text-white font-bold">{selectedLocation?.name || 'Warehouse'}</strong>
              {selectedLocation?.code && (
                <span className="ml-2 rounded bg-teal-100/80 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/20 px-1.5 py-0.5 text-[11px] font-mono font-semibold">
                  {selectedLocation.code}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400/90 font-mono font-semibold">
            {filteredPOs.length} of {purchaseOrders.length} POs shown
          </span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-3 shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO #, supplier, warehouse..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Total POs: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredPOs.length}</span>
          {selectedLocationId !== 'all' && (
            <span className="text-teal-600 dark:text-teal-400 ml-1.5">
              (in {selectedLocation?.name})
            </span>
          )}
        </div>
      </div>

      {/* Purchase Orders List Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-4">PO Number</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Target Warehouse</th>
                <th className="py-2.5 px-3">Order Date</th>
                <th className="py-2.5 px-3">Line Items</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <IconFileDown className="mx-auto h-8 w-8 text-slate-500 mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No purchase orders found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedLocationId !== 'all'
                        ? `No purchase orders recorded for ${selectedLocation?.name || 'this warehouse'}.`
                        : 'No purchase orders match your search query.'}
                    </p>
                  </td>
                </tr>
              )}
              {paginatedPOs.map((po) => (
                <tr
                  key={po.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                    {po.poNumber}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {po.supplierName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {po.targetLocationName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {po.orderDate}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-0.5">
                      {po.items.map((it, idx) => (
                        <span key={idx} className="text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{it.orderedQty}x</span> {it.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(po.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {po.status === 'received' ? (
                      <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5">
                        <IconCheck className="h-3 w-3" /> Received (GRN)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2 py-0.5">
                        <IconClock className="h-3 w-3" /> Pending Delivery
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {po.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => setReceivingPO(po)}
                        className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1 text-xs font-bold text-white shadow-subtle transition-colors"
                      >
                        Receive Goods (GRN)
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Ledger IN on {po.receivedDate || 'Record'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPOs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="purchase orders"
        />
      </div>

      {/* Receive Goods (GRN) Modal */}
      <Modal
        isOpen={Boolean(receivingPO)}
        onClose={() => setReceivingPO(null)}
        title={`Process Goods Receipt Note (GRN): ${receivingPO?.poNumber}`}
        subtitle={`Receiving goods into ${receivingPO?.targetLocationName} automatically writes IN movements to ledger`}
        maxWidth="lg"
      >
        {receivingPO && (
          <div className="space-y-4">
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 p-3 text-xs text-teal-800 dark:text-teal-300">
              Confirming receipt will instantly increment stock counts and write immutable ledger
              transactions with unit cost stamps.
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Items Being Received
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-[#F4F5F8] dark:bg-[#0C1017]">
                {receivingPO.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{it.name}</div>
                      <div className="font-mono text-[10px] text-teal-700 dark:text-teal-400">
                        {it.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {it.orderedQty} units
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        @{formatCurrency(it.unitCost)} / unit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receiving / Inspection Notes
              </label>
              <input
                type="text"
                value={grnNotes}
                onChange={(e) => setGrnNotes(e.target.value)}
                placeholder="e.g. Delivered by Freight Truck #410; all boxes verified undamaged"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGRN}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
              >
                Confirm Receipt & Post to Ledger
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order (PO)"
        subtitle="Issues a formal replenishment order to a qualified supplier"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitPO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Vendor *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Apex Industrial Supplies"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receiving Warehouse *
              </label>
              {isMultiGodown ? (
                <WarehouseSelectDropdown
                  locations={locations}
                  selectedLocationId={targetLocationId}
                  onSelect={setTargetLocationId}
                />
              ) : (
                <div className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <IconWarehouse className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{locations[0] ? `${locations[0].code} : ${locations[0].name}` : 'Main Godown'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Line items editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Line Items
              </span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
              >
                <IconPlus className="h-3.5 w-3.5" /> Add SKU
              </button>
            </div>

            {/* Table headers */}
            <div className="hidden sm:flex items-center gap-2 px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex-1 min-w-0">Product Catalog</span>
              <span className="w-24 shrink-0 text-center">Qty</span>
              <span className="w-28 shrink-0 text-center">Unit Cost</span>
              <span className="w-24 shrink-0 text-right">Line Total</span>
              {lineItems.length > 1 && <span className="w-6 shrink-0"></span>}
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const currentWarehouseStock = targetLocationId
                  ? (prod?.locationStock?.[targetLocationId] ?? 0)
                  : (prod?.currentStock ?? 0);
                const postReceiptStock = currentWarehouseStock + (item.orderedQty || 0);
                const isOverCapacity = Boolean(
                  prod && prod.maxStock && prod.maxStock > 0 && postReceiptStock > prod.maxStock
                );

                return (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] space-y-1.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="w-full sm:flex-1 sm:min-w-0">
                        <ProductSearchDropdown
                          products={products}
                          selectedProductId={item.productId}
                          onSelect={(p) => handleProductSelect(index, p.id)}
                          warehouseId={targetLocationId}
                          formatCurrency={formatCurrency}
                          priceType="cost"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="w-20 sm:w-24 shrink-0">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.orderedQty}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                orderedQty: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-teal-600 text-center"
                          />
                        </div>

                        <div className="w-24 sm:w-28 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Unit Cost"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                unitCost: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-teal-600 text-right"
                          />
                        </div>

                        <div className="w-24 shrink-0 text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                          {formatCurrency((item.orderedQty || 0) * (item.unitCost || 0))}
                        </div>

                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 shrink-0 rounded text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove Item"
                          >
                            <IconTrash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Warehouse stock info / over-capacity notice */}
                    {isOverCapacity && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                        <IconAlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          Notice: Receiving {item.orderedQty} units will push warehouse stock to {postReceiptStock} {prod?.unitOfMeasure} (exceeds max capacity threshold of {prod?.maxStock} {prod?.unitOfMeasure}).
                        </span>
                      </div>
                    )}
                    {currentWarehouseStock === 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 text-[11px] font-medium">
                        <IconPackage className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                        <span>
                          Restock Notice: Current warehouse stock is 0 {prod?.unitOfMeasure}. This PO will replenish {item.orderedQty} {prod?.unitOfMeasure}.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Grand Total</span>
            <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
              {formatCurrency(calculateGrandTotal())}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
            >
              Submit Order to Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
