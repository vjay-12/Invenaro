import React, { useState, useEffect, useMemo } from 'react';
import {
  IconFileUp,
  IconPlus,
  IconSearch,
  IconCheck,
  IconAlertTriangle,
  IconDownload,
  IconWhatsApp,
  IconFileText,
  IconWarehouse,
  IconLayers,
  IconTrash2,
  IconRefreshCw,
  IconChevronDown,
  IconChevronRight,
  IconIndianRupee,
  IconDollarSign,
  IconEuro,
  IconTruck,
  IconMapPin,
  IconBan,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { SalesOrder, Product, Invoice } from '../types/inventory';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { api } from '../services/api';
import { TabType } from '../components/layout/Sidebar';

interface SalesOrdersProps {
  onNavigate?: (tab: TabType, params?: Record<string, string>, replace?: boolean) => void;
  params?: Record<string, string>;
  initialOrderId?: string;
}

export const SalesOrders: React.FC<SalesOrdersProps> = ({ onNavigate, params, initialOrderId }) => {
  const {
    salesOrders,
    products,
    locations,
    selectedLocationId,
    formatCurrency,
    fulfillSalesOrder,
    refreshData,
    taxConfig,
  } = useInventory();
  const { user, applyTaxToSalesOrders } = useAuth();
  const effectiveEngine = (user as any)?.taxEngine || (user as any)?.tax_engine || taxConfig.taxType || 'GST';
  const isOrgTaxEnabled = effectiveEngine !== 'NONE' && applyTaxToSalesOrders !== false;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSoIds, setExpandedSoIds] = useState<Set<string>>(new Set());

  // Sorting state: default is most recent first by creation timestamp
  type SortField = 'createdAt' | 'soNumber' | 'customerName' | 'orderDate' | 'items' | 'totalAmount' | 'status';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'customerName' ? 'asc' : 'desc');
    }
  };

  const getCreationTime = (so: SalesOrder): number => {
    if (so.createdAt) {
      const t = new Date(so.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (so.orderDate) {
      const t = new Date(so.orderDate).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const extractNumericSeq = (soNum: string): number => {
    const match = soNum.match(/\d+/g);
    if (!match) return 0;
    return parseInt(match[match.length - 1], 10) || 0;
  };

  // Modals state
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<SalesOrder | null>(null);
  const [fulfillingSO, setFulfillingSO] = useState<SalesOrder | null>(null);
  const [fulfillError, setFulfillError] = useState<string | null>(null);
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Ensure the active filter starts or resets to 'all' (or respects explicit filter param)
  useEffect(() => {
    if (params?.filter) {
      setStatusFilter(params.filter);
    }
  }, [params?.filter]);

  // Automatically open target order if navigated with orderId or soNumber in params/URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderIdToOpen =
      initialOrderId ||
      params?.orderId ||
      params?.soNumber ||
      params?.so ||
      searchParams.get('orderId') ||
      searchParams.get('soNumber') ||
      searchParams.get('so');

    if (!orderIdToOpen || salesOrders.length === 0) return;

    const normalizedTarget = orderIdToOpen.trim().toLowerCase();
    const matched = salesOrders.find(
      (so) =>
        (so.id && String(so.id).toLowerCase() === normalizedTarget) ||
        (so.soNumber && so.soNumber.toLowerCase() === normalizedTarget)
    );

    if (matched) {
      setSelectedOrderForDetail(matched);
    }
  }, [salesOrders, initialOrderId, params]);

  const handleCloseDetailModal = () => {
    setSelectedOrderForDetail(null);
    if (onNavigate) {
      onNavigate('sales_orders', {}, true);
    } else if (window.location.search) {
      const url = new URL(window.location.href);
      url.searchParams.delete('orderId');
      url.searchParams.delete('soNumber');
      url.searchParams.delete('so');
      window.history.replaceState(window.history.state, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  // Payment Recording Modal State
  const [payModalSO, setPayModalSO] = useState<SalesOrder | null>(null);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payReference, setPayReference] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Void Modal State
  const [voidModalSO, setVoidModalSO] = useState<SalesOrder | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // Delete Draft Modal State
  const [deleteModalSO, setDeleteModalSO] = useState<SalesOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF Downloading State & Toast
  const [downloadingSoId, setDownloadingSoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleExpand = (soId: string) => {
    setExpandedSoIds((prev) => {
      const next = new Set(prev);
      if (next.has(soId)) {
        next.delete(soId);
      } else {
        next.add(soId);
      }
      return next;
    });
  };

  const handleDownloadOrderPdf = async (so: SalesOrder) => {
    setDownloadingSoId(so.id);
    try {
      if (so.invoiceId) {
        await api.downloadInvoicePdf(so.invoiceId, so.invoice?.invoiceNumber || so.soNumber);
      } else {
        await api.downloadSalesOrderPdf(so.id, so.soNumber);
      }
      showToast(`PDF for ${so.soNumber} successfully downloaded.`);
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      const fallbackUrl = so.invoiceId ? api.getInvoicePdfUrl(so.invoiceId) : api.getSalesOrderPdfUrl(so.id);
      window.open(fallbackUrl, '_blank');
    } finally {
      setDownloadingSoId(null);
    }
  };

  // Customer directory for phone number lookup
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await api.getCustomers();
        if (Array.isArray(data)) {
          setCustomers(data);
        }
      } catch (err) {
        console.error('Failed to load customers for phone lookup:', err);
      }
    };
    loadCustomers();
  }, []);

  const handleShareWhatsApp = (so: SalesOrder) => {
    const normStatus = getNormalizedStatus(so);

    // Respect order status and document availability
    if (normStatus === 'draft') {
      showToast('Cannot share: Invoice or receipt is not available for draft orders.', 'error');
      return;
    }

    // Resolve customer phone from order or customer directory
    let rawPhone = so.customerPhone;
    if (!rawPhone) {
      const match = customers.find(
        (c) =>
          ((c.legal_name && c.legal_name.toLowerCase() === so.customerName.toLowerCase()) ||
           (c.legalName && c.legalName.toLowerCase() === so.customerName.toLowerCase()) ||
           (so.customerGstin && c.gstin && c.gstin.toUpperCase() === so.customerGstin.toUpperCase())) &&
          (c.phone && c.phone.trim())
      ) || customers.find(
        (c) =>
          ((c.legal_name && c.legal_name.toLowerCase().startsWith(so.customerName.toLowerCase())) ||
           (c.legalName && c.legalName.toLowerCase().startsWith(so.customerName.toLowerCase())) ||
           (c.legal_name && so.customerName.toLowerCase().startsWith(c.legal_name.toLowerCase())) ||
           (c.legalName && so.customerName.toLowerCase().startsWith(c.legalName.toLowerCase()))) &&
          (c.phone && c.phone.trim())
      );
      rawPhone = match?.phone;
    }

    if (!rawPhone || !rawPhone.trim()) {
      showToast(
        `Customer WhatsApp number is not available for '${so.customerName}'. Please specify a phone number or update the customer profile.`,
        'error'
      );
      return;
    }

    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      cleanPhone = `91${cleanPhone}`;
    }

    if (cleanPhone.length < 8) {
      showToast(`Invalid WhatsApp phone number '${rawPhone}' for '${so.customerName}'.`, 'error');
      return;
    }

    const message = `Hi ${so.customerName}, here's your receipt for Sales Order ${so.soNumber}. Please find the receipt attached. Thank you.`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('WhatsApp opened with the receipt message ready to send.', 'success');
  };

  const handleConfirmFulfillment = async () => {
    if (!fulfillingSO) return;
    setFulfillError(null);

    // Validation: check that sufficient stock exists in the source location
    // Note: prod.locationStock may be keyed by UUID — fall back to total currentStock if key not found
    for (const item of fulfillingSO.items) {
      const prod = products.find((p) => p.id === item.productId);
      const locationSpecific = prod?.locationStock[fulfillingSO.sourceLocationId];
      const available = locationSpecific !== undefined ? locationSpecific : (prod?.currentStock ?? 0);
      if (available < item.orderedQty) {
        setFulfillError(
          `Cannot fulfill order: Insufficient stock for ${item.name} (${item.sku}) in ${fulfillingSO.sourceLocationName}. Required: ${item.orderedQty}, Available: ${available}`
        );
        return;
      }
    }

    setIsFulfilling(true);
    try {
      const res = await fulfillSalesOrder(fulfillingSO.id);
      // fulfillSalesOrder internally already calls syncBackend() on success;
      // do NOT call refreshData again to avoid double-sync overwrite race.
      if (!res.success) {
        setFulfillError(res.error || 'Failed to dispatch order and generate invoice.');
        return;
      }

      showToast(
        `Order ${fulfillingSO.soNumber} fulfilled! ${
          res.invoice_number ? `Document ${res.invoice_number} generated.` : ''
        }`
      );
      setFulfillingSO(null);
      // Always keep the 'all' filter selected after status changes and refresh data
      setStatusFilter('all');
      await refreshData?.();
    } catch (err: any) {
      setFulfillError(err.message || 'Error fulfilling order');
    } finally {
      setIsFulfilling(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payModalSO) return;
    setIsPaying(true);
    try {
      if (payModalSO.invoiceId) {
        await api.markInvoicePaid(payModalSO.invoiceId, {
          payment_method: payMethod,
          payment_reference: payReference.trim() || undefined,
        });
      } else {
        await api.paySalesOrder(payModalSO.id, {
          payment_method: payMethod,
          payment_reference: payReference.trim() || undefined,
        });
      }
      showToast(`Payment recorded for ${payModalSO.soNumber}. Status updated to Paid.`, 'success');
      setPayModalSO(null);
      setPayReference('');
      // Always keep the 'all' filter selected after status changes
      setStatusFilter('all');
      await refreshData?.();
    } catch (err: any) {
      console.error('Failed to mark as paid:', err);
      showToast(err.message || 'Failed to record payment', 'error');
      await refreshData?.();
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidModalSO) return;
    const trimmedReason = voidReason.trim();
    if (!trimmedReason) {
      setVoidError('Void reason is mandatory. Please enter a reason.');
      return;
    }
    setIsVoiding(true);
    setVoidError(null);
    try {
      await api.voidSalesOrder(voidModalSO.id, trimmedReason);
      showToast(`Order ${voidModalSO.soNumber} has been voided. Audit log preserved.`, 'success');
      setVoidModalSO(null);
      setVoidReason('');
      // Always keep the 'all' filter selected after status changes
      setStatusFilter('all');
      await refreshData?.();
    } catch (err: any) {
      console.error('Void error:', err);
      showToast(err.message || 'Failed to void order', 'error');
      await refreshData?.();
    } finally {
      setIsVoiding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalSO) return;
    setIsDeleting(true);
    try {
      await api.deleteSalesOrder(deleteModalSO.id);
      showToast(`Draft order ${deleteModalSO.soNumber} permanently deleted.`, 'success');
      setDeleteModalSO(null);
      // Always keep the 'all' filter selected after status changes
      setStatusFilter('all');
      await refreshData?.();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete order. Only Draft orders can be deleted.', 'error');
      await refreshData?.();
    } finally {
      setIsDeleting(false);
    }
  };

  // Status mapping helper
  const getNormalizedStatus = (so: SalesOrder): 'draft' | 'invoiced' | 'receipted' | 'paid' | 'void' => {
    const isTaxOn = so.taxEnabled !== false && isOrgTaxEnabled;
    const raw = (so.status || 'draft').toLowerCase();

    if (raw === 'void' || raw === 'cancelled') return 'void';
    if (raw === 'paid') return 'paid';
    if (raw === 'invoiced' || raw === 'fulfilled' || raw === 'completed' || raw === 'dispatched' || Boolean(so.invoiceId)) {
      return isTaxOn ? 'invoiced' : 'receipted';
    }
    return 'draft';
  };

  // KPI Calculations across all Sales Orders & linked Invoices
  const kpiMetrics = useMemo(() => {
    let invoicedCount = 0;
    let realizedTax = 0;
    let realizedTaxableTurnover = 0;
    let voidCount = 0;

    salesOrders.forEach((so) => {
      const st = getNormalizedStatus(so);
      if (st === 'void') {
        voidCount++;
      }
      if (st === 'invoiced' || st === 'receipted' || st === 'paid') {
        invoicedCount++;
      }
      if (st === 'paid') {
        if (so.invoice) {
          const inv = so.invoice;
          realizedTaxableTurnover += Number(inv.totalTaxableValue || 0);
          if (inv.taxType === 'GST') {
            realizedTax += Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0);
          } else {
            realizedTax += Number(inv.totalSingleTax || 0);
          }
        } else {
          realizedTaxableTurnover += Number(so.totalAmount || 0);
        }
      }
    });

    return {
      invoicedCount,
      realizedTax,
      realizedTaxableTurnover,
      voidCount,
    };
  }, [salesOrders, isOrgTaxEnabled]);

  // Filter & Sort Sales Orders (Default: Most recent creation timestamp first)
  const filteredSOs = useMemo(() => {
    const filtered = salesOrders.filter((so) => {
      if (selectedLocationId !== 'all' && so.sourceLocationId !== selectedLocationId) {
        return false;
      }
      const st = getNormalizedStatus(so);
      if (statusFilter !== 'all') {
        if (
          (statusFilter === 'invoiced' || statusFilter === 'receipted') &&
          (st === 'invoiced' || st === 'receipted')
        ) {
          // match invoiced / receipted
        } else if (st !== statusFilter) {
          return false;
        }
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        so.soNumber.toLowerCase().includes(q) ||
        so.customerName.toLowerCase().includes(q) ||
        (so.customerGstin && so.customerGstin.toLowerCase().includes(q)) ||
        (so.invoice?.invoiceNumber && so.invoice.invoiceNumber.toLowerCase().includes(q)) ||
        so.sourceLocationName.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      if (sortField === 'createdAt') {
        const timeA = getCreationTime(a);
        const timeB = getCreationTime(b);
        if (timeA !== timeB) {
          return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
        }
        // Deterministic secondary tie-breaker: numeric sequence from SO number
        const seqA = extractNumericSeq(a.soNumber);
        const seqB = extractNumericSeq(b.soNumber);
        if (seqA !== seqB) {
          return sortDirection === 'desc' ? seqB - seqA : seqA - seqB;
        }
        return sortDirection === 'desc'
          ? b.soNumber.localeCompare(a.soNumber)
          : a.soNumber.localeCompare(b.soNumber);
      }

      if (sortField === 'soNumber') {
        const seqA = extractNumericSeq(a.soNumber);
        const seqB = extractNumericSeq(b.soNumber);
        if (seqA !== seqB) {
          return sortDirection === 'desc' ? seqB - seqA : seqA - seqB;
        }
        return sortDirection === 'desc'
          ? b.soNumber.localeCompare(a.soNumber)
          : a.soNumber.localeCompare(b.soNumber);
      }

      if (sortField === 'customerName') {
        const cmp = a.customerName.localeCompare(b.customerName);
        return sortDirection === 'desc' ? -cmp : cmp;
      }

      if (sortField === 'orderDate') {
        const timeA = new Date(a.orderDate).getTime() || 0;
        const timeB = new Date(b.orderDate).getTime() || 0;
        if (timeA !== timeB) {
          return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
        }
        return getCreationTime(b) - getCreationTime(a);
      }

      if (sortField === 'items') {
        const countA = a.items.reduce((acc, it) => acc + (it.orderedQty || 0), 0);
        const countB = b.items.reduce((acc, it) => acc + (it.orderedQty || 0), 0);
        return sortDirection === 'desc' ? countB - countA : countA - countB;
      }

      if (sortField === 'totalAmount') {
        return sortDirection === 'desc'
          ? (b.totalAmount || 0) - (a.totalAmount || 0)
          : (a.totalAmount || 0) - (b.totalAmount || 0);
      }

      if (sortField === 'status') {
        const stA = getNormalizedStatus(a);
        const stB = getNormalizedStatus(b);
        return sortDirection === 'desc' ? stB.localeCompare(stA) : stA.localeCompare(stB);
      }

      return getCreationTime(b) - getCreationTime(a);
    });
  }, [salesOrders, selectedLocationId, statusFilter, searchQuery, isOrgTaxEnabled, sortField, sortDirection]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset to first page when search, statusFilter, location or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedLocationId, sortField, sortDirection]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSOs = filteredSOs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 pb-8 font-sans">
      <PageMeta
        title="Sales Orders & Invoices | Invenza Enterprise Inventory"
        description="Unified Sales Orders, dynamic tax invoicing, customer fulfillment, and sequential audit trail management."
        canonicalPath="/sales-orders"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800/50'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800/50'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <IconCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <IconAlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sales Orders & Invoicing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unified management of customer sales orders, real-time multi-regime invoicing, stock dispatch, and settlement tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refreshData?.()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
            title="Refresh Orders"
          >
            <IconRefreshCw className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onNavigate ? onNavigate('create_sales_order') : (window.location.href = '/create-sales-order')
            }
            className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors"
          >
            <IconPlus className="h-4 w-4" />
            <span>Create Sales Order</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards from Invoices Page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={isOrgTaxEnabled ? 'Orders Invoiced' : 'Orders Receipted'}
          value={kpiMetrics.invoicedCount}
          subtitle="Sequential unbroken register"
          icon={IconFileText}
          colorScheme="teal"
          badge={taxConfig.complianceBadge}
          compact={true}
        />
        <StatCard
          title="Total Tax Collected"
          value={isOrgTaxEnabled ? formatCurrency(kpiMetrics.realizedTax) : 'N/A (Disabled)'}
          subtitle={isOrgTaxEnabled ? `${taxConfig.taxCollectedSubtitle} (Settled)` : 'Commercial receipts only'}
          icon={
            taxConfig.currencyCode === 'EUR'
              ? IconEuro
              : taxConfig.currencyCode === 'USD'
              ? IconDollarSign
              : IconIndianRupee
          }
          colorScheme="emerald"
          compact={true}
        />
        <StatCard
          title="Taxable Turnover"
          value={formatCurrency(kpiMetrics.realizedTaxableTurnover)}
          subtitle="Settled sales value dispatched"
          icon={IconLayers}
          colorScheme="slate"
          compact={true}
        />
        <StatCard
          title="Void Register"
          value={kpiMetrics.voidCount}
          subtitle="Preserved audit numbers"
          icon={IconAlertTriangle}
          colorScheme={kpiMetrics.voidCount > 0 ? 'amber' : 'slate'}
          badge={kpiMetrics.voidCount > 0 ? 'Audit Logged' : 'Zero Voids'}
          compact={true}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-4 shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search SO #, Customer, Invoice #, ${taxConfig.taxIdLabel}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111A] pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Lifecycle Status Tabs */}
        <div className="flex items-center gap-1 self-start sm:self-auto text-xs font-semibold overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'draft', label: 'Draft' },
            { id: 'receipted', label: isOrgTaxEnabled ? 'Invoiced' : 'Receipted' },
            { id: 'paid', label: 'Paid' },
            { id: 'void', label: 'Void' },
          ].map((tab) => {
            const isActive =
              statusFilter === tab.id ||
              (tab.id === 'receipted' && (statusFilter === 'invoiced' || statusFilter === 'receipted'));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-700 text-white font-bold shadow-subtle'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Sales Orders + Invoices Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[760px]">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0B111A] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th
                  onClick={() => handleSort(sortField === 'createdAt' ? 'createdAt' : 'soNumber')}
                  className="w-[18%] px-3 py-3 font-bold text-left cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Default: Most Recent First by Creation Time. Click to toggle."
                >
                  <div className="inline-flex items-center gap-1">
                    <span>SO Number / Doc</span>
                    {(sortField === 'soNumber' || sortField === 'createdAt') && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customerName')}
                  className="w-[20%] px-3 py-3 font-bold text-left cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Sort by Customer Name"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Customer & Tax ID</span>
                    {sortField === 'customerName' && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('orderDate')}
                  className="w-[12%] px-3 py-3 font-bold text-left cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Sort by Order Date"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Order Date</span>
                    {sortField === 'orderDate' && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('items')}
                  className="w-[13%] px-3 py-3 font-bold text-center cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Sort by Items Count"
                >
                  <div className="inline-flex items-center justify-center gap-1 w-full">
                    <span>Items</span>
                    {sortField === 'items' && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="w-[13%] px-3 py-3 font-bold text-right cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Sort by Order Value"
                >
                  <div className="inline-flex items-center justify-end gap-1 w-full">
                    <span>Order Value</span>
                    {sortField === 'totalAmount' && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="w-[11%] px-3 py-3 font-bold text-center cursor-pointer select-none hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  title="Sort by Status"
                >
                  <div className="inline-flex items-center justify-center gap-1 w-full">
                    <span>Status</span>
                    {sortField === 'status' && (
                      <IconChevronDown
                        className={`h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400 transition-transform ${
                          sortDirection === 'asc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th className="w-[13%] px-3 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredSOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <IconFileUp className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                      No Sales Orders Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Create your first sales order using the button above to begin tracking fulfillment.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSOs.map((so) => {
                  const normStatus = getNormalizedStatus(so);
                  const isExpanded = expandedSoIds.has(so.id);
                  const itemsCount = so.items.reduce((acc, it) => acc + (it.orderedQty || 0), 0);
                  const isVoid = normStatus === 'void';
                  const isOrderTaxEnabled = so.taxEnabled !== false && isOrgTaxEnabled;
                  const docLabel = isOrderTaxEnabled
                    ? so.invoice?.taxType === 'VAT'
                      ? 'VAT Invoice'
                      : so.invoice?.taxType === 'SALES_TAX'
                      ? 'Sales Tax Invoice'
                      : 'Tax Invoice'
                    : 'Sales Receipt';

                  return (
                    <React.Fragment key={so.id}>
                      <tr
                        onClick={() => setSelectedOrderForDetail(so)}
                        className={`cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isVoid ? 'opacity-60 bg-rose-500/5' : ''
                        }`}
                      >
                        {/* 1. SO Number & Doc Badge */}
                        <td className="px-3 py-3 text-left">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(so.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              {isExpanded ? (
                                <IconChevronDown className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                              ) : (
                                <IconChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                                {so.soNumber}
                              </span>
                              {so.invoice?.invoiceNumber && (
                                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-semibold block truncate">
                                  {so.invoice.invoiceNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Customer & Tax ID */}
                        <td className="px-3 py-3 text-left">
                          <div className="font-semibold text-slate-900 dark:text-white truncate" title={so.customerName}>
                            {so.customerName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {so.customerGstin || (isOrderTaxEnabled ? 'B2C / Unregistered' : 'Commercial Buyer')}
                          </div>
                        </td>

                        {/* 3. Order Date */}
                        <td className="px-3 py-3 text-left">
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {so.orderDate ? so.orderDate.split('T')[0] : 'N/A'}
                          </span>
                        </td>

                        {/* 4. Items Summary */}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {so.items.length} {so.items.length === 1 ? 'line' : 'lines'} ({itemsCount} units)
                          </span>
                        </td>

                        {/* 5. Order Value */}
                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(so.totalAmount)}
                        </td>

                        {/* 6. Status Badge */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              normStatus === 'draft'
                                ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent'
                                : normStatus === 'invoiced' || normStatus === 'receipted'
                                ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-transparent'
                                : normStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-transparent'
                                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-transparent line-through'
                            }`}
                          >
                            {normStatus}
                          </span>
                        </td>

                        {/* 7. Row Actions — Fixed two-slot layout: [Primary Action] [Secondary Action] */}
                        <td
                          className="px-3 py-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Slot 1: Primary Action (w-[76px]) */}
                            <div className="w-[76px] flex items-center justify-center">
                              {normStatus === 'draft' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFulfillingSO(so);
                                  }}
                                  className="flex items-center justify-center gap-1 w-full rounded bg-teal-700 hover:bg-teal-800 px-2 py-1 text-[10px] font-bold text-white shadow-subtle transition-colors h-[26px]"
                                  title="Fulfill & Dispatch Order"
                                >
                                  <IconTruck className="h-3 w-3" />
                                  <span>Dispatch</span>
                                </button>
                              )}

                              {(normStatus === 'invoiced' || normStatus === 'receipted') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPayModalSO(so);
                                    setPayMethod('Bank Transfer');
                                    setPayReference('');
                                  }}
                                  className="flex items-center justify-center gap-1 w-full rounded border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors h-[26px]"
                                  title="Record Payment"
                                >
                                  <IconCheck className="h-3 w-3" />
                                  <span>Pay</span>
                                </button>
                              )}

                              {(normStatus === 'paid' || normStatus === 'void') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadOrderPdf(so);
                                  }}
                                  disabled={downloadingSoId === so.id}
                                  className="flex items-center justify-center w-full rounded border border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-1 text-teal-700 dark:text-teal-300 transition-colors h-[26px]"
                                  title={normStatus === 'void' ? 'Download voided document (PDF)' : (isOrderTaxEnabled ? 'Download invoice' : 'Download receipt')}
                                >
                                  <IconDownload className={`h-3.5 w-3.5 ${downloadingSoId === so.id ? 'animate-bounce' : ''}`} />
                                </button>
                              )}
                            </div>

                            {/* Slot 2: Secondary Action (w-7) */}
                            <div className="w-7 flex items-center justify-center">
                              {normStatus === 'draft' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteModalSO(so);
                                  }}
                                  className="p-1 rounded text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center justify-center h-[26px] w-7"
                                  title="Delete draft order"
                                >
                                  <IconTrash2 className="h-4 w-4" />
                                </button>
                              )}

                              {(normStatus === 'invoiced' || normStatus === 'receipted' || normStatus === 'paid') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVoidModalSO(so);
                                    setVoidReason('');
                                    setVoidError(null);
                                  }}
                                  className="p-1 rounded text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center justify-center h-[26px] w-7"
                                  title="Void order"
                                >
                                  <IconBan className="h-4 w-4" />
                                </button>
                              )}

                              {normStatus === 'void' && (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 rounded text-slate-300 dark:text-slate-600/60 cursor-not-allowed flex items-center justify-center h-[26px] w-7 opacity-50"
                                  title="Order is already voided"
                                >
                                  <IconBan className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Row (Item 7) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0C1017]/80 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="space-y-3.5 animate-in fade-in duration-200">
                              {/* Metadata Strip */}
                              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924]">
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                    <IconWarehouse className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    <span>Warehouse: <strong>{so.sourceLocationName}</strong></span>
                                  </div>

                                  {/* Place of Supply (only shown if legally relevant) */}
                                  {isOrderTaxEnabled && (
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
                                      <IconMapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                      <span>
                                        Place of Supply:{' '}
                                        <strong className="font-mono">
                                          {so.invoice?.placeOfSupply || so.shippingState || so.billingState || so.state || 'Karnataka'}
                                        </strong>
                                      </span>
                                      {so.invoice?.isInterState !== undefined && (
                                        <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300">
                                          {so.invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Tax Total if enabled */}
                                  {isOrderTaxEnabled && so.invoice && (
                                    <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
                                      <span className="text-slate-500 dark:text-slate-400">Tax Total:</span>
                                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        {formatCurrency(
                                          so.invoice.taxType === 'GST'
                                            ? Number(so.invoice.totalCgst || 0) +
                                                Number(so.invoice.totalSgst || 0) +
                                                Number(so.invoice.totalIgst || 0)
                                            : Number(so.invoice.totalSingleTax || 0)
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {/* Payment Stamp if paid */}
                                  {normStatus === 'paid' && so.invoice?.paidAt && (
                                    <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3 text-emerald-700 dark:text-emerald-400 text-xs">
                                      <IconCheck className="h-3.5 w-3.5" />
                                      <span>
                                        Paid via <strong>{so.invoice.paymentMethod || 'Bank Transfer'}</strong> on{' '}
                                        {so.invoice.paidAt.split('T')[0]}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-[11px] font-mono text-slate-400">
                                  ID: {so.id.slice(0, 8)}...
                                </div>
                              </div>

                              {/* Items Table Drill-Down */}
                              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#131924]">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#F8FAFC] dark:bg-[#0B111A] text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                      <th className="px-3 py-2">Item / SKU</th>
                                      <th className="px-3 py-2 text-center">Ordered</th>
                                      <th className="px-3 py-2 text-center">Fulfilled</th>
                                      <th className="px-3 py-2 text-right">Unit Price</th>
                                      <th className="px-3 py-2 text-right">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {so.items.map((it, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-3 py-2">
                                          <div className="font-semibold text-slate-900 dark:text-white">
                                            {it.name}
                                          </div>
                                          <div className="font-mono text-[10px] text-slate-400">
                                            {it.sku}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono">{it.orderedQty}</td>
                                        <td className="px-3 py-2 text-center font-mono text-teal-700 dark:text-teal-400 font-semibold">
                                          {it.fulfilledQty || 0}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                          {formatCurrency(it.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                          {formatCurrency(it.orderedQty * it.unitPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSOs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="sales orders"
        />
      </div>

      {/* Unified Sales Order & Invoice Detail Modal */}
      {selectedOrderForDetail && (
        <Modal
          isOpen={!!selectedOrderForDetail}
          onClose={handleCloseDetailModal}
          title={`Sales Order ${selectedOrderForDetail.soNumber}`}
          subtitle={`Customer: ${selectedOrderForDetail.customerName} • Source: ${selectedOrderForDetail.sourceLocationName}`}
          maxWidth="2xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-slate-400 font-mono">
                Status: <strong className="uppercase">{getNormalizedStatus(selectedOrderForDetail)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedOrderForDetail)}
                  disabled={getNormalizedStatus(selectedOrderForDetail) === 'draft'}
                  className="h-[34px] px-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/30 text-xs font-bold transition-colors shadow-subtle disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title={
                    getNormalizedStatus(selectedOrderForDetail) === 'draft'
                      ? 'Invoice/Receipt not available for draft orders'
                      : 'Share receipt on WhatsApp'
                  }
                  aria-label="Share on WhatsApp"
                >
                  <IconWhatsApp className="h-4 w-4" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadOrderPdf(selectedOrderForDetail)}
                  disabled={downloadingSoId === selectedOrderForDetail.id}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle disabled:opacity-50"
                >
                  <IconDownload className={`h-3.5 w-3.5 ${downloadingSoId === selectedOrderForDetail.id ? 'animate-bounce' : ''}`} />
                  <span>
                    Download {selectedOrderForDetail.taxEnabled !== false && isOrgTaxEnabled ? 'Invoice' : 'Receipt'} PDF
                  </span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Void Audit Details if Voided */}
            {getNormalizedStatus(selectedOrderForDetail) === 'void' && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Order Voided — Inactive / Preserved Audit Record</span>
                  </div>
                  {selectedOrderForDetail.voidedAt && (
                    <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400">
                      {new Date(selectedOrderForDetail.voidedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {selectedOrderForDetail.voidReason && (
                  <p className="text-xs text-rose-700 dark:text-rose-300 pl-5.5">
                    <strong className="font-semibold">Void Reason:</strong> {selectedOrderForDetail.voidReason}
                  </p>
                )}
              </div>
            )}

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Billing Details:</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedOrderForDetail.customerName}
                  <br />
                  {selectedOrderForDetail.billingAddress || 'Corporate Address'}
                  <br />
                  {selectedOrderForDetail.billingState || selectedOrderForDetail.state}
                </p>
                {selectedOrderForDetail.customerGstin && (
                  <p className="mt-1 font-mono text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                    {taxConfig.taxIdLabel}: {selectedOrderForDetail.customerGstin}
                  </p>
                )}
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Shipping Details:</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedOrderForDetail.shippingAddress || selectedOrderForDetail.billingAddress || 'Delivery Address'}
                  <br />
                  {selectedOrderForDetail.shippingState || selectedOrderForDetail.billingState || selectedOrderForDetail.state}
                </p>
                <p className="mt-1 text-slate-500 font-mono text-[11px]">
                  Warehouse: {selectedOrderForDetail.sourceLocationName}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F8FA] dark:bg-[#0B111A] text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Item Description</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedOrderForDetail.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{it.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{it.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{it.orderedQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        {formatCurrency(it.orderedQty * it.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Valuation Summary */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Goods Valuation</span>
                <span className="font-mono">{formatCurrency(selectedOrderForDetail.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total</span>
                <span className="font-mono text-teal-700 dark:text-teal-400">
                  {formatCurrency(selectedOrderForDetail.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {payModalSO && (
        <Modal
          isOpen={!!payModalSO}
          onClose={() => setPayModalSO(null)}
          title={`Record Payment for ${payModalSO.soNumber}`}
          subtitle={`Invoice: ${payModalSO.invoice?.invoiceNumber || 'Document'} • Amount: ${formatCurrency(payModalSO.totalAmount)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method *
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI">UPI / Digital Payment</option>
                <option value="Cheque">Cheque / Demand Draft</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction / Payment Reference
              </label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UTR-982147281, Cheque #49120"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayModalSO(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying}
                onClick={handleConfirmPayment}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-subtle"
              >
                {isPaying ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Void Confirmation Modal (Mandatory Void Reason) */}
      {voidModalSO && (
        <Modal
          isOpen={!!voidModalSO}
          onClose={() => {
            setVoidModalSO(null);
            setVoidReason('');
            setVoidError(null);
          }}
          title={`Void Order ${voidModalSO.soNumber}?`}
          subtitle="Statutory compliance notice • Mandatory reason required"
          maxWidth="md"
        >
          <div className="space-y-3.5 text-xs font-sans">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
              <IconAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to void this sales order?</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {voidModalSO.invoiceId
                    ? `Tax Invoice #${voidModalSO.invoice?.invoiceNumber || ''} and Sales Order #${voidModalSO.soNumber} will be permanently marked VOID. Under statutory audit compliance, this sequential number is preserved in the audit log and will NEVER be deleted or reused.`
                    : `Sales Order #${voidModalSO.soNumber} will be cancelled and marked VOID in the movement ledger history. Its sequential number is permanently preserved.`}
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Void Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => {
                  setVoidReason(e.target.value);
                  if (voidError) setVoidError(null);
                }}
                placeholder="e.g. Order cancelled by buyer, billing dispute, incorrect pricing / item configuration..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              {voidError && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {voidError}
                </p>
              )}
              <p className="mt-1 text-[10px] text-slate-400">
                A reason is mandatory. It will be recorded alongside your user ID and timestamp in the tamper-evident audit log.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setVoidModalSO(null);
                  setVoidReason('');
                  setVoidError(null);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVoiding || !voidReason.trim()}
                onClick={handleConfirmVoid}
                className="rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-xs font-bold text-white shadow-subtle"
              >
                {isVoiding ? 'Voiding...' : 'Yes, Void Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Draft Confirmation Modal */}
      {deleteModalSO && (
        <Modal
          isOpen={!!deleteModalSO}
          onClose={() => setDeleteModalSO(null)}
          title={`Delete Draft Order ${deleteModalSO.soNumber}?`}
          subtitle="Permanent deletion of unfulfilled draft"
          maxWidth="md"
        >
          <div className="space-y-3 text-xs font-sans">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
              <IconAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Permanently delete draft sales order?</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Draft order <strong>{deleteModalSO.soNumber}</strong> for <strong>{deleteModalSO.customerName}</strong> will be permanently removed. No stock or financial movements have been recorded for this draft. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalSO(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-subtle"
              >
                {isDeleting ? 'Deleting...' : 'Delete Draft Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dispatch / Fulfillment Modal */}
      {fulfillingSO && (
        <Modal
          isOpen={!!fulfillingSO}
          onClose={() => {
            setFulfillingSO(null);
            setFulfillError(null);
          }}
          title={`Confirm Dispatch: ${fulfillingSO.soNumber}`}
          subtitle={`Source: ${fulfillingSO.sourceLocationName} • Total Value: ${formatCurrency(fulfillingSO.totalAmount)}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {fulfillError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
                {fulfillError}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#0B111A] text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-center">Required Qty</th>
                    <th className="px-3 py-2 text-center">Warehouse Stock</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fulfillingSO.items.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const avail = prod?.locationStock[fulfillingSO.sourceLocationId] || 0;
                    const isSufficient = avail >= it.orderedQty;
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                          {it.name} ({it.sku})
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{it.orderedQty}</td>
                        <td className="px-3 py-2 text-center font-mono">{avail}</td>
                        <td className="px-3 py-2 text-center">
                          {isSufficient ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ready</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">Shortage</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              Confirming fulfillment will decrement stock in{' '}
              <strong>{fulfillingSO.sourceLocationName}</strong>, write OUT transactions to the Movement Ledger,
              and sequentially issue the legal{' '}
              <strong>{fulfillingSO.taxEnabled !== false && isOrgTaxEnabled ? 'Tax Invoice' : 'Sales Receipt'}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setFulfillingSO(null);
                  setFulfillError(null);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFulfilling}
                onClick={handleConfirmFulfillment}
                className="rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle"
              >
                {isFulfilling ? 'Fulfilling...' : 'Confirm Dispatch & Issue Document'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
