import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash2,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconSearch,
  IconChevronDown,
  IconUser,
  IconBuilding,
  IconLayers,
  IconWarehouse,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { SOLineItem, Customer, Product } from '../types/inventory';
import { ProductSearchDropdown } from '../components/common/ProductSearchDropdown';
import { WarehouseSelectDropdown } from '../components/common/WarehouseSelectDropdown';
import { StateSelectDropdown } from '../components/common/StateSelectDropdown';
import { PageMeta } from '../components/common/PageMeta';
import { Modal } from '../components/common/Modal';
import { useLicense } from '../context/LicenseContext';
import { api } from '../services/api';
import { TabType } from '../components/layout/Sidebar';
import { EU_VAT_RATES, US_STATE_SALES_TAX_RATES } from '../utils/taxUtils';

interface CreateSalesOrderPageProps {
  onNavigate?: (tab: TabType, params?: Record<string, string>, replace?: boolean) => void;
}

export const CreateSalesOrderPage: React.FC<CreateSalesOrderPageProps> = ({ onNavigate }) => {
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
  const { user, applyTaxToSalesOrders, updateUserLocal } = useAuth();
  const [tenantTaxSetting, setTenantTaxSetting] = useState<boolean | null>(() => applyTaxToSalesOrders !== false);

  useEffect(() => {
    setTenantTaxSetting(applyTaxToSalesOrders !== false);
  }, [applyTaxToSalesOrders]);

  // Load tenant invoicing settings authoritative real-time state on mount
  useEffect(() => {
    let isMounted = true;
    const fetchTenantTaxPolicy = async () => {
      try {
        const data = await api.getTenantInvoicingSettings();
        if (isMounted && data) {
          const isTaxApplicable = data.apply_tax_to_sales_orders !== undefined ? Boolean(data.apply_tax_to_sales_orders) : true;
          setTenantTaxSetting(isTaxApplicable);
          updateUserLocal({
            applyTaxToSalesOrders: isTaxApplicable,
            taxEngine: data.tax_engine || user?.taxEngine,
          });
        }
      } catch (err) {
        console.warn('Could not fetch tenant invoicing settings on CreateSalesOrderPage:', err);
      }
    };
    fetchTenantTaxPolicy();
    return () => { isMounted = false; };
  }, []);

  const effectiveApplyTax = tenantTaxSetting !== null ? tenantTaxSetting : (applyTaxToSalesOrders !== false);
  const effectiveEngine = (user as any)?.taxEngine || (user as any)?.tax_engine || taxConfig.taxType || 'GST';
  const isTaxEnabled = effectiveEngine !== 'NONE' && effectiveApplyTax !== false;

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

  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // New Customer Modal Form State
  const [newCustLegalName, setNewCustLegalName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustTaxId, setNewCustTaxId] = useState('');
  const [newCustBillingAddress, setNewCustBillingAddress] = useState('');
  const [newCustBillingState, setNewCustBillingState] = useState(() => getDefaultBillingState().name);
  const [newCustBillingStateCode, setNewCustBillingStateCode] = useState(() => getDefaultBillingState().code);

  // Main Form state
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
    selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || '')
  );
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [soNotes, setSoNotes] = useState('');

  const [lineItems, setLineItems] = useState<SOLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customers on mount and when customers are updated
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await api.getCustomers();
        if (Array.isArray(data)) {
          setCustomers(
            data
              .filter((c: any) => c.is_active !== false)
              .map((c: any) => ({
                id: c.id,
                tenantId: c.tenant_id,
                legalName: c.legal_name || c.name || '',
                email: c.email,
                phone: c.phone,
                gstin: c.gstin,
                billingAddress: c.billing_address,
                billingState: c.billing_state || c.state,
                billingStateCode: c.billing_state_code || c.state_code,
                shippingAddress: c.shipping_address,
                shippingState: c.shipping_state,
                shippingStateCode: c.shipping_state_code,
                state: c.state,
                stateCode: c.state_code,
                isActive: c.is_active !== false,
              }))
          );
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };
    loadCustomers();

    window.addEventListener('invenza_customers_updated', loadCustomers);
    return () => {
      window.removeEventListener('invenza_customers_updated', loadCustomers);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initialize line item with first in-stock product (sorted A->Z)
  useEffect(() => {
    if (lineItems.length === 0 && products.length > 0) {
      const sorted = [...products].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
      const inStockCandidate = sorted.find((p) => {
        const stock = sourceLocationId ? (p.locationStock?.[sourceLocationId] ?? 0) : (p.currentStock ?? 0);
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
  }, [products, sourceLocationId]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSourceLoc = locations.find((l) => l.id === sourceLocationId);

  // Select customer from list
  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.legalName);
    setCustomerSearch(c.legalName);
    setCustomerGstin(c.gstin || '');
    setBillingAddress(c.billingAddress || '');
    if (c.billingState) setBillingState(c.billingState);
    if (c.billingStateCode) setBillingStateCode(c.billingStateCode);

    if (c.shippingAddress && c.shippingAddress !== c.billingAddress) {
      setHasSeparateShipping(true);
      setShippingAddress(c.shippingAddress);
      if (c.shippingState) setShippingState(c.shippingState);
      if (c.shippingStateCode) setShippingStateCode(c.shippingStateCode);
    } else {
      setHasSeparateShipping(false);
      setShippingAddress('');
    }
    setIsCustomerDropdownOpen(false);
  };

  // Create new customer inline
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustLegalName.trim() || !newCustBillingAddress.trim()) return;

    setIsSavingCustomer(true);
    try {
      const res = await api.createCustomer({
        legal_name: newCustLegalName.trim(),
        email: newCustEmail.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
        gstin: newCustTaxId.trim().toUpperCase() || undefined,
        billing_address: newCustBillingAddress.trim(),
        billing_state: newCustBillingState,
        billing_state_code: newCustBillingStateCode,
        shipping_address: newCustBillingAddress.trim(),
        shipping_state: newCustBillingState,
        shipping_state_code: newCustBillingStateCode,
        state: newCustBillingState,
        state_code: newCustBillingStateCode,
      });

      const newCustomer: Customer = {
        id: res.id,
        legalName: res.legal_name || res.name || '',
        email: res.email,
        phone: res.phone,
        gstin: res.gstin,
        billingAddress: res.billing_address,
        billingState: res.billing_state,
        billingStateCode: res.billing_state_code,
        shippingAddress: res.shipping_address,
        shippingState: res.shipping_state,
        shippingStateCode: res.shipping_state_code,
        state: res.state,
        stateCode: res.state_code,
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      handleSelectCustomer(newCustomer);
      setIsAddCustomerModalOpen(false);
      window.dispatchEvent(new CustomEvent('invenza_customers_updated'));

      // Reset modal fields
      setNewCustLegalName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustTaxId('');
      setNewCustBillingAddress('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.legalName || c.name || '').toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

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

  const taxableSubtotal = Math.max(0, calculateTotalGross() - calculateTotalDiscount());

  // Dynamic Live Tax Calculation
  const taxBreakdown = useMemo(() => {
    if (!isTaxEnabled) {
      return {
        isTaxEnabled: false,
        taxType: 'NONE',
        taxableValue: taxableSubtotal,
        taxes: [] as { label: string; rate: number; amount: number }[],
        taxTotal: 0,
        grandTotal: Math.round(taxableSubtotal),
      };
    }

    const effectiveShipState = hasSeparateShipping && shippingState ? shippingState : billingState;
    const effectiveShipCode = hasSeparateShipping && shippingStateCode ? shippingStateCode : billingStateCode;

    if (taxConfig.taxType === 'VAT') {
      const vatRate = EU_VAT_RATES[effectiveShipCode] || taxConfig.standardRate || 19.0;
      const vatAmount = (taxableSubtotal * vatRate) / 100;
      return {
        isTaxEnabled: true,
        taxType: 'VAT',
        taxableValue: taxableSubtotal,
        taxes: [{ label: `VAT (${vatRate}%)`, rate: vatRate, amount: vatAmount }],
        taxTotal: vatAmount,
        grandTotal: Math.round(taxableSubtotal + vatAmount),
      };
    }

    if (taxConfig.taxType === 'SALES_TAX') {
      const salesTaxRate = US_STATE_SALES_TAX_RATES[effectiveShipCode] ?? taxConfig.standardRate ?? 7.25;
      const salesTaxAmount = (taxableSubtotal * salesTaxRate) / 100;
      return {
        isTaxEnabled: true,
        taxType: 'SALES_TAX',
        taxableValue: taxableSubtotal,
        taxes: [{ label: `State Sales Tax (${salesTaxRate}%)`, rate: salesTaxRate, amount: salesTaxAmount }],
        taxTotal: salesTaxAmount,
        grandTotal: Math.round(taxableSubtotal + salesTaxAmount),
      };
    }

    // India GST
    const supplierStateCode = taxConfig.stateCode || '29';
    const isInterState = effectiveShipCode !== supplierStateCode;
    const standardRate = taxConfig.standardRate || 18.0;

    if (isInterState) {
      const igstAmount = (taxableSubtotal * standardRate) / 100;
      return {
        isTaxEnabled: true,
        taxType: 'GST',
        taxableValue: taxableSubtotal,
        taxes: [{ label: `IGST (${standardRate}%)`, rate: standardRate, amount: igstAmount }],
        taxTotal: igstAmount,
        grandTotal: Math.round(taxableSubtotal + igstAmount),
      };
    } else {
      const halfRate = standardRate / 2;
      const cgstAmount = (taxableSubtotal * halfRate) / 100;
      const sgstAmount = (taxableSubtotal * halfRate) / 100;
      return {
        isTaxEnabled: true,
        taxType: 'GST',
        taxableValue: taxableSubtotal,
        taxes: [
          { label: `CGST (${halfRate}%)`, rate: halfRate, amount: cgstAmount },
          { label: `SGST (${halfRate}%)`, rate: halfRate, amount: sgstAmount },
        ],
        taxTotal: cgstAmount + sgstAmount,
        grandTotal: Math.round(taxableSubtotal + cgstAmount + sgstAmount),
      };
    }
  }, [isTaxEnabled, taxConfig, taxableSubtotal, hasSeparateShipping, shippingState, shippingStateCode, billingState, billingStateCode]);

  const handleSubmitSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !sourceLocationId || lineItems.length === 0) {
      alert('Please fill in Customer Name, Fulfillment Warehouse, and at least one Line Item.');
      return;
    }

    const hasInvalidItem = lineItems.some((it) => !it.productId || (it.orderedQty || 0) <= 0);
    if (hasInvalidItem) {
      showToast('Please select a product and enter a valid quantity for each line item.', 'error');
      return;
    }

    if (stockShortages.length > 0) {
      const first = stockShortages[0];
      showToast(
        `Cannot create order — insufficient stock for ${first.sku} (${first.availableStock} in stock, ${first.orderedQty} requested).`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const sourceLoc = locations.find((l) => l.id === sourceLocationId);
      const isShipSeparate = hasSeparateShipping && Boolean(shippingAddress.trim());
      const effectiveShipState = isShipSeparate ? shippingState : billingState;
      const effectiveShipCode = isShipSeparate ? shippingStateCode : billingStateCode;

      await createSalesOrder({
        customerName: customerName.trim(),
        customerGstin: customerGstin.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        shippingAddress: isShipSeparate ? shippingAddress.trim() : (billingAddress.trim() || undefined),
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
        totalAmount: taxBreakdown.grandTotal,
        notes: soNotes.trim() || undefined,
      });

      setToastMessage({
        type: 'success',
        text: `Sales Order for "${customerName}" (${formatCurrency(taxBreakdown.grandTotal)}) created successfully.`,
      });

      setTimeout(() => {
        if (onNavigate) {
          onNavigate('sales_orders', { filter: 'all' });
        } else {
          window.location.href = '/sales-orders';
        }
      }, 1200);
    } catch (err: any) {
      console.error('Failed to create sales order:', err);
      alert(err.message || 'Failed to create sales order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-2 font-sans">
      <PageMeta
        title="Create Sales Order | Invenza Enterprise Inventory"
        description="Book customer sales orders, calculate live multi-regime taxes, reserve catalog stock, and configure place-of-supply fulfillment."
        canonicalPath="/create-sales-order"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800/50'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800/50'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <IconCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <IconAlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate('sales_orders') : (window.location.href = '/sales-orders'))}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 mb-2 transition-colors"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sales Orders</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create Sales Order
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reserve warehouse inventory, allocate line items, configure customer destination, and preview real-time tax calculation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-800/40">
            {isTaxEnabled ? `${taxConfig.taxLabel} Engine Active` : 'Plain Commercial Receipt (Tax Disabled)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitSO} className="space-y-6">
        {/* Section 1: Customer & Fulfillment Source */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <IconUser className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Customer & Fulfillment Setup
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Searchable Customer Dropdown */}
            <div className="relative" ref={customerDropdownRef}>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Client *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                >
                  <IconPlus className="h-3 w-3" /> Add New
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  placeholder="Search customer or enter name..."
                  className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <IconChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Customer Search Menu */}
              {isCustomerDropdownOpen && (
                <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-xl text-xs py-1">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-3 py-2 text-slate-400 text-center">
                      <span>No matching customer found.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          setNewCustLegalName(customerSearch);
                          setIsAddCustomerModalOpen(true);
                        }}
                        className="block mx-auto mt-1 font-bold text-teal-600 dark:text-teal-400 underline"
                      >
                        + Create "{customerSearch}"
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {c.legalName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.gstin ? `${c.gstin} • ` : ''}
                            {c.billingState || c.state}
                          </div>
                        </div>
                        {customerName === c.legalName && (
                          <IconCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Warehouse Selector */}
            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fulfillment Warehouse *
                </label>
              </div>
              {isMultiGodown ? (
                <WarehouseSelectDropdown
                  locations={locations}
                  selectedLocationId={sourceLocationId}
                  onSelect={setSourceLocationId}
                />
              ) : (
                <div className="h-[34px] px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <IconWarehouse className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{locations[0] ? `${locations[0].code} : ${locations[0].name}` : 'Main Godown'}</span>
                </div>
              )}
            </div>

            {/* Order Date */}
            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Order Date
                </label>
              </div>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Reference Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Reference / Order Notes (Optional)
            </label>
            <input
              type="text"
              value={soNotes}
              onChange={(e) => setSoNotes(e.target.value)}
              placeholder="e.g. PO Ref #9812, Special client packaging requested"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Section 2: Billing vs Shipping & Place of Supply */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <IconBuilding className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Billing Address & Place of Supply
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate"
                  title={`Customer ${isTaxEnabled ? taxConfig.taxIdLabel : 'Tax ID / Reference'} (Optional)`}
                >
                  Customer {isTaxEnabled ? taxConfig.taxIdLabel : 'Tax ID / Reference'} (Optional)
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
                className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 h-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing State / Region *
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing Address *
                </label>
              </div>
              <input
                type="text"
                required
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Street address, City, Postal PIN"
                className="w-full h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Bill-to / Ship-to Scenario Toggle */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSeparateShipping}
                onChange={(e) => setHasSeparateShipping(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Separate Shipping Destination Address (Bill-to / Ship-to scenario)
              </span>
            </label>

            {hasSeparateShipping && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20">
                <div>
                  <label className="block text-xs font-semibold text-teal-900 dark:text-teal-300 mb-1">
                    Shipping / Destination State *
                  </label>
                  <StateSelectDropdown
                    selectedCode={shippingStateCode}
                    onSelect={(code, name) => {
                      setShippingStateCode(code);
                      setShippingState(name);
                    }}
                  />
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 block">
                    Determines Place of Supply for {taxConfig.taxLabel} calculation when shipment destination differs from billing.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 dark:text-teal-300 mb-1">
                    Shipping Destination Address *
                  </label>
                  <input
                    type="text"
                    required={hasSeparateShipping}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Delivery site, warehouse or recipient premises"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Multi-Item Line Entry */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <IconLayers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Order Line Items
              </h2>
              <span className="text-xs text-slate-400 font-mono">
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

          {/* Table Headers */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex-1 min-w-0">Product Catalog</span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <span className="w-20 shrink-0 text-center">Qty</span>
              <span className="w-24 shrink-0 text-center">Unit Price</span>
              <span className="w-20 shrink-0 text-center">Disc %</span>
              <span className="w-28 shrink-0 text-center">Line Total</span>
              {lineItems.length > 1 && <span className="w-7 shrink-0" />}
            </div>
          </div>

          <div className="space-y-2.5">
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
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] space-y-2"
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

                      <div className="w-28 shrink-0 text-center">
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
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
                          className="w-7 h-7 flex items-center justify-center shrink-0 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove Line Item"
                        >
                          <IconTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line Item Stock Warnings */}
                  {isOutOfStock && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
                      <IconAlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        Out of Stock: <strong>0 units available</strong> in{' '}
                        {currentSourceLoc?.name || 'this warehouse'}.
                      </span>
                    </div>
                  )}
                  {isExceedingStock && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
                      <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        Insufficient Stock: Order quantity ({item.orderedQty}) exceeds available warehouse stock ({availableStock} {prod?.unitOfMeasure}).
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

        {/* Section 4: Live Order Summary & Tax Calculation */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 shadow-card space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            Live Order Valuation & Tax Breakdown
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Gross Subtotal</span>
              <span className="font-mono font-medium">{formatCurrency(calculateTotalGross())}</span>
            </div>

            {calculateTotalDiscount() > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Total Trade Discount</span>
                <span className="font-mono font-medium">-{formatCurrency(calculateTotalDiscount())}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Net Taxable Value</span>
              <span className="font-mono">{formatCurrency(taxableSubtotal)}</span>
            </div>

            {/* Tax Breakdown rows */}
            {isTaxEnabled ? (
              <div className="space-y-1.5 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                {taxBreakdown.taxes.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-teal-700 dark:text-teal-400">
                    <span className="font-medium">{t.label}</span>
                    <span className="font-mono font-semibold">+{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                * Note: Tax calculation is currently disabled. This order will be fulfilled as a plain <strong>Sales Receipt</strong>, without tax charges.
              </div>
            )}

            {/* Grand Total */}
            <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t-2 border-slate-200 dark:border-slate-800">
              <span>Grand Total</span>
              <span className="font-mono text-lg text-teal-700 dark:text-teal-400">
                {formatCurrency(taxBreakdown.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Warehouse Shortage Warning Banner */}
        {stockShortages.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
            <IconAlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1 flex-1">
              <div className="font-bold text-rose-800 dark:text-rose-300">
                Cannot create order &mdash; insufficient stock in {currentSourceLoc?.name || 'selected warehouse'}:
              </div>
              <div className="text-[11px] leading-relaxed">
                {stockShortages.map((s) => (
                  <span key={s.sku} className="inline-block mr-3 font-mono">
                    &bull; <strong>{s.sku}</strong> ({s.name}): {s.isZero ? '0 in stock' : `only ${s.availableStock} ${s.unit} available`}, {s.orderedQty} requested
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Order creation is blocked until inventory is replenished or item quantities are adjusted.
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate('sales_orders') : (window.location.href = '/sales-orders'))}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || stockShortages.length > 0}
            className="rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-xs font-bold text-white shadow-subtle transition-colors flex items-center gap-2"
            title={stockShortages.length > 0 ? 'Cannot create order — resolve stock shortages before proceeding' : undefined}
          >
            {isSubmitting ? (
              <span>Creating Order...</span>
            ) : (
              <>
                <IconPlus className="h-4 w-4" />
                <span>Create Sales Order</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Add New Customer Inline Modal */}
      {isAddCustomerModalOpen && (
        <Modal
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)}
          title="Add New Customer / Client"
          subtitle="Register customer profile for immediate use in sales orders and invoicing"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveNewCustomer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Legal / Trade Name *
              </label>
              <input
                type="text"
                required
                value={newCustLegalName}
                onChange={(e) => setNewCustLegalName(e.target.value)}
                placeholder="e.g. Metro Retail Corp Ltd"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="accounts@customer.com"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {taxConfig.taxIdLabel} (Optional)
                </label>
                <input
                  type="text"
                  value={newCustTaxId}
                  onChange={(e) => setNewCustTaxId(e.target.value.toUpperCase())}
                  placeholder={
                    taxConfig.taxType === 'VAT'
                      ? 'DE123456789'
                      : taxConfig.taxType === 'SALES_TAX'
                      ? '95-1234567'
                      : '29ABCDE1234F1Z5'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State / Region *
                </label>
                <StateSelectDropdown
                  selectedCode={newCustBillingStateCode}
                  onSelect={(code, name) => {
                    setNewCustBillingStateCode(code);
                    setNewCustBillingState(name);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Billing / Registered Address *
              </label>
              <textarea
                required
                rows={2}
                value={newCustBillingAddress}
                onChange={(e) => setNewCustBillingAddress(e.target.value)}
                placeholder="Street address, Suite, City, Postal PIN"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCustomer}
                className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
              >
                {isSavingCustomer ? 'Saving...' : 'Save & Select Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
