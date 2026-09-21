import React, { useState, useEffect } from 'react';
import {
  IconBuilding as Building2,
  IconPlus as Plus,
  IconSearch as Search,
  IconCheck as CheckCircle2,
  IconX as XCircle,
  IconBarChart3 as BarChart3,
  IconEdit as Edit,
  IconPower as Power,
  IconPowerOff as PowerOff,
  IconBan as Ban,
  IconShieldCheck as Shield,
  IconSend as Send,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconRefreshCw as RefreshCw,
  IconSlidersHorizontal as Sliders,
  IconFileText as FileText,
  IconDownload as Download,
  IconAlertCircle as AlertCircle,
  IconPackage as Package,
  IconUsers as Users,
  IconMapPin as MapPin,
  IconIndianRupee as IndianRupee,
  IconLayers as Layers,
  IconKey as Sparkles,
  IconKey as Key,
  IconLock as Lock,
  IconClock as Clock,
  IconAlertTriangle as AlertTriangle,
  IconArchive as Archive,
  IconMessageCircle as MessageCircle,
  IconCalculator as Calculator,
  IconPhone as Phone,
  IconMail as Mail,
} from '../components/icons';
import { api } from '../services/api';
import { PageMeta } from '../components/common/PageMeta';
import { Pagination } from '../components/common/Pagination';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { INDUSTRIES_LIST, AVAILABLE_MODULES, INDIAN_STATES_LIST, SUPPORTED_COUNTRIES, US_STATES_LIST, COUNTRY_CURRENCY_MAP, CURRENCY_SYMBOLS, currencySymbolFor, getTaxRegimeForCountry } from '../data/platformConstants';
import { useAuth } from '../context/AuthContext';
export { INDUSTRIES_LIST, AVAILABLE_MODULES };

