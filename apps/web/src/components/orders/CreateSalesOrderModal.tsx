import React, { useState, useEffect } from 'react';
import {
  IconPlus,
  IconTrash2,
  IconAlertCircle,
  IconAlertTriangle,
  IconWarehouse,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { useLicense } from '../../context/LicenseContext';
import { SOLineItem } from '../../types/inventory';
import { Modal } from '../common/Modal';
import { ProductSearchDropdown } from '../common/ProductSearchDropdown';
import { WarehouseSelectDropdown } from '../common/WarehouseSelectDropdown';
import { StateSelectDropdown } from '../common/StateSelectDropdown';

export interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (info?: { customerName: string; totalAmount: number }) => void;
  initialWarehouseId?: string;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWarehouseId,
}) => {
  const {
    products,
    locations,
    selectedLocationId,
    formatCurrency,
    createSalesOrder,
    taxConfig,
  } = useInventory();
  const license = useLicense();
  const isMultiGodown = license.hasModule('multi_godown');
  const { user, applyTaxToSalesOrders } = useAuth();
  const effectiveEngine = (user as any)?.taxEngine || (user as any)?.tax_engine || taxConfig.taxType || 'GST';
  const isTaxEnabled = effectiveEngine !== 'NONE' && applyTaxToSalesOrders !== false;

  const getDefaultBillingState = () => {
    if (taxConfig?.taxType === 'VAT') {
      return { code: 'DE', name: 'Germany' };
    }
    if (taxConfig?.taxType === 'SALES_TAX') {
      return { code: 'CA', name: 'California' };
    }
    return { code: '29', name: 'Karnataka' };
  };

  const getDefaultShippingState = () => {
    if (taxConfig?.taxType === 'VAT') {
      return { code: 'FR', name: 'France' };
    }
    if (taxConfig?.taxType === 'SALES_TAX') {
      return { code: 'NY', name: 'New York' };
    }
    return { code: '33', name: 'Tamil Nadu' };
  };

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingState, setBillingState] = useState(() => getDefaultBillingState().name);
  const [billingStateCode, setBillingStateCode] = useState(() => getDefaultBillingState().code);
  const [hasSeparateShipping, setHasSeparateShipping] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingState, setShippingState] = useState(() => getDefaultShippingState().name);
  const [shippingStateCode, setShippingStateCode] = useState(() => getDefaultShippingState().code);
  const [sourceLocationId, setSourceLocationId] = useState(
    initialWarehouseId || (selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || ''))
  );
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [soNotes, setSoNotes] = useState('');

  const [lineItems, setLineItems] = useState<SOLineItem[]>([]);

  // Sync state when modal opens or warehouse / taxConfig changes
  useEffect(() => {
    if (isOpen) {
      const preferredLoc =
        initialWarehouseId || (selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || ''));
      setSourceLocationId(preferredLoc);

      const defBill = getDefaultBillingState();
      const defShip = getDefaultShippingState();
      setBillingState(defBill.name);
      setBillingStateCode(defBill.code);
      setShippingState(defShip.name);
      setShippingStateCode(defShip.code);

      if (lineItems.length === 0 && products.length > 0) {
        const sorted = [...products].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );
        const inStockCandidate = sorted.find((p) => {
          const stock = initialWarehouseId || selectedLocationId !== 'all' ? (p.locationStock?.[initialWarehouseId || selectedLocationId] ?? 0) : (p.currentStock ?? 0);
          return stock > 0;
        });

        if (inStockCandidate) {
          setLineItems([
            {
              productId: inStockCandidate.id,
              sku: inStockCandidate.sku,
              name: inStockCandidate.name,
              orderedQty: 1,
              fulfilledQty: 0,
              unitPrice: inStockCandidate.sellPrice || 0,
              discountPercent: 0,
            },
          ]);
        } else {
          setLineItems([
            {
              productId: '',
              sku: '',
              name: '',
              orderedQty: 1,
              fulfilledQty: 0,
              unitPrice: 0,
              discountPercent: 0,
            },
          ]);
        }
      }
    }
  }, [isOpen, selectedLocationId, initialWarehouseId, locations, products, taxConfig?.taxType]);

  const currentSourceLoc = locations.find((l) => l.id === sourceLocationId);

  const stockShortages = lineItems
    .map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const avail = sourceLocationId
        ? (prod?.locationStock?.[sourceLocationId] ?? 0)
        : (prod?.currentStock ?? 0);
      return {
        sku: it.sku || prod?.sku || 'Item',
        name: it.name || prod?.name || 'Product',
        orderedQty: it.orderedQty || 0,
        availableStock: avail,
        unit: prod?.unitOfMeasure || 'pcs',
        isZero: avail === 0,
        isShortage: (it.orderedQty || 0) > avail,
      };
    })
    .filter((s) => s.isShortage);

  const handleAddLineItem = () => {
    const sorted = [...products].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
    const existingIds = new Set(lineItems.map((it) => it.productId));
    const inStockUnused = sorted.find((p) => {
      const stock = sourceLocationId ? (p.locationStock?.[sourceLocationId] ?? 0) : (p.currentStock ?? 0);
      return stock > 0 && !existingIds.has(p.id);
    });
    const candidate = inStockUnused || sorted.find((p) => {
      const stock = sourceLocationId ? (p.locationStock?.[sourceLocationId] ?? 0) : (p.currentStock ?? 0);
      return stock > 0;
    });

    setLineItems((prev) => [
      ...prev,
      {
        productId: candidate ? candidate.id : '',
        sku: candidate ? candidate.sku : '',
        name: candidate ? candidate.name : '',
        orderedQty: 1,
        fulfilledQty: 0,
        unitPrice: candidate ? (candidate.sellPrice || 0) : 0,
        discountPercent: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, updates: Partial<SOLineItem>) => {
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
      unitPrice: p.sellPrice,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotalGross = () =>
    lineItems.reduce((acc, it) => acc + (it.orderedQty || 0) * (it.unitPrice || 0), 0);

  const calculateTotalDiscount = () =>
    lineItems.reduce((acc, it) => {
      const gross = (it.orderedQty || 0) * (it.unitPrice || 0);
      const discPct = Math.max(0, Math.min(100, it.discountPercent || 0));
      return acc + (gross * discPct) / 100;
    }, 0);

  const calculateGrandTotal = () =>
    Math.max(0, calculateTotalGross() - calculateTotalDiscount());

  const resetForm = () => {
    setCustomerName('');
    setCustomerGstin('');
    setBillingAddress('');
    setShippingAddress('');
    setHasSeparateShipping(false);
    setSoNotes('');
    const defBill = getDefaultBillingState();
    const defShip = getDefaultShippingState();
    setBillingState(defBill.name);
    setBillingStateCode(defBill.code);
    setShippingState(defShip.name);
    setShippingStateCode(defShip.code);
    setSourceLocationId(selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || ''));
    if (products.length > 0) {
      const sorted = [...products].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
      const targetLoc = selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || '');
      const inStockCandidate = sorted.find((p) => {
        const stock = targetLoc ? (p.locationStock?.[targetLoc] ?? 0) : (p.currentStock ?? 0);
        return stock > 0;
      });

      if (inStockCandidate) {
        setLineItems([
          {
            productId: inStockCandidate.id,
            sku: inStockCandidate.sku,
            name: inStockCandidate.name,
            orderedQty: 1,
            fulfilledQty: 0,
            unitPrice: inStockCandidate.sellPrice || 0,
            discountPercent: 0,
          },
        ]);
      } else {
        setLineItems([
          {
            productId: '',
            sku: '',
            name: '',
            orderedQty: 1,
            fulfilledQty: 0,
            unitPrice: 0,
            discountPercent: 0,
          },
        ]);
      }
    } else {
      setLineItems([]);
    }
  };

  const handleSubmitSO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !sourceLocationId || lineItems.length === 0) return;

    if (stockShortages.length > 0) {
      return;
    }

    const sourceLoc = locations.find((l) => l.id === sourceLocationId);
    const isShipSeparate = hasSeparateShipping && Boolean(shippingAddress.trim());
    const effectiveShipState = isShipSeparate ? shippingState : billingState;
    const effectiveShipCode = isShipSeparate ? shippingStateCode : billingStateCode;

    const totalAmount = calculateGrandTotal();

    createSalesOrder({
      customerName,
      customerGstin: customerGstin || undefined,
      billingAddress: billingAddress || undefined,
      shippingAddress: isShipSeparate ? shippingAddress : (billingAddress || undefined),
      billingState: billingState,
      billingStateCode: billingStateCode,
      shippingState: isShipSeparate ? shippingState : undefined,
      shippingStateCode: isShipSeparate ? shippingStateCode : undefined,
      state: effectiveShipState,
      stateCode: effectiveShipCode,
      sourceLocationId,
      sourceLocationName: sourceLoc?.name || 'Warehouse',
      orderDate,
      items: lineItems,
      totalAmount,
      notes: soNotes,
    });

    onSuccess?.({ customerName, totalAmount });
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Customer Sales Order (SO)"
      subtitle="Reserve and allocate catalog items for shipment to an account"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmitSO} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer / Client Name *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Metro Retail Corp"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fulfillment Warehouse *
            </label>
            {isMultiGodown ? (
              <WarehouseSelectDropdown
                locations={locations}
                selectedLocationId={sourceLocationId}
                onSelect={setSourceLocationId}
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

        {/* Customer Tax & Dispatch Details */}
        <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] p-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                  Customer {taxConfig.taxIdLabel} (Optional)
                </label>
              </div>
              <input
                type="text"
                maxLength={18}
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder={
                  taxConfig.taxType === 'VAT'
                    ? 'e.g. DE123456789'
                    : taxConfig.taxType === 'SALES_TAX'
                    ? 'e.g. 95-1234567'
                    : 'e.g. 29ABCDE1234F1Z5'
                }
                className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Billing State *
                </label>
              </div>
              <StateSelectDropdown
                selectedCode={billingStateCode}
                onSelect={(code, name) => {
                  setBillingStateCode(code);
                  setBillingState(name);
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Billing Address *
                </label>
              </div>
              <input
                type="text"
                required
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Street address, City, PIN"
                className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Bill-to / Ship-to Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSeparateShipping}
                onChange={(e) => setHasSeparateShipping(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Separate Shipping / Delivery Address (Bill-to / Ship-to Scenario)
              </span>
            </label>

            {hasSeparateShipping && (
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20">
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 dark:text-teal-300 mb-1">
                    Shipping / Dispatch Destination State *
                  </label>
                  <StateSelectDropdown
                    selectedCode={shippingStateCode}
                    onSelect={(code, name) => {
                      setShippingStateCode(code);
                      setShippingState(name);
                    }}
                  />
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5 block">
                    Determines Place of Supply for {taxConfig.taxLabel} calculation when shipping differs
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 dark:text-teal-300 mb-1">
                    Shipping Destination Address *
                  </label>
                  <input
                    type="text"
                    required={hasSeparateShipping}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Delivery site / Warehouse address"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line items editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Order Line Items
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({lineItems.length} {lineItems.length === 1 ? 'item' : 'items'})
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              <IconPlus className="h-3.5 w-3.5" /> Add SKU
            </button>
          </div>

          {/* Table headers */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex-1 min-w-0">Product Catalog</span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <span className="w-20 shrink-0 text-center">Qty</span>
              <span className="w-24 shrink-0 text-center">Unit Price</span>
              <span className="w-20 shrink-0 text-center">Disc %</span>
              <span className="w-24 shrink-0 text-center">Line Total</span>
              {lineItems.length > 1 && <span className="w-6 shrink-0" />}
            </div>
          </div>

          <div className="space-y-2">
            {lineItems.map((item, index) => {
              const prod = products.find((p) => p.id === item.productId);
              const availableStock = sourceLocationId
                ? (prod?.locationStock?.[sourceLocationId] ?? 0)
                : (prod?.currentStock ?? 0);
              const remainingStock = availableStock - (item.orderedQty || 0);
              const isOutOfStock = Boolean(prod && availableStock === 0);
              const isExceedingStock = Boolean(prod && availableStock > 0 && item.orderedQty > availableStock);
              const isReorderThresholdBreached = Boolean(
                prod &&
                  availableStock > 0 &&
                  item.orderedQty <= availableStock &&
                  prod.reorderPoint > 0 &&
                  remainingStock <= prod.reorderPoint
              );

              const lineGross = (item.orderedQty || 0) * (item.unitPrice || 0);
              const discPct = Math.max(0, Math.min(100, item.discountPercent || 0));
              const lineDisc = (lineGross * discPct) / 100;
              const lineNet = Math.max(0, lineGross - lineDisc);

              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="w-full sm:flex-1 sm:min-w-0">
                      <ProductSearchDropdown
                        products={products}
                        selectedProductId={item.productId}
                        onSelect={(p) => handleProductSelect(index, p.id)}
                        warehouseId={sourceLocationId}
                        formatCurrency={formatCurrency}
                      />
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="w-20 shrink-0">
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

                      <div className="w-24 shrink-0">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-teal-600 text-right"
                        />
                      </div>

                      <div className="w-20 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            placeholder="0"
                            value={
                              item.discountPercent !== undefined &&
                              item.discountPercent !== null &&
                              item.discountPercent > 0
                                ? item.discountPercent
                                : ''
                            }
                            onChange={(e) => {
                              const val =
                                e.target.value === ''
                                  ? 0
                                  : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              handleUpdateItem(index, { discountPercent: val });
                            }}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] pl-2 pr-5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-teal-600 text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>

                      <div className="w-24 shrink-0 text-center">
                        <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                          {formatCurrency(lineNet)}
                        </div>
                        {discPct > 0 && (
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            -{discPct}% (-{formatCurrency(lineDisc)})
                          </div>
                        )}
                      </div>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="w-6 h-6 flex items-center justify-center shrink-0 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove Item"
                        >
                          <IconTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stock & Reorder Threshold Warning Logic */}
                  {isOutOfStock && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
                      <IconAlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        Out of Stock: <strong>0 units available</strong> in{' '}
                        {currentSourceLoc?.name || 'this warehouse'}. Fulfilling this order will be blocked until
                        restocked.
                      </span>
                    </div>
                  )}
                  {isExceedingStock && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
                      <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        Insufficient Stock: Order quantity ({item.orderedQty}) exceeds available warehouse stock (
                        {availableStock} {prod?.unitOfMeasure}).
                      </span>
                    </div>
                  )}
                  {!isOutOfStock && !isExceedingStock && isReorderThresholdBreached && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                      <IconAlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Warning: Sale will reduce warehouse stock to {Math.max(0, remainingStock)}{' '}
                        {prod?.unitOfMeasure} (at or below reorder threshold of {prod?.reorderPoint}{' '}
                        {prod?.unitOfMeasure})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Valuation & Discount Breakdown */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          {calculateTotalDiscount() > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Gross Subtotal</span>
                <span className="font-mono">{formatCurrency(calculateTotalGross())}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Total Trade Discount (Deducted Pre-{taxConfig.taxLabel})</span>
                <span className="font-mono font-medium">-{formatCurrency(calculateTotalDiscount())}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Valuation {calculateTotalDiscount() > 0 ? '(Net Taxable Value)' : ''}
            </span>
            <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
              {formatCurrency(calculateGrandTotal())}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {!isTaxEnabled ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                * Note: Tax calculation is currently disabled. This order will be fulfilled as a plain Sales Receipt, without tax charges.
              </span>
            ) : (
              `* Note: Trade discount is deducted before ${taxConfig.taxLabel} calculation. Applicable taxes are generated upon dispatch.`
            )}
          </p>
        </div>

        {/* Warehouse Stock Shortage Alert Banner */}
        {stockShortages.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1 flex-1">
              <div className="font-bold text-rose-800 dark:text-rose-300">
                Cannot create order &mdash; insufficient stock in {currentSourceLoc?.name || 'selected warehouse'}:
              </div>
              <div className="text-[11px] leading-relaxed">
                {stockShortages.map((s) => (
                  <span key={s.sku} className="inline-block mr-2 font-mono">
                    &bull; <strong>{s.sku}</strong> ({s.name}):{' '}
                    {s.isZero ? '0 in stock' : `only ${s.availableStock} ${s.unit} available`}, {s.orderedQty} requested
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Order creation is blocked until inventory is replenished or item quantities are adjusted.
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={stockShortages.length > 0}
            className="rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
            title={stockShortages.length > 0 ? 'Cannot create order — resolve stock shortages before proceeding' : undefined}
          >
            Create Sales Order
          </button>
        </div>
      </form>
    </Modal>
  );
};
