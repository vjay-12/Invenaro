import React, { useState, useEffect } from 'react';
import {
  IconIndianRupee as IndianRupee,
  IconBuilding as Building2,
  IconCheck as CheckCircle2,
  IconAlertCircle as AlertCircle,
  IconClock as Clock,
  IconSearch as Search,
  IconRefreshCw as RefreshCw,
  IconEdit as Edit,
  IconFileText as FileText,
  IconLayers as Layers,
  IconShieldCheck as Shield,
  IconDownload as Download,
  IconX as X,
  IconArrowLeftRight as ArrowLeftRight,
} from '../components/icons';
import { api } from '../services/api';
import { PageMeta } from '../components/common/PageMeta';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { Pagination } from '../components/common/Pagination';
import { INDUSTRIES_LIST, formatMoney, CURRENCY_SYMBOLS } from '../data/platformConstants';

interface BillingManagementProps {
  orgId?: string;
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

const PAYMENT_MODE_OPTIONS: DropdownOption[] = [
  { value: 'Bank Transfer', label: 'Bank Transfer (NEFT / RTGS / IMPS)' },
  { value: 'UPI', label: 'UPI / QR Payment' },
  { value: 'Cash', label: 'Cash Remittance' },
  { value: 'Other', label: 'Other / Cheque Settlement' },
  { value: 'Gateway', label: 'Payment Gateway (Future Ready)' },
];

export const BillingManagement: React.FC<BillingManagementProps> = ({ orgId, onNavigate }) => {
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drill-down Org Detail State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgBillingDetail, setOrgBillingDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [loadDetailError, setLoadDetailError] = useState<string | null>(null);
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);

  // Pagination State for Organizations Overview Table (20 items/page default)
  const [orgCurrentPage, setOrgCurrentPage] = useState(1);
  const [orgPageSize, setOrgPageSize] = useState(20);

  useEffect(() => {
    setOrgCurrentPage(1);
  }, [statusFilter, industryFilter, searchTerm, orgPageSize]);

  const rawOrgs = overviewData?.organizations || [];
  const orgStartIndex = (orgCurrentPage - 1) * orgPageSize;
  const paginatedOrgs = rawOrgs.slice(orgStartIndex, orgStartIndex + orgPageSize);