export const SuperAdminConsole: React.FC<{
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}> = ({ onNavigate }) => {
  const { switchTenant } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCompanies, setIsRefreshingCompanies] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination State for Companies Directory (20 items/page default)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedIndustry, statusFilter, pageSize]);

  // Prospective Leads State
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [activeLeadForProvisioning, setActiveLeadForProvisioning] = useState<any | null>(null);
  const [hoveredLead, setHoveredLead] = useState<{ lead: any; rect: DOMRect } | null>(null);

  // Deactivate/Activate Organization Modal State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [companyToDeactivate, setCompanyToDeactivate] = useState<any | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Modal States
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<any | null>(null);
  const [hoveredCompany, setHoveredCompany] = useState<{ company: any; rect: DOMRect } | null>(null);

  const [activeCompanyForAnalytics, setActiveCompanyForAnalytics] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [platformReport, setPlatformReport] = useState<any>(null);
  const [companyToEdit, setCompanyToEdit] = useState<any>(null);

  // Provision Form State
  const [provCompanyName, setProvCompanyName] = useState('');
  const [provCompanyCode, setProvCompanyCode] = useState('');
  const [provIndustry, setProvIndustry] = useState(INDUSTRIES_LIST[0]);
  const [provLocation, setProvLocation] = useState('');
  const [provCountry, setProvCountry] = useState('IN');
  const [provEnableTax, setProvEnableTax] = useState(true);
  const [provState, setProvState] = useState('');
  const [provPincode, setProvPincode] = useState('');
  const [provSetupFee, setProvSetupFee] = useState('25000');
  const [provMonthlyRate, setProvMonthlyRate] = useState('4500');
  const [provAdminName, setProvAdminName] = useState('');
  const [provAdminEmail, setProvAdminEmail] = useState('');
  const [provAdminPassword, setProvAdminPassword] = useState('');
  const [provShowPassword, setProvShowPassword] = useState(false);
  const [provModules, setProvModules] = useState<string[]>([
    'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
  ]);
  const [provSendEmail, setProvSendEmail] = useState(true);
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  // Security Purge Requests State
  const [purgeRequests, setPurgeRequests] = useState<any[]>([]);
  const [isLoadingPurgeRequests, setIsLoadingPurgeRequests] = useState(false);
  const [processingPurgeId, setProcessingPurgeId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadPurgeRequests = async () => {
    setIsLoadingPurgeRequests(true);
    try {
      const data = await api.getLedgerPurgeRequests();
      if (data) {
        setPurgeRequests(data);
      }
    } catch (err) {
      console.warn('Failed to load ledger purge requests:', err);
    } finally {
      setIsLoadingPurgeRequests(false);
    }
  };

  const handleApprovePurge = async (reqId: string) => {
    setProcessingPurgeId(reqId);
    try {
      await api.approveLedgerPurge(reqId);
      showToast('Movement Ledger purge approved and executed. Audit record preserved.', 'success');
      loadPurgeRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve purge request', 'error');
    } finally {
      setProcessingPurgeId(null);
    }
  };

  const handleRejectPurge = async (reqId: string) => {
    const reason = window.prompt('Enter reason for rejecting purge request:', 'Rejected by Super Administrator');
    if (reason === null) return;
    setProcessingPurgeId(reqId);
    try {
      await api.rejectLedgerPurge(reqId, reason);
      showToast('Purge request rejected.', 'success');
      loadPurgeRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject purge request', 'error');
    } finally {
      setProcessingPurgeId(null);
    }
  };

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCompanies(
        searchTerm || undefined,
        selectedIndustry !== 'all' ? selectedIndustry : undefined
      );
      if (data) {
        setCompanies(data);
      }
    } catch (err: any) {
      showToast('Failed to load companies list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCompanies = async () => {
    setIsRefreshingCompanies(true);
    const startTime = Date.now();
    try {
      await loadCompanies();
    } finally {
      const elapsed = Date.now() - startTime;
      const minSpinMs = 700;
      if (elapsed < minSpinMs) {
        setTimeout(() => setIsRefreshingCompanies(false), minSpinMs - elapsed);
      } else {
        setIsRefreshingCompanies(false);
      }
    }
  };

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const data = await api.getLeads(leadStatusFilter !== 'all' ? leadStatusFilter : undefined);
      if (data) {
        setLeads(data);
      }
    } catch (err) {
      console.warn('Failed to load leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadPurgeRequests();
    loadLeads();
  }, [selectedIndustry, leadStatusFilter]);

  useEffect(() => {
    const handleScroll = () => {
      if (hoveredCompany) setHoveredCompany(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [hoveredCompany]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCompanies();
  };

  const handleOpenDeactivateConfirm = (company: any) => {
    setCompanyToDeactivate(company);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivateToggle = async () => {
    if (!companyToDeactivate) return;
    setIsDeactivating(true);
    try {
      const willDeactivate = companyToDeactivate.is_active && !companyToDeactivate.is_archived;
      const res = await api.archiveCompany(companyToDeactivate.id, willDeactivate);
      showToast(res.message || (willDeactivate ? `Company '${companyToDeactivate.name}' deactivated. Platform access suspended.` : `Company '${companyToDeactivate.name}' activated. Platform access restored.`));
      setIsDeactivateModalOpen(false);
      setCompanyToDeactivate(null);
      loadCompanies();
    } catch (err: any) {
      showToast(err.message || 'Failed to update organization status', 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      await api.updateLeadStatus(leadId, status);
      showToast(`Lead status updated to '${status}'.`);
      loadLeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to update lead status', 'error');
    }
  };

  const handleProvisionFromLead = (lead: any) => {
    setActiveLeadForProvisioning(lead);
    setProvCompanyName(lead.company_name || '');
    setProvCompanyCode(lead.company_code || '');
    setProvIndustry(INDUSTRIES_LIST.includes(lead.industry) ? lead.industry : INDUSTRIES_LIST[0]);
    setProvLocation(lead.location || 'Headquarters');
    let inferredCountry = 'IN';
    if (lead.country_code && SUPPORTED_COUNTRIES.some((c) => c.code === lead.country_code)) {
      inferredCountry = lead.country_code;
    } else if (lead.notes?.includes('[Currency: USD]') || US_STATES_LIST.some((s) => s.name.toLowerCase() === (lead.state || '').toLowerCase() || s.code.toLowerCase() === (lead.state || '').toLowerCase())) {
      inferredCountry = 'US';
    } else if (SUPPORTED_COUNTRIES.some((c) => c.name.toLowerCase() === (lead.state || '').toLowerCase() || c.code.toLowerCase() === (lead.state || '').toLowerCase())) {
      const match = SUPPORTED_COUNTRIES.find((c) => c.name.toLowerCase() === (lead.state || '').toLowerCase() || c.code.toLowerCase() === (lead.state || '').toLowerCase());
      if (match) inferredCountry = match.code;
    } else if (lead.notes?.includes('[Currency: EUR]')) {
      inferredCountry = 'DE';
    }
    setProvCountry(inferredCountry);
    setProvEnableTax(lead.tax_engine !== 'NONE');
    setProvState(lead.state || '');
    setProvPincode(lead.pincode || '');
    setProvSetupFee(lead.quoted_amount ? String(lead.quoted_amount) : '25000');
    setProvMonthlyRate('4500');
    setProvAdminName(lead.contact_name || '');
    setProvAdminEmail(lead.email || '');
    setProvModules(lead.selected_modules && lead.selected_modules.length > 0 ? lead.selected_modules : [
      'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
    ]);
    generateRandomPassword();
    setProvSendEmail(true);
    setIsProvisionModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setProvAdminPassword(pwd);
    setProvShowPassword(true);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provCompanyName.trim() || !provAdminName.trim() || !provAdminEmail.trim() || !provAdminPassword.trim()) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const setupFeeNum = parseFloat(provSetupFee);
    const monthlyRateNum = parseFloat(provMonthlyRate);
    if (isNaN(setupFeeNum) || setupFeeNum < 0) {
      showToast('Please enter a valid non-negative Setup Fee amount.', 'error');
      return;
    }
    if (isNaN(monthlyRateNum) || monthlyRateNum < 0) {
      showToast(`Please enter a valid non-negative Monthly Maintenance Rate (can be ${provCurrencySymbol}0).`, 'error');
      return;
    }
    if (provCountry === 'US' && !provState.trim()) {
      showToast('Please select a US state before provisioning.', 'error');
      return;
    }

    setIsSubmittingProvision(true);
    try {
      await api.provisionCompany({
        company_name: provCompanyName.trim(),
        company_code: provCompanyCode.trim() || undefined,
        unique_code: provCompanyCode.trim() || undefined,
        industry: provIndustry,
        location: provLocation.trim() || 'Headquarters',
        state: provShowState && provState.trim() ? provState.trim() : undefined,
        pincode: provPincode.trim() || undefined,
        country_code: provCountry,
        tax_engine: provEnableTax ? provDerivedTaxEngine : 'NONE',
        setup_fee: setupFeeNum,
        monthly_maintenance_fee: monthlyRateNum,
        admin_full_name: provAdminName.trim(),
        admin_email: provAdminEmail.trim().toLowerCase(),
        admin_password: provAdminPassword.trim(),
        enabled_modules: provModules,
        send_email: provSendEmail,
      });

      if (activeLeadForProvisioning) {
        try {
          await api.updateLeadStatus(activeLeadForProvisioning.id, 'converted');
        } catch (e) {
          console.warn('Could not update lead status to converted:', e);
        }
        setActiveLeadForProvisioning(null);
        loadLeads();
      }

      showToast(`Company '${provCompanyName}' provisioned! Commercial subscription initialized.`);
      setIsProvisionModalOpen(false);
      resetProvisionForm();
      loadCompanies();
    } catch (err: any) {
      showToast(err.message || 'Failed to provision company.', 'error');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  const resetProvisionForm = () => {
    setActiveLeadForProvisioning(null);
    setProvCompanyName('');
    setProvCompanyCode('');
    setProvIndustry(INDUSTRIES_LIST[0]);
    setProvLocation('');
    setProvCountry('IN');
    setProvEnableTax(true);
    setProvState('');
    setProvPincode('');
    setProvSetupFee('25000');
    setProvMonthlyRate('4500');
    setProvAdminName('');
    setProvAdminEmail('');
    setProvAdminPassword('');
    setProvModules(['products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team']);
    setProvSendEmail(true);
  };

  const handleToggleStatus = async (company: any) => {
    try {
      const res = await api.toggleCompanyStatus(company.id);
      if (res && res.success) {
        showToast(res.message);
        loadCompanies();
      }
    } catch (err: any) {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleOpenDetail = (company: any) => {
    setSelectedCompanyForDetail(company);
    setIsDetailModalOpen(true);
  };

  const handleOpenAnalytics = async (company: any) => {
    setActiveCompanyForAnalytics(company);
    setIsAnalyticsModalOpen(true);
    setAnalyticsData(null);
    try {
      const data = await api.getCompanyAnalytics(company.id);
      setAnalyticsData(data);
    } catch (err: any) {
      showToast('Failed to fetch company analytics', 'error');
    }
  };

  const handleOpenEdit = (company: any) => {
    setCompanyToEdit({
      ...company,
      unique_code: company.unique_code || company.company_code || '',
      enabled_modules: company.enabled_modules || [],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyToEdit) return;
    try {
      await api.updateCompany(companyToEdit.id, {
        name: companyToEdit.name,
        company_code: companyToEdit.unique_code || companyToEdit.company_code,
        unique_code: companyToEdit.unique_code || companyToEdit.company_code,
        industry: companyToEdit.industry,
        location: companyToEdit.location,
        enabled_modules: companyToEdit.enabled_modules,
        is_active: companyToEdit.is_active,
      });
      showToast(`Company '${companyToEdit.name}' updated successfully.`);
      setIsEditModalOpen(false);
      loadCompanies();
    } catch (err: any) {
      showToast('Failed to update company.', 'error');
    }
  };

  const handleOpenReport = async () => {
    setIsReportModalOpen(true);
    try {
      const data = await api.getPlatformReport();
      setPlatformReport(data);
    } catch (err) {
      showToast('Failed to generate platform report', 'error');
    }
  };

  const exportReportCSV = () => {
    if (!platformReport || !platformReport.companies) return;
    const headers = ['Company ID', 'Company Name', 'Industry', 'Location', 'Status', 'Created At'];
    const rows = platformReport.companies.map((c: any) => [
      c.id,
      `"${c.name}"`,
      `"${c.industry}"`,
      `"${c.location}"`,
      c.is_active ? 'Active' : 'Deactivated',
      c.created_at,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Invenza_Platform_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleModuleSelection = (modId: string) => {
    setProvModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const toggleEditModuleSelection = (modId: string) => {
    if (!companyToEdit) return;
    const current = companyToEdit.enabled_modules || [];
    const updated = current.includes(modId)
      ? current.filter((m: string) => m !== modId)
      : [...current, modId];
    setCompanyToEdit({ ...companyToEdit, enabled_modules: updated });
  };

  // KPIs
  const totalCompaniesCount = companies.length;
  const activeCount = companies.filter((c) => c.is_active && !c.is_archived).length;
  const deactivatedCount = companies.filter((c) => !c.is_active || c.is_archived).length;
  const totalIndustriesCount = new Set(companies.map((c) => c.industry)).size;
  const totalProductsAcross = companies.reduce((acc, c) => acc + (c.product_count || 0), 0);
  const pendingLeadsCount = leads.filter((l) => l.status === 'pending').length;

  const displayedCompanies = companies.filter((c) => {
    if (statusFilter === 'active') return c.is_active && !c.is_archived;
    if (statusFilter === 'deactivated') return !c.is_active || c.is_archived;
    return true;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCompanies = displayedCompanies.slice(startIndex, startIndex + pageSize);

  const industryFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Industries' },
    ...INDUSTRIES_LIST.map((ind) => ({ value: ind, label: ind })),
  ];

  const statusFilterOptions: DropdownOption[] = [
    { value: 'all', label: `All Status (${companies.length})` },
    { value: 'active', label: `Active Only (${activeCount})` },
    { value: 'deactivated', label: `Deactivated Only (${deactivatedCount})` },
  ];

  const leadFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Inquiries' },
    { value: 'pending', label: 'Pending Action' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'negotiating', label: 'Negotiating Offline' },
    { value: 'converted', label: 'Converted to Tenant' },
    { value: 'declined', label: 'Declined' },
  ];

  const handleProvCountryChange = (code: string) => {
    setProvCountry(code);
    setProvState('');
  };

  const provCountryName = SUPPORTED_COUNTRIES.find((c) => c.code === provCountry)?.name || provCountry;
  const provDerivedCurrency = COUNTRY_CURRENCY_MAP[provCountry] || 'INR';
  const provCurrencySymbol = CURRENCY_SYMBOLS[provDerivedCurrency] || '₹';
  const provStateList = provCountry === 'US' ? US_STATES_LIST : INDIAN_STATES_LIST;
  const provShowState = provCountry === 'IN' || provCountry === 'US';
  const provDerivedTaxEngine = getTaxRegimeForCountry(provCountry);
  const provTaxEngineDisplay =
    provDerivedTaxEngine === 'GST'
      ? 'GST (India) — Dual CGST/SGST & IGST Engine'
      : provDerivedTaxEngine === 'SALES_TAX'
      ? 'Sales Tax (USA) — Nexus & State Rate Engine'
      : 'VAT (EU) — Statutory Standard VAT Engine';

  return (
    <div className="space-y-4 sm:space-y-4.5 animate-in fade-in duration-200 pb-2">
      <PageMeta
        title="Super Admin Tenant Console | Invenza Platform"
        description="Master administration console for cross-company provisioning, industry module toggles, and tenant lifecycle oversight."
        canonicalPath="/companies"
      />
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-in slide-in-from-top duration-200 ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/90 dark:border-emerald-500/40 dark:text-emerald-300 backdrop-blur-xl'
            : 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/90 dark:border-rose-500/40 dark:text-rose-300 backdrop-blur-xl'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner - Compact, Clean, Architectural Surface */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-teal-600 dark:text-teal-400 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Master Super Administrator Core</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Enterprise Company & Tenant Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Provision dedicated organizations by industry, manage tenant lifecycles, inspect live cross-company analytics, and dispatch admin credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleOpenReport}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
          >
            <FileText className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
            <span>Platform Report</span>
          </button>
          <button
            type="button"
            onClick={() => {
              generateRandomPassword();
              setIsProvisionModalOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-subtle flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision New Company</span>
          </button>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="space-y-3.5 sm:space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Total Companies</span>
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">{totalCompaniesCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Global enterprise tenants</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Active Organizations</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Power className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{totalCompaniesCount - activeCount} inactive accounts</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Deactivated Organizations</span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <PowerOff className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">{deactivatedCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Access suspended & blocked</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Platform SKUs</span>
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">{totalProductsAcross}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Cross-tenant inventory items</div>
            </div>
          </div>

          {/* Action Filters Bar — Responsive Alignment */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card relative z-20">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search company, unique code, or location..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </form>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 sm:w-48 sm:flex-initial min-w-[130px]">
                <SimpleSelectDropdown
                  options={industryFilterOptions}
                  value={selectedIndustry}
                  onChange={setSelectedIndustry}
                  placeholder="All Industries"
                />
              </div>

              <div className="flex-1 sm:w-44 sm:flex-initial min-w-[120px]">
                <SimpleSelectDropdown
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val as any)}
                  placeholder="All Status"
                />
              </div>

              <button
                type="button"
                onClick={handleRefreshCompanies}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] text-slate-600 dark:text-slate-300 hover:text-teal-400 hover:border-teal-500/40 transition-colors shrink-0"
                title="Refresh Directory"
                disabled={isRefreshingCompanies}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCompanies || isLoading ? 'animate-spin text-teal-500 dark:text-teal-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Companies Directory Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131924] overflow-hidden shadow-card">
            <div className="w-full overflow-hidden">
              <table className="w-full text-left text-xs table-fixed" onMouseLeave={() => setHoveredCompany(null)}>
                <thead className="bg-[#F6F8FA] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="w-[26%] px-3 sm:px-4 py-3 text-center">Company Name</th>
                    <th className="w-[14%] px-3 sm:px-4 py-3 text-center">Unique Code</th>
                    <th className="w-[18%] px-3 sm:px-4 py-3 text-center">Industry Domain</th>
                    <th className="w-[13%] px-3 sm:px-4 py-3 text-center">Status</th>
                    <th className="w-[15%] px-3 sm:px-4 py-3 text-center">Metrics</th>
                    <th className="w-[14%] px-3 sm:px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {displayedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                        <p className="font-semibold">No companies found matching criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCompanies.map((c) => {
                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleOpenDetail(c)}
                          className="h-[52px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group/row"
                        >
                          {/* Company Name with hover popover trigger — left-aligned name */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-left whitespace-nowrap">
                            <div
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredCompany({ company: c, rect });
                              }}
                              onMouseLeave={() => setHoveredCompany(null)}
                              className="flex items-center gap-2.5 min-w-0"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20 shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate group-hover/row:text-teal-600 dark:group-hover/row:text-teal-400 transition-colors">
                                {c.name}
                              </span>
                            </div>
                          </td>

                          {/* Unique Code — only unique code without secondary tax badges */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                                <Key className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{c.unique_code || c.company_code || 'N/A'}</span>
                              </span>
                            </div>
                          </td>

                          {/* Industry Domain */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#0C1017] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-semibold text-[11px] truncate max-w-full"
                                title={c.industry}
                              >
                                <Layers className="w-3 h-3 shrink-0 text-teal-500 dark:text-teal-400" />
                                <span className="truncate">{c.industry}</span>
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                                c.is_active && !c.is_archived
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                                  : 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.is_active && !c.is_archived ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                                <span>{c.is_active && !c.is_archived ? 'ACTIVE' : 'DEACTIVATED'}</span>
                              </span>
                            </div>
                          </td>

                          {/* Metrics */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                              <span title="Products in company">
                                <strong className="text-slate-700 dark:text-slate-300 font-semibold">{c.product_count}</strong> SKUs
                              </span>
                              <span className="text-slate-400">&bull;</span>
                              <span title="Users in company">
                                <strong className="text-slate-700 dark:text-slate-300 font-semibold">{c.user_count}</strong> Users
                              </span>
                            </div>
                          </td>

                          {/* Actions — single line without wrapping, cleanly center-aligned with header */}
                          <td className="px-3 sm:px-4 py-2.5 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                              {/* Deep-link to Role Management */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigate) {
                                    onNavigate('roles', { org: c.id });
                                  } else {
                                    window.location.href = `/role-management?org=${c.id}`;
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
                                title="Manage Organization Roles & Permissions"
                              >
                                <Users className="w-3.5 h-3.5" />
                              </button>

                              {/* Deep-link to Billing */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigate) {
                                    onNavigate('billing', { org: c.id });
                                  } else {
                                    window.location.href = `/billing?org=${c.id}`;
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
                                title="Manage Organization Billing & Maintenance Fees"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                              </button>

                              {/* Deactivate/Activate Toggle */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeactivateConfirm(c)}
                                className={`p-1.5 rounded-lg transition-colors border shrink-0 ${
                                  !c.is_active || c.is_archived
                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-400 border-rose-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-500/10 border-slate-200 dark:border-slate-700'
                                }`}
                                title={!c.is_active || c.is_archived ? 'Activate Organization' : 'Deactivate Organization'}
                              >
                                {!c.is_active || c.is_archived ? (
                                  <Power className="w-3.5 h-3.5" />
                                ) : (
                                  <PowerOff className="w-3.5 h-3.5" />
                                )}
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

            {/* Pagination Bar */}
            <Pagination
              currentPage={currentPage}
              totalItems={displayedCompanies.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="companies"
            />

            {/* Floating Hover Popover for Organization Details */}
            {hoveredCompany && (
              <div
                style={{
                  position: 'fixed',
                  left: Math.max(16, Math.min(hoveredCompany.rect.left, window.innerWidth - 340)),
                  ...(hoveredCompany.rect.top < 260
                    ? { top: hoveredCompany.rect.bottom + 8 }
                    : { bottom: window.innerHeight - hoveredCompany.rect.top + 8 }),
                }}
                className="z-[100] w-80 rounded-xl bg-white dark:bg-[#111723] text-slate-900 dark:text-white p-3.5 text-xs shadow-2xl border border-slate-200 dark:border-slate-700/80 ring-1 ring-black/5 dark:ring-white/10 pointer-events-none transition-all flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none"
              >
                {/* Organization Identity Header - Company Name Only */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20 shrink-0">
                    {hoveredCompany.company.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-xs leading-snug break-words">
                      {hoveredCompany.company.name}
                    </div>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Code: <strong className="text-teal-600 dark:text-teal-400">{hoveredCompany.company.unique_code || hoveredCompany.company.company_code || 'N/A'}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {hoveredCompany.company.industry}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      hoveredCompany.company.is_active && !hoveredCompany.company.is_archived
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {hoveredCompany.company.is_active && !hoveredCompany.company.is_archived ? 'ACTIVE' : 'DEACTIVATED'}
                  </span>
                </div>

                {/* Vital Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0C1017] p-2 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Products / SKUs</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{hoveredCompany.company.product_count ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-[#0C1017] p-2 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Active Staff</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{hoveredCompany.company.user_count ?? 0}</div>
                  </div>
                </div>

                {/* Direct Action Hint */}
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                  <span>Click row to view complete details</span>
                  <span>&rarr;</span>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* PROVISION NEW COMPANY MODAL */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header - Always visible at top */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017] z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Provision New Company & Admin</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Creates a clean-slate tenant workspace tailored to the chosen industry and sends credentials via email.
                </p>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Container with Scrollable Body */}
            <form onSubmit={handleProvisionSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
                {/* Section 1: Company Profile */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                    <span>1. Company Profile & Industry</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex BioPharma"
                        value={provCompanyName}
                        onChange={(e) => setProvCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Unique Company Code (MinIO / DB)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generated if empty (e.g. APEXBIO)"
                        value={provCompanyCode}
                        onChange={(e) => setProvCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white uppercase placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        maxLength={20}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Industry Domain *</label>
                      <SimpleSelectDropdown
                        options={INDUSTRIES_LIST.map((ind) => ({ value: ind, label: ind }))}
                        value={provIndustry}
                        onChange={setProvIndustry}
                        placeholder="Select industry domain..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">HQ / City Location *</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={provLocation}
                        onChange={(e) => setProvLocation(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Country of Registration *</label>
                      <SimpleSelectDropdown
                        options={SUPPORTED_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                        value={provCountry}
                        onChange={handleProvCountryChange}
                        placeholder="Select country..."
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Country, state &amp; currency are locked after provisioning.</p>
                    </div>

                    {provShowState && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          State {provCountry === 'US' ? '(Sales Tax Jurisdiction)' : '(GST Invoicing)'} *
                        </label>
                        <select
                          value={provState}
                          onChange={(e) => setProvState(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="">{provCountry === 'US' ? 'Select US State...' : 'Select State / UT...'}</option>
                          {provStateList.map((s) => (
                            <option key={s.code} value={s.name}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Postal Pincode (6 digits) *</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 560001"
                        value={provPincode}
                        onChange={(e) => setProvPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tax Engine (Auto-Derived)
                      </label>
                      <div className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{provTaxEngineDisplay}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Auto-derived from country &bull; locked. Toggle activation in Section 4.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Currency (Auto-Derived)</label>
                      <div className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>{provDerivedCurrency} ({provCurrencySymbol}) — auto-derived from {provCountryName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Commercial Agreement & Billing Rates (Required) */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                    <IndianRupee className="w-3.5 h-3.5 text-teal-500" />
                    <span>2. Commercial Agreement & Billing Rates (Required)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        One-Time Setup Fee ({provCurrencySymbol}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{provCurrencySymbol}</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="100"
                          placeholder="e.g. 25000"
                          value={provSetupFee}
                          onChange={(e) => setProvSetupFee(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">One-time onboarding fee. Initial status: Pending.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Initial Monthly Maintenance Rate ({provCurrencySymbol}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{provCurrencySymbol}</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="100"
                          placeholder="e.g. 4500 (enter 0 for waived/free)"
                          value={provMonthlyRate}
                          onChange={(e) => setProvMonthlyRate(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Recurring rate for monthly maintenance. Can be {provCurrencySymbol}0.</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Admin Account */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                    <span>3. Admin Account Credentials</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Connor"
                        value={provAdminName}
                        onChange={(e) => setProvAdminName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@company.com"
                        value={provAdminEmail}
                        onChange={(e) => setProvAdminEmail(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Password *</label>
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Secure Password</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={provShowPassword ? 'text' : 'password'}
                          required
                          value={provAdminPassword}
                          onChange={(e) => setProvAdminPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setProvShowPassword(!provShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {provShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Enabled Modules Checklist */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                    <span>4. Enabled Modules for this Company</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Enable Tax Calculation Toggle Card */}
                    <div
                      onClick={() => setProvEnableTax(!provEnableTax)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 col-span-1 sm:col-span-2 ${
                        provEnableTax
                          ? 'bg-teal-500/10 border-teal-500/40 text-slate-900 dark:text-white'
                          : 'bg-[#F4F5F8] dark:bg-[#0C1017] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={provEnableTax}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            <span>Enable Tax Calculation</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            provEnableTax
                              ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {provEnableTax ? `Active (${provDerivedTaxEngine})` : 'Disabled (Plain Receipts)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-1">
                          {provEnableTax
                            ? `Actively applies statutory ${provDerivedTaxEngine} calculations to sales orders and generates official tax invoices.`
                            : 'Operates as non-taxable / exempt. Sales orders bypass tax calculation and generate plain Sales Receipts only.'}
                        </div>
                      </div>
                    </div>
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = provModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModuleSelection(mod.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-teal-500/10 border-teal-500/40 text-slate-900 dark:text-white'
                              : 'bg-[#F4F5F8] dark:bg-[#0C1017] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-0"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod.label}</div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{mod.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 5: Email Dispatch Toggle */}
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-600 text-white">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Send Credentials via Email</div>
                      <div className="text-[11px] text-slate-600 dark:text-teal-300/90">
                        Dispatches welcome email with login details directly to the newly provisioned Admin.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={provSendEmail}
                    onChange={(e) => setProvSendEmail(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Footer - Always cleanly visible at bottom */}
              <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-[#0C1017] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProvision}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-subtle flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSubmittingProvision ? (
                    <span>Provisioning Organization...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Provision Company & Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORGANIZATION COMPLETE DETAIL VIEW MODAL */}
      {isDetailModalOpen && selectedCompanyForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-lg border border-teal-500/20 shadow-inner shrink-0">
                  {selectedCompanyForDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {selectedCompanyForDetail.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      selectedCompanyForDetail.is_active && !selectedCompanyForDetail.is_archived
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-sm ${selectedCompanyForDetail.is_active && !selectedCompanyForDetail.is_archived ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>{selectedCompanyForDetail.is_active && !selectedCompanyForDetail.is_archived ? 'ACTIVE' : 'DEACTIVATED'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {selectedCompanyForDetail.created_at && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Provisioned {new Date(selectedCompanyForDetail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Grid 1: Identity & Key Attributes */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Organization Identity & Parameters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Unique Code */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unique Tenant Code</div>
                      <div className="text-xs font-mono font-bold text-teal-600 dark:text-teal-300 mt-0.5">
                        {selectedCompanyForDetail.unique_code || selectedCompanyForDetail.company_code || 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">MinIO object storage root directory</div>
                    </div>
                  </div>

                  {/* Industry Domain */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Industry Domain</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedCompanyForDetail.industry || 'General Merchandise'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Operational sector classification</div>
                    </div>
                  </div>

                  {/* Location (HQ) */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Country &amp; Primary Location / HQ</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {SUPPORTED_COUNTRIES.find((c) => c.code === selectedCompanyForDetail.country_code)?.name || selectedCompanyForDetail.country_code || 'India'}
                        {selectedCompanyForDetail.location && ` \u2022 ${selectedCompanyForDetail.location}`}
                        {selectedCompanyForDetail.state && `, ${selectedCompanyForDetail.state}`}
                        {selectedCompanyForDetail.pincode && ` - ${selectedCompanyForDetail.pincode}`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Primary registered business jurisdiction</div>
                    </div>
                  </div>

                  {/* Operational Currency */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Base Valuation Currency</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300 mt-0.5">
                        {selectedCompanyForDetail.currency_code ||
                          COUNTRY_CURRENCY_MAP[selectedCompanyForDetail.country_code] ||
                          selectedCompanyForDetail.currency ||
                          'INR'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Auto-derived from country of registration &bull; locked</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Primary Admin Account Credentials */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Shield className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Primary Admin Account</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Administrator Name</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedCompanyForDetail.admin_name || 'Organization Admin'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Work Email Address</div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate font-mono">
                          {selectedCompanyForDetail.admin_email || 'admin@' + selectedCompanyForDetail.slug + '.com'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: Operational Telemetry Metrics */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Operational Telemetry & Capacity</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Catalog SKUs</div>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      {selectedCompanyForDetail.product_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Active inventory items</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tenant Users</div>
                    <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                      {selectedCompanyForDetail.user_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Registered accounts</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 text-center">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Account Status</div>
                    <div className="text-xs font-black mt-2">
                      <span className={`px-2 py-0.5 rounded-full ${
                        selectedCompanyForDetail.is_active && !selectedCompanyForDetail.is_archived
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {selectedCompanyForDetail.is_active && !selectedCompanyForDetail.is_archived ? 'Active' : 'Deactivated'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">RLS policy state</div>
                  </div>
                </div>
              </div>

              {/* Grid 4: Enabled Platform Modules */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Sliders className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Enabled Platform Modules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isModActive = (selectedCompanyForDetail.enabled_modules || [
                      'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
                    ]).includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                          isModActive
                            ? 'bg-teal-500/10 border-teal-500/30 text-slate-900 dark:text-slate-200'
                            : 'bg-[#F4F5F8] dark:bg-[#0C1017] border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isModActive ? 'bg-emerald-400' : 'bg-slate-400 dark:bg-slate-600'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{mod.label}</div>
                          <div className="text-[10px] text-slate-500 truncate">{mod.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <button
                type="button"
                onClick={() => {
                  const comp = selectedCompanyForDetail;
                  if (comp) {
                    switchTenant({
                      id: comp.id,
                      name: comp.name,
                      currency_code: comp.currency_code || comp.currency,
                      country_code: comp.country_code || comp.country,
                      state: comp.state,
                      tax_engine: comp.tax_engine,
                      tax_type: comp.tax_type,
                      tax_rate: comp.tax_rate,
                      tax_label: comp.tax_label,
                      apply_tax_to_sales_orders: comp.apply_tax_to_sales_orders,
                      enabled_modules: comp.enabled_modules,
                    });
                    setIsDetailModalOpen(false);
                    if (onNavigate) {
                      onNavigate('products');
                    }
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const comp = selectedCompanyForDetail;
                  setIsDetailModalOpen(false);
                  handleOpenAnalytics(comp);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Live Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const comp = selectedCompanyForDetail;
                  setIsDetailModalOpen(false);
                  handleOpenEdit(comp);
                }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE ANALYTICS MODAL */}
      {isAnalyticsModalOpen && activeCompanyForAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                  {activeCompanyForAnalytics.industry}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeCompanyForAnalytics.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live operational inventory metrics</p>
              </div>
              <button
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {!analyticsData ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500 dark:text-teal-400" />
                  <p className="text-xs">Fetching live metrics from database...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Inventory SKUs</div>
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">{analyticsData.total_products}</div>
                      <div className="text-[10px] text-slate-500">Active catalog items</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Total Valuation</div>
                      <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {CURRENCY_SYMBOLS[activeCompanyForAnalytics.currency || 'INR'] || '₹'}{analyticsData.total_inventory_valuation.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">Cost valuation</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Movement Transactions</div>
                      <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">{analyticsData.total_movements}</div>
                      <div className="text-[10px] text-slate-500">Immutable ledger events</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Company Users</div>
                      <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200 mt-1">{analyticsData.total_users}</div>
                      <div className="text-[10px] text-slate-500">Active staff & admins</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Account Status:</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                      analyticsData.is_active ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                      {analyticsData.is_active ? 'Active & Accessible' : 'Deactivated by Super Admin'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPANY MODAL */}
      {isEditModalOpen && companyToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Company Metadata</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyToEdit.name}
                    onChange={(e) => setCompanyToEdit({ ...companyToEdit, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Unique Code (MinIO Root Folder)
                  </label>
                  <input
                    type="text"
                    value={companyToEdit.unique_code || companyToEdit.company_code || ''}
                    onChange={(e) =>
                      setCompanyToEdit({
                        ...companyToEdit,
                        unique_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. HAPKONIC"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Industry</label>
                  <SimpleSelectDropdown
                    options={INDUSTRIES_LIST.map((ind) => ({ value: ind, label: ind }))}
                    value={companyToEdit.industry}
                    onChange={(val) => setCompanyToEdit({ ...companyToEdit, industry: val })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={companyToEdit.location || ''}
                    onChange={(e) => setCompanyToEdit({ ...companyToEdit, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax Engine Assignment
                  </label>
                  <div className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>{companyToEdit.tax_engine || 'GST'}</span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-sans font-semibold">
                      <Lock className="w-3 h-3" /> Locked post-provisioning
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Enabled Modules</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = (companyToEdit.enabled_modules || []).includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEditModuleSelection(mod.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-0"
                          />
                          <span className="truncate">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white shadow-subtle transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLATFORM REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Global Platform Executive Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aggregated cross-company statistics and tenant audit summary.</p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {!platformReport ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500 dark:text-teal-400" />
                  <p className="text-xs">Generating platform summary...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Total Tenants</div>
                      <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">{platformReport.total_companies}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Active / Inactive</div>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {platformReport.active_companies} / {platformReport.inactive_companies}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Global Products</div>
                      <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">{platformReport.total_products}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Industry Distribution:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(platformReport.industries_breakdown || {}).map(([ind, cnt]) => (
                        <span key={ind} className="px-3 py-1.5 rounded-xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          {ind}: <strong className="text-teal-600 dark:text-teal-400 font-mono">{cnt as number}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {platformReport && (
              <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
                <span className="text-[11px] text-slate-500 font-mono">
                  Format: RFC-4180 Standard CSV Export
                </span>
                <button
                  onClick={exportReportCSV}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-subtle transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEACTIVATE / ACTIVATE CONFIRMATION MODAL */}
      {isDeactivateModalOpen && companyToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${!companyToDeactivate.is_active || companyToDeactivate.is_archived ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                {!companyToDeactivate.is_active || companyToDeactivate.is_archived ? (
                  <Power className="w-6 h-6" />
                ) : (
                  <PowerOff className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {!companyToDeactivate.is_active || companyToDeactivate.is_archived ? 'Activate Organization' : 'Deactivate Organization'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{companyToDeactivate.name}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-3">
              {!companyToDeactivate.is_active || companyToDeactivate.is_archived ? (
                <p>
                  Activating this organization will re-enable full platform access. Its administrators and users will be able to log in to their workspaces immediately.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>User login will be blocked immediately</span>
                  </div>
                  <p>
                    When deactivated, no user or administrator belonging to <strong>{companyToDeactivate.name}</strong> will be able to log in. Any existing active sessions will be terminated and they will see the notice:
                  </p>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                    "Your account has been deactivated. Please contact support."
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Tenant records, SKUs, and immutable ledgers remain securely preserved. You can reactivate this organization at any time.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateModalOpen(false);
                  setCompanyToDeactivate(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeactivating}
                onClick={handleConfirmDeactivateToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  !companyToDeactivate.is_active || companyToDeactivate.is_archived
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                }`}
              >
                {isDeactivating ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    {!companyToDeactivate.is_active || companyToDeactivate.is_archived ? (
                      <Power className="w-4 h-4" />
                    ) : (
                      <PowerOff className="w-4 h-4" />
                    )}
                    <span>{!companyToDeactivate.is_active || companyToDeactivate.is_archived ? 'Confirm Activation' : 'Confirm Deactivation'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
