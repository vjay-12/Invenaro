import React, { useState, useEffect } from 'react';
import {
  IconFileText,
  IconDownload,
  IconSearch,
  IconIndianRupee,
  IconDollarSign,
  IconEuro,
  IconLayers,
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconTrash2,
  IconRefreshCw,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Invoice } from '../types/inventory';
import { api } from '../services/api';
import { formatMoney } from '../data/platformConstants';
import { PageMeta } from '../components/common/PageMeta';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';

export const Invoices: React.FC = () => {
  const { formatCurrency, currency, taxConfig } = useInventory();
  const { currencyCode: tenantCurrencyCode } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [voidModalInvoice, setVoidModalInvoice] = useState<Invoice | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // Payment Recording Modal State
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payReference, setPayReference] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInvoices();
      if (Array.isArray(data)) {
        // Map backend snake_case to frontend camelCase
        const mapped: Invoice[] = data.map((inv: any) => ({
          id: inv.id,
          tenantId: inv.tenant_id,
          invoiceNumber: inv.invoice_number,
          salesOrderId: inv.sales_order_id,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          placeOfSupply: inv.place_of_supply,
          status: (inv.status || 'issued').toLowerCase() as any,
          sellerLegalName: inv.seller_legal_name,
          sellerGstin: inv.seller_gstin,
          sellerPan: inv.seller_pan,
          sellerAddress: inv.seller_address,
          sellerState: inv.seller_state,
          sellerStateCode: inv.seller_state_code,
          customerName: inv.customer_name,
          customerGstin: inv.customer_gstin,
          customerBillingAddress: inv.customer_billing_address,
          customerShippingAddress: inv.customer_shipping_address,
          customerState: inv.customer_state,
          customerStateCode: inv.customer_state_code,
          isInterState: inv.is_inter_state,
          totalTaxableValue: Number(inv.total_taxable_value || 0),
          totalCgst: Number(inv.total_cgst || 0),
          totalSgst: Number(inv.total_sgst || 0),
          totalIgst: Number(inv.total_igst || 0),
          roundOff: Number(inv.round_off || 0),
          grandTotal: Number(inv.grand_total || 0),
          grandTotalWords: inv.grand_total_words || '',
          taxType: inv.tax_type || 'GST',
          taxEnabled: inv.tax_enabled !== undefined ? inv.tax_enabled : inv.tax_type !== 'NONE',
          currencyCode: inv.currency_code,
          totalSingleTax: Number(inv.total_single_tax || 0),
          pdfUrl: inv.pdf_url,
          paidAt: inv.paid_at,
          paymentMethod: inv.payment_method,
          paymentReference: inv.payment_reference,
          items: (inv.items || []).map((it: any) => ({
            id: it.id,
            productId: it.product_id,
            itemDescription: it.item_description,
            hsnCode: it.hsn_code,
            quantity: Number(it.quantity || 0),
            unitOfMeasure: it.unit_of_measure || 'pcs',
            unitPrice: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            taxableValue: Number(it.taxable_value || 0),
            gstRate: Number(it.gst_rate || 0),
            cgstRate: Number(it.cgst_rate || 0),
            cgstAmount: Number(it.cgst_amount || 0),
            sgstRate: Number(it.sgst_rate || 0),
            sgstAmount: Number(it.sgst_amount || 0),
            igstRate: Number(it.igst_rate || 0),
            igstAmount: Number(it.igst_amount || 0),
            singleTaxRate: it.single_tax_rate !== undefined && it.single_tax_rate !== null ? Number(it.single_tax_rate) : undefined,
            singleTaxAmount: it.single_tax_amount !== undefined && it.single_tax_amount !== null ? Number(it.single_tax_amount) : undefined,
            total: Number(it.total || 0),
          })),
        }));
        setInvoices(mapped);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      showToast('Failed to load invoices', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const [downloadingInvId, setDownloadingInvId] = useState<string | null>(null);

  const handleDownloadPdf = async (inv: Invoice) => {
    setDownloadingInvId(inv.id);
    try {
      await api.downloadInvoicePdf(inv.id, inv.invoiceNumber);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      window.open(api.getInvoicePdfUrl(inv.id), '_blank');
    } finally {
      setDownloadingInvId(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payModalInvoice) return;
    setIsPaying(true);
    try {
      await api.markInvoicePaid(payModalInvoice.id, {
        payment_method: payMethod,
        payment_reference: payReference.trim() || undefined,
      });
      showToast(`Payment recorded for #${payModalInvoice.invoiceNumber}. Status updated to Paid.`, 'success');
      setPayModalInvoice(null);
      setPayReference('');
      await fetchInvoices();
    } catch (err: any) {
      console.error('Failed to mark invoice as paid:', err);
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidModalInvoice) return;
    setIsVoiding(true);
    try {
      await api.voidInvoice(voidModalInvoice.id);
      showToast(`Invoice #${voidModalInvoice.invoiceNumber} has been voided. Audit log preserved.`, 'success');
      await fetchInvoices();
      setVoidModalInvoice(null);
    } catch (err: any) {
      console.error('Void invoice error:', err);
      showToast(err.message || 'Failed to void invoice', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  // Status segmentation for KPIs
  const paidInvoices = invoices.filter((i) => (i.status as string) === 'paid');
  const activeInvoices = invoices.filter((i) => (i.status as string) !== 'void');
  const voidInvoices = invoices.filter((i) => (i.status as string) === 'void');

  // KPI 1: Invoices Issued (Total active sequential invoices in register)
  const totalIssuedCount = activeInvoices.length;

  // KPI 2: Total Tax Collected (Realized tax from settled / PAID invoices)
  const totalTaxCollected = paidInvoices.reduce(
    (sum, inv) =>
      sum +
      (inv.taxType && inv.taxType !== 'GST'
        ? inv.totalSingleTax || 0
        : inv.totalCgst + inv.totalSgst + inv.totalIgst),
    0
  );

  // KPI 3: Taxable Turnover (Realized taxable goods value from settled / PAID invoices)
  const totalTaxable = paidInvoices.reduce((sum, inv) => sum + inv.totalTaxableValue, 0);

  // KPI 4: Void Register (Preserved audit trail count)
  const voidCount = voidInvoices.length;

  // Filtered list based on search and status tabs
  const filteredInvoices = invoices.filter((inv) => {
    const invStatus = (inv.status as string) || 'issued';
    if (statusFilter !== 'all' && invStatus !== statusFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q))
    );
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  const selectedInvIsPlainReceipt = selectedInvoice?.taxType === 'NONE' || selectedInvoice?.taxEnabled === false;
  const selectedInvIsGst = !selectedInvIsPlainReceipt && (!selectedInvoice?.taxType || selectedInvoice.taxType === 'GST');
  const selectedInvTaxLabel = selectedInvoice?.taxType === 'VAT' ? 'VAT' : selectedInvoice?.taxType === 'SALES_TAX' ? 'Sales Tax' : 'Tax';
  const selectedInvCurrency = selectedInvoice?.currencyCode || tenantCurrencyCode || currency;
  const selectedInvTaxRate = selectedInvoice?.items?.[0]?.singleTaxRate;

  return (
    <div className="space-y-6">
      <PageMeta
        title={`${taxConfig.invoicePageTitle} | Invenza Enterprise Inventory`}
        description={taxConfig.invoiceDescription}
        canonicalPath="/invoices"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/90 dark:text-white dark:border-emerald-700/50 backdrop-blur-sm'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/90 dark:text-white dark:border-rose-700/50 backdrop-blur-sm'
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
            {taxConfig.invoicePageTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {taxConfig.invoiceDescription}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInvoices}
          className="flex items-center gap-2 rounded-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-subtle self-start sm:self-auto"
        >
          <IconRefreshCw className={`h-3.5 w-3.5 text-teal-600 dark:text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Invoices</span>
        </button>
      </div>

      {/* 4 Compact Stat Cards (Prompt Item 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Invoices Issued"
          value={totalIssuedCount}
          subtitle="Sequential unbroken register"
          icon={IconFileText}
          colorScheme="teal"
          badge={taxConfig.complianceBadge}
          compact={true}
        />
        <StatCard
          title="Total Tax Collected"
          value={formatCurrency(totalTaxCollected)}
          subtitle={`${taxConfig.taxCollectedSubtitle} (Realized)`}
          icon={taxConfig.currencyCode === 'EUR' ? IconEuro : taxConfig.currencyCode === 'USD' ? IconDollarSign : IconIndianRupee}
          colorScheme="emerald"
          compact={true}
        />
        <StatCard
          title="Taxable Turnover"
          value={formatCurrency(totalTaxable)}
          subtitle="Realized goods value dispatched"
          icon={IconLayers}
          colorScheme="slate"
          compact={true}
        />
        <StatCard
          title="Void Register"
          value={voidCount}
          subtitle="Preserved audit numbers"
          icon={IconAlertTriangle}
          colorScheme={voidCount > 0 ? 'amber' : 'slate'}
          badge={voidCount > 0 ? 'Audit Logged' : 'Zero Voids'}
          compact={true}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-4 shadow-card">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search by Invoice #, Customer, ${taxConfig.taxIdLabel}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111A] pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 self-start sm:self-auto text-xs font-semibold">
          {(['all', 'issued', 'paid', 'void'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-teal-700 text-white font-bold shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table with Clean Column Alignment & table-fixed */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div>
          <table className="w-full text-left text-xs table-fixed">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0B111A] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="w-[16%] px-3 py-3 font-bold text-left">Invoice / Date</th>
                <th className="w-[19%] px-3 py-3 font-bold text-left">Customer & {taxConfig.taxIdLabel}</th>
                <th className="w-[14%] px-3 py-3 font-bold text-left">Place of Supply</th>
                <th className="w-[12%] px-3 py-3 font-bold text-right">Taxable Val</th>
                <th className="w-[10%] px-3 py-3 font-bold text-right">{taxConfig.taxLabel} Total</th>
                <th className="w-[11%] px-3 py-3 font-bold text-right">Grand Total</th>
                <th className="w-[9%] px-3 py-3 font-bold text-center">Status</th>
                <th className="w-[9%] px-3 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <IconFileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                      No Tax Invoices Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Invoices are automatically generated when Sales Orders are fulfilled.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      inv.status === 'void' ? 'opacity-60 bg-rose-500/5' : ''
                    }`}
                  >
                    {/* 1. Invoice No & Date (Left, merged) */}
                    <td className="w-[16%] px-3 py-2.5 text-left">
                      <div className="font-mono font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
                        {inv.invoiceNumber}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {inv.invoiceDate ? inv.invoiceDate.split('T')[0] : 'N/A'}
                      </div>
                    </td>

                    {/* 2. Customer & Tax ID (Left) */}
                    <td className="w-[19%] px-3 py-2.5 text-left">
                      <div className="font-semibold text-slate-900 dark:text-white truncate" title={inv.customerName}>
                        {inv.customerName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {inv.customerGstin || 'B2C / Unregistered'}
                      </div>
                    </td>

                    {/* 3. Place of Supply (Left) */}
                    <td className="w-[14%] px-3 py-2.5 text-left">
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate" title={inv.placeOfSupply}>
                        {inv.placeOfSupply}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate">
                        {inv.taxType === 'NONE' || inv.taxEnabled === false
                          ? 'Sales Receipt'
                          : inv.taxType === 'VAT'
                          ? 'VAT Invoice'
                          : inv.taxType === 'SALES_TAX'
                          ? 'Sales Tax Invoice'
                          : inv.isInterState
                          ? 'Inter-State (IGST)'
                          : 'Intra-State (CGST+SGST)'}
                      </div>
                    </td>

                    {/* 4. Taxable Value (Right-aligned font-mono) */}
                    <td className="w-[12%] px-3 py-2.5 text-right font-mono font-medium whitespace-nowrap">
                      {formatCurrency(inv.totalTaxableValue)}
                    </td>

                    {/* 5. Tax Total (Right-aligned font-mono) */}
                    <td className="w-[10%] px-3 py-2.5 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(
                        inv.taxType === 'GST'
                          ? inv.totalCgst + inv.totalSgst + inv.totalIgst
                          : inv.totalSingleTax || 0
                      )}
                    </td>

                    {/* 6. Grand Total (Right-aligned font-mono bold) */}
                    <td className="w-[11%] px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    {/* 7. Status Badge (Centered) */}
                    <td className="w-[9%] px-3 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          inv.status === 'issued'
                            ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-transparent'
                            : inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-transparent'
                            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-transparent line-through'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    {/* 8. Actions (Centered) */}
                    <td className="w-[9%] px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Mark Paid Action for Issued Invoices */}
                        {inv.status === 'issued' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalInvoice(inv);
                              setPayMethod('Bank Transfer');
                              setPayReference('');
                            }}
                            className="flex items-center gap-0.5 rounded border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors"
                            title="Record Payment / Mark as Paid"
                          >
                            <IconCheck className="h-3 w-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* View Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="View Invoice Details"
                        >
                          <IconEye className="h-3.5 w-3.5" />
                        </button>

                        {/* Void Button */}
                        {inv.status !== 'void' && (
                          <button
                            type="button"
                            onClick={() => setVoidModalInvoice(inv)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                            title="Void Invoice"
                          >
                            <IconTrash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel={taxConfig.invoicePageTitle.toLowerCase()}
        />
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`${selectedInvIsPlainReceipt ? 'Sales Receipt' : 'Tax Invoice'} ${selectedInvoice.invoiceNumber}`}
          maxWidth="xl"
          footer={
            <div className="flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>

              {selectedInvoice.status === 'issued' && (
                <button
                  type="button"
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    setPayModalInvoice(inv);
                    setPayMethod('Bank Transfer');
                    setPayReference('');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-subtle transition-colors"
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  <span>Record Payment (Mark Paid)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDownloadPdf(selectedInvoice)}
                className="flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-1.5 text-xs font-bold text-white shadow-subtle transition-colors"
              >
                <IconDownload className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            {/* Payment Status Banner in Modal */}
            {selectedInvoice.status === 'paid' && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Payment Settled & Confirmed</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedInvoice.paidAt ? `Paid on ${selectedInvoice.paidAt.split('T')[0]}` : 'Paid'}
                  {selectedInvoice.paymentMethod && ` via ${selectedInvoice.paymentMethod}`}
                  {selectedInvoice.paymentReference && ` (Ref: ${selectedInvoice.paymentReference})`}
                </div>
              </div>
            )}

            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedInvoice.sellerLegalName}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedInvoice.sellerAddress}</div>
                <div className="font-mono text-slate-400 mt-0.5">
                  {selectedInvIsGst
                    ? `GSTIN: ${selectedInvoice.sellerGstin} | PAN: ${selectedInvoice.sellerPan}`
                    : `${taxConfig.taxIdLabel}: ${selectedInvoice.sellerGstin || selectedInvoice.sellerPan || 'Standard'}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {selectedInvoice.invoiceNumber}
                </div>
                <div className="text-slate-500 mt-0.5">
                  Date: {selectedInvoice.invoiceDate ? selectedInvoice.invoiceDate.split('T')[0] : 'N/A'}
                </div>
                <div className="font-mono text-slate-400 mt-0.5">
                  Place of Supply: {selectedInvoice.placeOfSupply}
                </div>
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 dark:bg-[#0B111A] p-2.5 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-mono font-bold text-[10px] uppercase text-teal-600 tracking-wider">
                  Bill To
                </div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedInvoice.customerName}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedInvoice.customerBillingAddress}</div>
                <div className="font-mono text-slate-400 mt-0.5">
                  {selectedInvIsGst
                    ? `GSTIN: ${selectedInvoice.customerGstin || 'Unregistered'}`
                    : `${taxConfig.taxIdLabel}: ${selectedInvoice.customerGstin || 'Exempt / Consumer'}`}
                </div>
              </div>
              <div>
                <div className="font-mono font-bold text-[10px] uppercase text-teal-600 tracking-wider">
                  Ship To
                </div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedInvoice.customerName}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedInvoice.customerShippingAddress}</div>
                <div className="font-mono text-slate-400 mt-0.5">
                  {selectedInvIsPlainReceipt
                    ? 'Document: Plain Sales Receipt (Non-Tax)'
                    : `Tax Regime: ${selectedInvIsGst ? (selectedInvoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)') : selectedInvTaxLabel}`}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-1.5">Line Items</div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left font-sans">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-mono text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="px-2.5 py-1.5">Item</th>
                      {!selectedInvIsPlainReceipt && (
                        <th className="px-2.5 py-1.5">{selectedInvIsGst ? 'HSN' : 'Tax Code'}</th>
                      )}
                      <th className="px-2.5 py-1.5 text-right">Qty</th>
                      <th className="px-2.5 py-1.5 text-right">Unit Price</th>
                      <th className="px-2.5 py-1.5 text-right">{selectedInvIsPlainReceipt ? 'Subtotal' : 'Taxable'}</th>
                      {!selectedInvIsPlainReceipt && (
                        selectedInvIsGst ? (
                          <>
                            <th className="px-2.5 py-1.5 text-right">CGST</th>
                            <th className="px-2.5 py-1.5 text-right">SGST</th>
                            <th className="px-2.5 py-1.5 text-right">IGST</th>
                          </>
                        ) : (
                          <th className="px-2.5 py-1.5 text-right">{selectedInvTaxLabel}</th>
                        )
                      )}
                      <th className="px-2.5 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {selectedInvoice.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-2.5 py-1.5 font-sans font-medium">{it.itemDescription}</td>
                        {!selectedInvIsPlainReceipt && (
                          <td className="px-2.5 py-1.5 text-slate-400">{it.hsnCode}</td>
                        )}
                        <td className="px-2.5 py-1.5 text-right">{it.quantity} {it.unitOfMeasure}</td>
                        <td className="px-2.5 py-1.5 text-right">{formatMoney(it.unitPrice, selectedInvCurrency)}</td>
                        <td className="px-2.5 py-1.5 text-right">{formatMoney(it.taxableValue, selectedInvCurrency)}</td>
                        {!selectedInvIsPlainReceipt && (
                          selectedInvIsGst ? (
                            <>
                              <td className="px-2.5 py-1.5 text-right text-slate-500">
                                {it.cgstAmount > 0 ? `${formatMoney(it.cgstAmount, selectedInvCurrency)} (${it.cgstRate}%)` : '-'}
                              </td>
                              <td className="px-2.5 py-1.5 text-right text-slate-500">
                                {it.sgstAmount > 0 ? `${formatMoney(it.sgstAmount, selectedInvCurrency)} (${it.sgstRate}%)` : '-'}
                              </td>
                              <td className="px-2.5 py-1.5 text-right text-slate-500">
                                {it.igstAmount > 0 ? `${formatMoney(it.igstAmount, selectedInvCurrency)} (${it.igstRate}%)` : '-'}
                              </td>
                            </>
                          ) : (
                            <td className="px-2.5 py-1.5 text-right text-slate-500">
                              {(it.singleTaxAmount || 0) > 0 ? `${formatMoney(it.singleTaxAmount || 0, selectedInvCurrency)} (${it.singleTaxRate || 0}%)` : '-'}
                            </td>
                          )
                        )}
                        <td className="px-2.5 py-1.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatMoney(it.total, selectedInvCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-60 space-y-0.5 font-mono text-right">
                <div className="flex justify-between gap-6 text-slate-500">
                  <span>{selectedInvIsPlainReceipt ? 'Subtotal:' : 'Taxable Amount:'}</span>
                  <span>{formatMoney(selectedInvoice.totalTaxableValue, selectedInvCurrency)}</span>
                </div>
                {!selectedInvIsPlainReceipt && (
                  selectedInvIsGst ? (
                    <>
                      {selectedInvoice.totalCgst > 0 && (
                        <div className="flex justify-between gap-6 text-slate-500">
                          <span>Total CGST:</span>
                          <span>{formatMoney(selectedInvoice.totalCgst, selectedInvCurrency)}</span>
                        </div>
                      )}
                      {selectedInvoice.totalSgst > 0 && (
                        <div className="flex justify-between gap-6 text-slate-500">
                          <span>Total SGST:</span>
                          <span>{formatMoney(selectedInvoice.totalSgst, selectedInvCurrency)}</span>
                        </div>
                      )}
                      {selectedInvoice.totalIgst > 0 && (
                        <div className="flex justify-between gap-6 text-slate-500">
                          <span>Total IGST:</span>
                          <span>{formatMoney(selectedInvoice.totalIgst, selectedInvCurrency)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between gap-6 text-slate-500">
                      <span>
                        Total {selectedInvTaxLabel}
                        {selectedInvTaxRate !== undefined && ` (${selectedInvTaxRate}%)`}:
                      </span>
                      <span>{formatMoney(selectedInvoice.totalSingleTax || 0, selectedInvCurrency)}</span>
                    </div>
                  )
                )}
                {selectedInvoice.roundOff !== 0 && (
                  <div className="flex justify-between gap-6 text-slate-500">
                    <span>Round Off:</span>
                    <span>{selectedInvoice.roundOff > 0 ? `+${selectedInvoice.roundOff}` : selectedInvoice.roundOff}</span>
                  </div>
                )}
                <div className="flex justify-between gap-6 border-t border-slate-200 dark:border-slate-800 pt-1 font-bold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-teal-600 dark:text-teal-400">{formatMoney(selectedInvoice.grandTotal, selectedInvCurrency)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Confirmation Modal */}
      {payModalInvoice && (
        <Modal
          isOpen={!!payModalInvoice}
          onClose={() => setPayModalInvoice(null)}
          title={`Record Customer Payment — ${payModalInvoice.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">Invoice #{payModalInvoice.invoiceNumber}</span>
                <span className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  {formatCurrency(payModalInvoice.grandTotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{payModalInvoice.customerName}</span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / SEPA / ACH)</option>
                <option value="UPI / Instant Pay">UPI / Instant Pay</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1">
                Payment Reference / Transaction ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / TXN-984210 / Check #120"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Marking this invoice as Paid will update its financial lifecycle status from <b>Issued</b> to <b>Paid</b> and reflect the settled tax and turnover in your financial summary cards.
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying}
                onClick={handleConfirmPayment}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-subtle disabled:opacity-50 transition-colors"
              >
                <IconCheck className="h-3.5 w-3.5" />
                <span>{isPaying ? 'Recording...' : 'Confirm Payment'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Void Invoice Confirmation Modal */}
      {voidModalInvoice && (
        <Modal
          isOpen={!!voidModalInvoice}
          onClose={() => setVoidModalInvoice(null)}
          title="Void Tax Invoice"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-rose-800 dark:text-rose-200">
              <p className="font-bold">Are you sure you want to void this invoice?</p>
              <p className="mt-1 font-mono text-[11px]">
                Invoice #{voidModalInvoice.invoiceNumber}
              </p>
            </div>

            <p>
              Per tax regulations, voided invoices permanently retain their sequential number to prevent gaps in the audit register. The regenerated PDF will clearly display a prominent <b>VOID INVOICE</b> watermark.
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setVoidModalInvoice(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-subtle transition-colors"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