  // Pagination State for Organization Transaction Ledger (20 items/page default)
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);

  useEffect(() => {
    setTxCurrentPage(1);
  }, [selectedOrgId, txPageSize]);

  const rawTransactions = orgBillingDetail?.transactions || [];
  const txStartIndex = (txCurrentPage - 1) * txPageSize;
  const paginatedTransactions = rawTransactions.slice(txStartIndex, txStartIndex + txPageSize);

  // 1. Mark as Paid Modal State
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<{
    id: string;
    type: 'setup_fee' | 'monthly_cycle';
    title: string;
    defaultAmount: number;
  } | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState('0');
  const [paymentDateReceived, setPaymentDateReceived] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingMarkPaid, setIsSubmittingMarkPaid] = useState(false);

  // 2. Mark as Waived Modal State (Monthly Cycle Only)
  const [isMarkWaivedModalOpen, setIsMarkWaivedModalOpen] = useState(false);
  const [waiveTargetCycle, setWaiveTargetCycle] = useState<{ id: string; title: string } | null>(null);
  const [waiveReasonNote, setWaiveReasonNote] = useState('');
  const [isSubmittingWaive, setIsSubmittingWaive] = useState(false);

  // 3. Update Maintenance Rate Modal State
  const [isUpdateRateModalOpen, setIsUpdateRateModalOpen] = useState(false);
  const [newMaintenanceRate, setNewMaintenanceRate] = useState('0');
  const [rateEffectiveDate, setRateEffectiveDate] = useState('');
  const [rateChangeReason, setRateChangeReason] = useState('');
  const [isSubmittingRateUpdate, setIsSubmittingRateUpdate] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBillingOverview({
        status: statusFilter,
        industry: industryFilter,
        search: searchTerm || undefined,
      });
      if (data) {
        setOverviewData(data);
      }
    } catch (err: any) {
      console.warn('Failed to load billing overview:', err);
      showToast('Failed to fetch billing overview', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrgDetail = async (tenantId: string) => {
    setIsLoadingDetail(true);
    setLoadDetailError(null);
    try {
      const data = await api.getTenantBillingDetail(tenantId);
      if (data) {
        // Safe normalization
        const setupFee = data.setup_fee || {};
        const currentPlan = data.current_plan || {};
        const orgInfo = data.org || {};

        const normalized = {
          ...data,
          org: orgInfo,
          tenant_name: orgInfo.name || data.tenant_name || 'Organization',
          unique_code: orgInfo.unique_code || orgInfo.company_code || 'N/A',
          industry: orgInfo.industry || 'General Merchandise',
          status: orgInfo.status || 'Active',
          setup_fee: setupFee,
          setup_fee_amount: Number(setupFee.amount ?? data.setup_fee ?? 0),
          setup_fee_status: String(setupFee.status || data.setup_fee_status || 'Pending'),
          current_plan: currentPlan,
          monthly_maintenance_fee: Number(currentPlan.current_rate ?? data.monthly_maintenance_fee ?? 0),
          rate_history: data.rate_history || data.fee_history || [],
          cycles: data.cycles || [],
          transactions: data.transactions || data.payment_records || data.payments || [],
        };
        setOrgBillingDetail(normalized);
      } else {
        setLoadDetailError('No billing subscription records returned for this organization.');
      }
    } catch (err: any) {
      console.warn('Failed to load organization billing detail:', err);
      setOrgBillingDetail(null);
      setLoadDetailError(err?.message || 'Could not load billing account. Please confirm the organization ID.');
      showToast('Failed to load organization billing detail', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Sync route query param or prop on mount and changes
  useEffect(() => {
    loadOverview();
    const effectiveOrgId = orgId || new URLSearchParams(window.location.search).get('org');
    if (effectiveOrgId) {
      setSelectedOrgId(effectiveOrgId);
      loadOrgDetail(effectiveOrgId);
    } else {
      setSelectedOrgId(null);
      setOrgBillingDetail(null);
      setLoadDetailError(null);
    }
  }, [orgId]);

  useEffect(() => {
    loadOverview();
  }, [statusFilter, industryFilter]);

  const handleSelectOrgForDrilldown = (tenantId: string) => {
    setSelectedOrgId(tenantId);
    setLoadDetailError(null);
    if (onNavigate) {
      onNavigate('billing', { org: tenantId });
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('org', tenantId);
      window.history.pushState({}, '', url.toString());
    }
    loadOrgDetail(tenantId);
  };

  const handleBackToOverview = () => {
    setSelectedOrgId(null);
    setOrgBillingDetail(null);
    setLoadDetailError(null);
    if (onNavigate) {
      onNavigate('billing');
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('org');
      window.history.pushState({}, '', url.toString());
    }
    loadOverview();
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PDF DOWNLOAD HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════

  const handleDownloadSetupFeePdf = async (setupFeeId: string, invNum?: string) => {
    setDownloadingRecordId('setup_fee');
    try {
      await api.downloadSetupFeeInvoicePdfById(setupFeeId, invNum);
      showToast('Setup fee tax invoice PDF downloaded.', 'success');
    } catch (err: any) {
      console.error('Failed to download setup fee invoice:', err);
      showToast(err.message || 'Failed to download invoice PDF', 'error');
    } finally {
      setDownloadingRecordId(null);
    }
  };

  const handleDownloadCyclePdf = async (cycleId: string, invNum?: string) => {
    setDownloadingRecordId(cycleId);
    try {
      await api.downloadCycleInvoicePdfById(cycleId, invNum);
      showToast('Maintenance tax invoice PDF downloaded.', 'success');
    } catch (err: any) {
      console.error('Failed to download cycle invoice:', err);
      showToast(err.message || 'Failed to download invoice PDF', 'error');
    } finally {
      setDownloadingRecordId(null);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // MARK AS PAID FLOW
  // ═════════════════════════════════════════════════════════════════════════════

  const handleOpenMarkPaid = (target: {
    id: string;
    type: 'setup_fee' | 'monthly_cycle';
    title: string;
    defaultAmount: number;
  }) => {
    setMarkPaidTarget(target);
    setConfirmedAmount(String(target.defaultAmount));
    setPaymentDateReceived(new Date().toISOString().split('T')[0]);
    setSelectedPaymentMode('Bank Transfer');
    setPaymentNote('');
    setIsMarkPaidModalOpen(true);
  };

  const handleConfirmMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markPaidTarget) return;

    const amt = parseFloat(confirmedAmount);
    if (isNaN(amt) || amt < 0) {
      showToast('Please enter a valid non-negative confirmed amount.', 'error');
      return;
    }

    setIsSubmittingMarkPaid(true);
    try {
      if (markPaidTarget.type === 'setup_fee') {
        await api.markSetupFeePaid(markPaidTarget.id, {
          confirmed_amount: amt,
          date_received: paymentDateReceived || undefined,
          payment_mode: selectedPaymentMode,
          note: paymentNote.trim() || undefined,
        });
        showToast('Setup fee marked as Paid! GST Tax invoice auto-generated.', 'success');
      } else {
        await api.markCyclePaid(markPaidTarget.id, {
          confirmed_amount: amt,
          date_received: paymentDateReceived || undefined,
          payment_mode: selectedPaymentMode,
          note: paymentNote.trim() || undefined,
        });
        showToast('Monthly maintenance cycle marked as Paid! GST Tax invoice auto-generated.', 'success');
      }

      setIsMarkPaidModalOpen(false);
      setMarkPaidTarget(null);
      if (selectedOrgId) {
        loadOrgDetail(selectedOrgId);
      }
      loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to mark payment as paid.', 'error');
    } finally {
      setIsSubmittingMarkPaid(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // MARK AS WAIVED FLOW (Monthly Cycle Only)
  // ═════════════════════════════════════════════════════════════════════════════

  const handleOpenMarkWaived = (cycle: { id: string; title: string }) => {
    setWaiveTargetCycle(cycle);
    setWaiveReasonNote('');
    setIsMarkWaivedModalOpen(true);
  };

  const handleConfirmMarkWaived = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveTargetCycle) return;

    if (!waiveReasonNote.trim() || waiveReasonNote.trim().length < 2) {
      showToast('A valid reason note is required to waive a monthly maintenance cycle.', 'error');
      return;
    }

    setIsSubmittingWaive(true);
    try {
      await api.markCycleWaived(waiveTargetCycle.id, {
        reason_note: waiveReasonNote.trim(),
      });
      showToast('Monthly cycle marked as Waived. Audit log entry recorded.', 'success');
      setIsMarkWaivedModalOpen(false);
      setWaiveTargetCycle(null);
      if (selectedOrgId) {
        loadOrgDetail(selectedOrgId);
      }
      loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to mark cycle as waived.', 'error');
    } finally {
      setIsSubmittingWaive(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // UPDATE MAINTENANCE RATE FLOW (Append-Only History)
  // ═════════════════════════════════════════════════════════════════════════════

  const handleOpenUpdateRate = () => {
    const currentRate = orgBillingDetail?.current_plan?.current_rate ?? orgBillingDetail?.monthly_maintenance_fee ?? 0;
    setNewMaintenanceRate(String(currentRate));
    setRateEffectiveDate(new Date().toISOString().split('T')[0]);
    setRateChangeReason('');
    setIsUpdateRateModalOpen(true);
  };

  const handleConfirmUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    const rate = parseFloat(newMaintenanceRate);
    if (isNaN(rate) || rate < 0) {
      showToast('Maintenance rate must be a non-negative number.', 'error');
      return;
    }

    setIsSubmittingRateUpdate(true);
    try {
      await api.updateOrgMaintenanceRate(selectedOrgId, {
        new_rate: rate,
        effective_from: rateEffectiveDate || undefined,
        reason: rateChangeReason.trim() || undefined,
      });
      showToast(`Monthly maintenance rate updated to ${formatMoney(rate, orgBillingDetail?.currency_code || 'INR')}/mo. New history row appended.`, 'success');
      setIsUpdateRateModalOpen(false);
      loadOrgDetail(selectedOrgId);
      loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to update maintenance rate.', 'error');
    } finally {
      setIsSubmittingRateUpdate(false);
    }
  };

  // Dropdown options
  const statusDropdownOptions: DropdownOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'paid', label: 'Paid in Full' },
    { value: 'pending', label: 'Pending Payment' },
    { value: 'overdue', label: 'Overdue Accounts' },
    { value: 'waived', label: 'Waived Tier' },
  ];

  const industryDropdownOptions: DropdownOption[] = [
    { value: 'all', label: 'All Industries' },
    ...INDUSTRIES_LIST.map((ind) => ({ value: ind, label: ind })),
  ];

  const revenueByCurrency: Record<string, number> = overviewData?.revenue_by_currency || {};
  const mrrByCurrency: Record<string, number> = overviewData?.mrr_by_currency || {};
  const revenueCurrencyKeys = Object.keys(revenueByCurrency);
  const mrrCurrencyKeys = Object.keys(mrrByCurrency);

  const drillCurrencyCode: string = orgBillingDetail?.currency_code || 'INR';
  const drillCurrencySymbol = CURRENCY_SYMBOLS[drillCurrencyCode] || '₹';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F6F9] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      <PageMeta
        title={selectedOrgId ? `Billing — ${orgBillingDetail?.tenant_name || 'Organization'}` : 'Billing & Commercial Management'}
        description="Manage one-time setup fees, recurring monthly maintenance agreements, manual payments, and sequential GST invoicing."
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-teal-600 text-white border border-teal-500/30'
              : 'bg-rose-600 text-white border border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* VIEW A: TOP-LEVEL OVERVIEW (When no org is selected) */}
      {!selectedOrgId && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                <IndianRupee className="w-4 h-4" />
                <span>Super Admin Commercial Engine</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Billing & Maintenance Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time tenant receivables, one-time onboarding fees, recurring SLA maintenance, and GST tax invoicing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadOverview}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:text-teal-500 text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition-colors"
                title="Refresh Billing Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* 5 Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Total Revenue Collected */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Revenue Collected</span>
              {revenueCurrencyKeys.length > 1 ? (
                <div className="mt-1 space-y-0.5">
                  {revenueCurrencyKeys.map((cur) => (
                    <div key={cur} className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(revenueByCurrency[cur] || 0, cur)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-lg sm:text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                  {formatMoney(overviewData?.total_revenue_collected || 0, revenueCurrencyKeys[0] || 'INR')}
                </div>
              )}
              <span className="text-[10px] text-slate-400 font-mono mt-1">Paid Setup + Paid Cycles</span>
            </div>

            {/* 2. Pending Setup Fees (Count + Amount) */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 shadow-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Pending Setup Fees</span>
              <div className="text-lg sm:text-xl font-mono font-bold text-amber-700 dark:text-amber-300 mt-1">
                {formatMoney(
                  overviewData?.pending_setup_fees_amount ?? overviewData?.pending_setup_fees ?? 0,
                  revenueCurrencyKeys.length === 1 ? revenueCurrencyKeys[0] : 'INR'
                )}
              </div>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono mt-1">
                {overviewData?.pending_setup_fees_count ?? 0} Orgs Awaiting Payment
              </span>
            </div>

            {/* 3. Active Monthly Recurring (Sum of rates) */}
            <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-500/20 shadow-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">Active Monthly Recurring</span>
              {mrrCurrencyKeys.length > 1 ? (
                <div className="mt-1 space-y-0.5">
                  {mrrCurrencyKeys.map((cur) => (
                    <div key={cur} className="text-sm sm:text-base font-mono font-bold text-teal-700 dark:text-teal-300">
                      {formatMoney(mrrByCurrency[cur] || 0, cur)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-lg sm:text-xl font-mono font-bold text-teal-700 dark:text-teal-300 mt-1">
                  {formatMoney(
                    overviewData?.active_monthly_recurring ?? overviewData?.active_mrr_sum ?? 0,
                    mrrCurrencyKeys[0] || 'INR'
                  )}
                </div>
              )}
              <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 font-mono mt-1">Sum of Active Plan Rates</span>
            </div>

            {/* 4. Orgs on ₹0 Maintenance */}
            <div className="p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-500/20 shadow-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">Orgs on ₹0 Maintenance</span>
              <div className="text-lg sm:text-xl font-mono font-bold text-sky-700 dark:text-sky-300 mt-1">
                {overviewData?.zero_maintenance_orgs_count ?? overviewData?.zero_maintenance_orgs ?? 0}
              </div>
              <span className="text-[10px] text-sky-600/80 dark:text-sky-400/80 font-mono mt-1">Promotional / Free Tiers</span>
            </div>

            {/* 5. Overdue Count */}
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-500/20 shadow-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Overdue Accounts</span>
              <div className="text-lg sm:text-xl font-mono font-bold text-rose-700 dark:text-rose-300 mt-1">
                {overviewData?.overdue_count ?? 0}
              </div>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-mono mt-1">Past Due Cycles</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations by name or company code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadOverview()}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-48 shrink-0">
                <SimpleSelectDropdown
                  options={statusDropdownOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter Status"
                />
              </div>
              <div className="w-48 shrink-0">
                <SimpleSelectDropdown
                  options={industryDropdownOptions}
                  value={industryFilter}
                  onChange={setIndustryFilter}
                  placeholder="Filter Industry"
                />
              </div>
            </div>
          </div>

          {/* Organizations Billing Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden shadow-card">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed min-w-[860px]">
                <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="w-[24%] px-4 py-3 text-center">Org</th>
                    <th className="w-[18%] px-3 py-3 text-center">Setup Fee Status</th>
                    <th className="w-[18%] px-3 py-3 text-center">Current Monthly Rate</th>
                    <th className="w-[14%] px-3 py-3 text-center">Last Payment Date</th>
                    <th className="w-[13%] px-3 py-3 text-center">This Month's Status</th>
                    <th className="w-[13%] px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(!overviewData?.organizations || overviewData.organizations.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                        <IndianRupee className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                        <p className="font-semibold text-sm">No billing accounts found matching criteria</p>
                        <p className="text-xs text-slate-400 mt-1">
                          When organizations are provisioned, their commercial accounts appear here automatically.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrgs.map((org: any) => {
                      const isOverdue = org.this_month_status === 'Overdue';
                      const isPaid = org.this_month_status === 'Paid';
                      const isWaived = org.this_month_status === 'Waived';
                      const isPending = org.this_month_status === 'Pending';

                      return (
                        <tr
                          key={org.tenant_id}
                          onClick={() => handleSelectOrgForDrilldown(org.tenant_id)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                        >
                          {/* 1. Org Name & Avatar — Left-aligned */}
                          <td className="h-[52px] py-0 px-4 align-middle text-left whitespace-nowrap">
                            <div className="h-full flex items-center justify-start gap-2.5 min-w-0" title={org.tenant_name}>
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20 shrink-0">
                                {(org.tenant_name || 'O').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                  {org.tenant_name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                  <span className="font-mono text-slate-500 dark:text-slate-400">{org.company_code || 'N/A'}</span>
                                  <span>&bull;</span>
                                  <span className="truncate">{org.industry || 'General'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Setup Fee Status — Centered */}
                          <td className="h-[52px] py-0 px-3 align-middle text-center whitespace-nowrap">
                            <div className="h-full flex items-center justify-center gap-1.5 min-w-0">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  org.setup_fee_status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                                }`}
                              >
                                {org.setup_fee_status?.toUpperCase()}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {formatMoney(org.setup_fee_amount || org.setup_fee || 0, org.currency_code || 'INR')}
                              </span>
                            </div>
                          </td>

                          {/* 3. Current Monthly Rate — Centered */}
                          <td className="h-[52px] py-0 px-3 align-middle text-center whitespace-nowrap">
                            <div className="h-full flex flex-col items-center justify-center min-w-0 font-mono">
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {formatMoney(org.current_monthly_rate || org.monthly_maintenance_fee || 0, org.currency_code || 'INR')}
                                <span className="text-[10px] font-normal text-slate-400"> / mo</span>
                              </div>
                              {Number(org.current_monthly_rate || org.monthly_maintenance_fee || 0) === 0 && (
                                <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400 font-semibold leading-tight">
                                  ₹0 Maintenance Tier
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Last Payment Date — Centered */}
                          <td className="h-[52px] py-0 px-3 align-middle text-center whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {org.last_payment_date ? new Date(org.last_payment_date).toLocaleDateString() : 'None Recorded'}
                          </td>

                          {/* 5. This Month's Status — Centered */}
                          <td className="h-[52px] py-0 px-3 align-middle text-center whitespace-nowrap">
                            <div className="h-full flex items-center justify-center min-w-0">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                                    : isWaived
                                    ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/25'
                                    : isOverdue
                                    ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                                }`}
                              >
                                {(org.this_month_status || 'Pending').toUpperCase()}
                              </span>
                            </div>
                          </td>

                          {/* 6. Actions — Centered, inward, matching other pages */}
                          <td className="h-[52px] py-0 px-3 align-middle text-center whitespace-nowrap">
                            <div className="h-full flex items-center justify-center min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrgForDrilldown(org.tenant_id);
                                }}
                                className="h-7.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/10 transition-colors border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-subtle shrink-0"
                                title="View Billing Account & Ledger"
                              >
                                <span>Drill-Down</span>
                                <span className="text-teal-600 dark:text-teal-400 font-bold">&rarr;</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Shared Reusable Pagination Bar */}
            <Pagination
              currentPage={orgCurrentPage}
              totalItems={rawOrgs.length}
              pageSize={orgPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setOrgCurrentPage}
              onPageSizeChange={setOrgPageSize}
              itemLabel="billing accounts"
            />
          </div>
        </div>
      )}

      {/* VIEW B: ORG-LEVEL BILLING DRILL-DOWN */}
      {selectedOrgId && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
          {isLoadingDetail ? (
            /* SKELETON LOADING STATE */
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="h-20 bg-white dark:bg-[#131924] rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 animate-pulse h-60"></div>
                <div className="p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 animate-pulse h-60"></div>
              </div>
              <div className="p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 animate-pulse h-64"></div>
            </div>
          ) : loadDetailError || !orgBillingDetail ? (
            /* ERROR / NOT FOUND STATE */
            <div className="p-8 rounded-xl bg-white dark:bg-[#131924] border border-amber-200 dark:border-amber-900/40 shadow-card text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Organization Billing Profile Not Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {loadDetailError || `Could not find an active billing subscription for organization ID "${selectedOrgId}".`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToOverview}
                className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-subtle transition-colors"
              >
                &larr; Return to Billing Overview
              </button>
            </div>
          ) : (
            /* DRILL-DOWN COMPLETE VIEW */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Org Context Header */}
              <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-base border border-teal-500/20 shrink-0">
                    {(orgBillingDetail.tenant_name || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {orgBillingDetail.tenant_name}
                      </h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                        {orgBillingDetail.unique_code}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        orgBillingDetail.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      }`}>
                        {orgBillingDetail.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{orgBillingDetail.industry}</span>
                      <span>&bull;</span>
                      <span>{drillCurrencyCode} ({drillCurrencySymbol}) Commercial Agreement</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>&larr; Back to Overview</span>
                  </button>
                </div>
              </div>

              {/* Cards Grid: Setup Fee Card & Current Monthly Rate Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Setup Fee Card */}
                <div className="p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-teal-500" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          One-Time Platform Setup Fee
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {orgBillingDetail.setup_fee?.status === 'Paid' ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadSetupFeePdf(orgBillingDetail.setup_fee.id, orgBillingDetail.setup_fee.invoice_number)}
                            disabled={downloadingRecordId === 'setup_fee'}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors"
                            title="Download Sequential GST Tax Invoice PDF"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingRecordId === 'setup_fee' ? 'animate-bounce' : ''}`} />
                            <span>Download Tax Invoice (PDF)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenMarkPaid({
                              id: orgBillingDetail.setup_fee.id,
                              type: 'setup_fee',
                              title: 'One-Time Platform Setup Fee',
                              defaultAmount: Number(orgBillingDetail.setup_fee.amount || 0),
                            })}
                            className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-subtle transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-4 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white">
                        {formatMoney(orgBillingDetail.setup_fee?.amount || 0, drillCurrencyCode)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                          orgBillingDetail.setup_fee?.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                        }`}
                      >
                        {(orgBillingDetail.setup_fee?.status || 'Pending').toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex justify-between">
                        <span>Payment Mode:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {orgBillingDetail.setup_fee?.payment_mode || 'Pending Settlement'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date Settled:</span>
                        <span className="font-mono">
                          {orgBillingDetail.setup_fee?.date_paid
                            ? new Date(orgBillingDetail.setup_fee.date_paid).toLocaleString()
                            : 'Pending Confirmation'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recorded By:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {orgBillingDetail.setup_fee?.recorded_by || 'Super Administrator'}
                        </span>
                      </div>
                      {orgBillingDetail.setup_fee?.invoice_number && (
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>GST Tax Invoice #:</span>
                          <span className="text-teal-600 dark:text-teal-400 font-bold">
                            {orgBillingDetail.setup_fee.invoice_number}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Current Monthly Rate Card & Rate Change History */}
                <div className="p-5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-500" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          Current Monthly Rate
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenUpdateRate}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Update Rate</span>
                      </button>
                    </div>

                    <div className="py-4 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-teal-700 dark:text-teal-400">
                        {formatMoney(orgBillingDetail.current_plan?.current_rate || 0, drillCurrencyCode)}{' '}
                        <span className="text-sm font-normal text-slate-400">/ mo</span>
                      </span>
                      {Number(orgBillingDetail.current_plan?.current_rate || 0) === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                          WAIVED ({drillCurrencySymbol}0 TIER)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
                          ACTIVE MRR
                        </span>
                      )}
                    </div>

                    {/* Rate Change History List */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Rate Change History ({orgBillingDetail.rate_history?.length || 0} entries)
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {(!orgBillingDetail.rate_history || orgBillingDetail.rate_history.length === 0) ? (
                          <div className="text-slate-400 text-[11px]">No rate adjustments recorded.</div>
                        ) : (
                          orgBillingDetail.rate_history.map((plan: any, idx: number) => (
                            <div
                              key={plan.id || idx}
                              className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {formatMoney(plan.current_rate || 0, drillCurrencyCode)}/mo
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  Effective from {new Date(plan.effective_from).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 text-right truncate max-w-[160px]" title={plan.reason || 'Rate adjustment'}>
                                {plan.reason || (plan.changed_by ? `by ${plan.changed_by}` : 'Agreed rate')}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Transaction Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden shadow-card">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Full Transaction Ledger (Setup Fee + Monthly Cycles)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    All amounts in {drillCurrencyCode} ({drillCurrencySymbol})
                  </span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed min-w-[900px]">
                    <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="w-[20%] px-4 py-3">Item / Cycle</th>
                        <th className="w-[12%] px-4 py-3">Amount</th>
                        <th className="w-[10%] px-4 py-3">Status</th>
                        <th className="w-[13%] px-4 py-3">Payment Mode</th>
                        <th className="w-[13%] px-4 py-3">Date</th>
                        <th className="w-[14%] px-4 py-3">Recorded By</th>
                        <th className="w-[18%] px-4 py-3 text-right">GST Invoice & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(!orgBillingDetail.transactions || orgBillingDetail.transactions.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                            <p className="font-semibold text-xs">No transactions recorded yet</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedTransactions.map((tx: any) => {
                          const isPaid = tx.status === 'Paid';
                          const isWaived = tx.status === 'Waived';
                          const isPending = tx.status === 'Pending';
                          const isSetup = tx.item_type === 'setup_fee';

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                              {/* Cycle / Item Name */}
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-1.5">
                                  <span>{tx.cycle_month}</span>
                                  {isSetup && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
                                      SETUP
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Amount in org currency */}
                              <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                {formatMoney(tx.amount || 0, drillCurrencyCode)}
                              </td>

                              {/* Status Badge */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                                      : isWaived
                                      ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/25'
                                      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                                  }`}
                                >
                                  {tx.status?.toUpperCase()}
                                </span>
                              </td>

                              {/* Payment Mode */}
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                {tx.payment_mode || '-'}
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                {tx.date_paid
                                  ? new Date(tx.date_paid).toLocaleDateString()
                                  : (tx.date_recorded ? new Date(tx.date_recorded).toLocaleDateString() : '-')}
                              </td>

                              {/* Recorded By */}
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[130px]" title={tx.recorded_by || '-'}>
                                {tx.recorded_by || '-'}
                              </td>

                              {/* GST Invoice & Actions */}
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {/* If Paid: Download GST Invoice link */}
                                  {isPaid && tx.invoice_number && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isSetup) {
                                          handleDownloadSetupFeePdf(tx.id, tx.invoice_number);
                                        } else {
                                          handleDownloadCyclePdf(tx.id, tx.invoice_number);
                                        }
                                      }}
                                      disabled={downloadingRecordId === tx.id || downloadingRecordId === 'setup_fee'}
                                      className="px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 text-[10px] font-bold flex items-center gap-1 hover:bg-teal-100 transition-colors"
                                      title={`Download ${tx.invoice_number}`}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Invoice PDF</span>
                                    </button>
                                  )}

                                  {/* If Pending: Mark as Paid button */}
                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMarkPaid({
                                        id: tx.id,
                                        type: isSetup ? 'setup_fee' : 'monthly_cycle',
                                        title: tx.cycle_month,
                                        defaultAmount: Number(tx.amount || 0),
                                      })}
                                      className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] transition-colors"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}

                                  {/* If Pending and Monthly Cycle: Mark as Waived button */}
                                  {isPending && !isSetup && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMarkWaived({
                                        id: tx.id,
                                        title: tx.cycle_month,
                                      })}
                                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-bold text-[10px] border border-slate-200 dark:border-slate-700 transition-colors"
                                    >
                                      Waive
                                    </button>
                                  )}

                                  {/* If Waived: Audit notice */}
                                  {isWaived && (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Waived (Audit Only)
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Shared Reusable Pagination Bar */}
                <Pagination
                  currentPage={txCurrentPage}
                  totalItems={rawTransactions.length}
                  pageSize={txPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                  onPageChange={setTxCurrentPage}
                  onPageSizeChange={setTxPageSize}
                  itemLabel="transactions"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: MARK AS PAID MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isMarkPaidModalOpen && markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-[#F8FAFC] dark:bg-[#0C1017]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mark Payment as Paid
                </h3>
              </div>
              <button
                onClick={() => setIsMarkPaidModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmMarkPaid} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Target Item:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {markPaidTarget.title}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmed Amount ({drillCurrencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{drillCurrencySymbol}</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={confirmedAmount}
                    onChange={(e) => setConfirmedAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Pre-filled with agreed amount; editable for partial adjustments.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date Received *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDateReceived}
                  onChange={(e) => setPaymentDateReceived(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode *
                </label>
                <SimpleSelectDropdown
                  options={PAYMENT_MODE_OPTIONS}
                  value={selectedPaymentMode}
                  onChange={setSelectedPaymentMode}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Notes / Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional bank transfer reference or reconciliation note..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMarkPaidModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMarkPaid}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white flex items-center gap-1.5 shadow-subtle disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingMarkPaid ? 'Generating Invoice...' : 'Confirm & Generate Invoice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: MARK AS WAIVED MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isMarkWaivedModalOpen && waiveTargetCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-[#F8FAFC] dark:bg-[#0C1017]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mark Monthly Cycle as Waived
                </h3>
              </div>
              <button
                onClick={() => setIsMarkWaivedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmMarkWaived} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300">
                <span>Target Cycle: </span>
                <strong className="font-mono">{waiveTargetCycle.title}</strong>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Per statutory compliance, waived cycles generate NO tax invoice. The cycle row and audit log serve as the sole legal audit trail.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Waiver *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Promotional launch waiver, quarterly negotiated SLA discount, or beta pilot agreement..."
                  value={waiveReasonNote}
                  onChange={(e) => setWaiveReasonNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMarkWaivedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWaive}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-subtle disabled:opacity-50 transition-colors"
                >
                  <span>{isSubmittingWaive ? 'Recording Waiver...' : 'Confirm Waiver'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: UPDATE MAINTENANCE RATE MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isUpdateRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-[#F8FAFC] dark:bg-[#0C1017]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Monthly Maintenance Rate
                </h3>
              </div>
              <button
                onClick={() => setIsUpdateRateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpdateRate} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Every rate adjustment creates a new historical record in <code className="font-mono text-teal-600 dark:text-teal-400">org_maintenance_plan</code> without overwriting past rates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Agreed Monthly Rate ({drillCurrencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{drillCurrencySymbol}</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={newMaintenanceRate}
                    onChange={(e) => setNewMaintenanceRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Can be 0 for promotional/free SLA periods.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Effective From Date *
                </label>
                <input
                  type="date"
                  required
                  value={rateEffectiveDate}
                  onChange={(e) => setRateEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Rate Adjustment
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Storage capacity tier upgrade, contracted annual review, SLA enhancement..."
                  value={rateChangeReason}
                  onChange={(e) => setRateChangeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdateRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRateUpdate}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white flex items-center gap-1.5 shadow-subtle disabled:opacity-50 transition-colors"
                >
                  <span>{isSubmittingRateUpdate ? 'Saving Plan...' : 'Append New Plan Row'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
