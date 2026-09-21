import React, { useState, useEffect } from 'react';
import {
  IconBuilding as Building2,
  IconPlus as Plus,
  IconSearch as Search,
  IconCheck as CheckCircle2,
  IconX as XCircle,
  IconBarChart3 as BarChart3,
  IconEdit as Edit,
  IconRefreshCw as RefreshCw,
  IconFileText as FileText,
  IconAlertCircle as AlertCircle,
  IconPackage as Package,
  IconUsers as Users,
  IconMapPin as MapPin,
  IconIndianRupee as IndianRupee,
  IconLayers as Layers,
  IconKey as Key,
  IconLock as Lock,
  IconClock as Clock,
  IconMessageCircle as MessageCircle,
  IconPhone as Phone,
  IconMail as Mail,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconSend as Send,
} from '../components/icons';
import { api } from '../services/api';
import { PageMeta } from '../components/common/PageMeta';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { Pagination } from '../components/common/Pagination';
import { INDUSTRIES_LIST, AVAILABLE_MODULES, INDIAN_STATES_LIST, SUPPORTED_COUNTRIES, US_STATES_LIST, COUNTRY_CURRENCY_MAP, CURRENCY_SYMBOLS, currencySymbolFor, getTaxRegimeForCountry } from '../data/platformConstants';

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  new: {
    label: 'New Inquiry',
    color: 'bg-teal-100 text-teal-950 border-teal-300 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40',
    dot: 'bg-teal-600 dark:bg-teal-400',
  },
  pending: {
    label: 'New Inquiry',
    color: 'bg-teal-100 text-teal-950 border-teal-300 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40',
    dot: 'bg-teal-600 dark:bg-teal-400',
  },
  in_discussion: {
    label: 'In Discussion',
    color: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    dot: 'bg-amber-600 dark:bg-amber-400',
  },
  quoted: {
    label: 'Quoted',
    color: 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    dot: 'bg-blue-600 dark:bg-blue-400',
  },
  converted: {
    label: 'Converted',
    color: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  rejected_lost: {
    label: 'Lost / Declined',
    color: 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
};

const MODULE_NAMES: Record<string, string> = {
  products: 'Products',
  locations: 'Locations',
  orders: 'Orders',
  transfers: 'Transfers',
  adjustments: 'Adjustments',
  ledger: 'Audit Ledger',
  reports: 'Reports',
  storage: 'Storage',
};

const getModulesList = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const getModuleLabel = (modId: string): string => {
  if (MODULE_NAMES[modId]) return MODULE_NAMES[modId];
  const modDef = AVAILABLE_MODULES.find((m) => m.id === modId);
  if (modDef) {
    return modDef.label.split('&')[0].trim();
  }
  return modId.charAt(0).toUpperCase() + modId.slice(1);
};

interface LeadsManagementProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

export const LeadsManagement: React.FC<LeadsManagementProps> = ({ onNavigate }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLeads, setIsRefreshingLeads] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail Modal State
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<any | null>(null);

  // Status & Quote Edit Modal State
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>('new');
  const [editQuotedAmount, setEditQuotedAmount] = useState<string>('0');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<any | null>(null);
  const [provCompanyName, setProvCompanyName] = useState('');
  const [provCompanyCode, setProvCompanyCode] = useState('');
  const [provIndustry, setProvIndustry] = useState(INDUSTRIES_LIST[0]);
  const [provLocation, setProvLocation] = useState('');
  const [provCountry, setProvCountry] = useState('IN');
  const [provState, setProvState] = useState('');
  const [provPincode, setProvPincode] = useState('');
  const [provTier, setProvTier] = useState('Growth Suite');
  const [provQuotedSetupFee, setProvQuotedSetupFee] = useState('0');
  const [provAdminName, setProvAdminName] = useState('');
  const [provAdminEmail, setProvAdminEmail] = useState('');
  const [provAdminPassword, setProvAdminPassword] = useState('');
  const [provShowPassword, setProvShowPassword] = useState(false);
  const [provModules, setProvModules] = useState<string[]>([
    'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
  ]);
  const [provSendEmail, setProvSendEmail] = useState(true);
  const [provEnableTax, setProvEnableTax] = useState(true);
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLeads();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (err: any) {
      console.warn('Failed to load leads:', err);
      showToast('Failed to fetch leads.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLeads = async () => {
    setIsRefreshingLeads(true);
    const start = Date.now();
    try {
      await loadLeads();
    } finally {
      const elapsed = Date.now() - start;
      const minSpinMs = 700;
      if (elapsed < minSpinMs) {
        setTimeout(() => setIsRefreshingLeads(false), minSpinMs - elapsed);
      } else {
        setIsRefreshingLeads(false);
      }
    }
  };

  useEffect(() => {
    loadLeads();
    const handleRefresh = () => loadLeads();
    window.addEventListener('invenza_notifications_refresh', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    return () => {
      window.removeEventListener('invenza_notifications_refresh', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setProvAdminPassword(pwd);
  };

  const handleOpenEdit = (lead: any) => {
    if (lead.status === 'converted' || lead.converted_tenant_id) {
      showToast('Cannot edit after provisioned.', 'error');
      return;
    }
    setSelectedLeadForEdit(lead);
    setEditStatus(lead.status || 'new');
    setEditQuotedAmount(String(lead.quoted_amount || 0));
    setEditNotes(lead.notes || '');
  };

  const handleSaveLeadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForEdit) return;
    setIsUpdatingStatus(true);
    try {
      const amt = parseFloat(editQuotedAmount) || 0;
      await api.updateLeadStatus(selectedLeadForEdit.id, editStatus, amt, editNotes);
      showToast(`Updated status for "${selectedLeadForEdit.company_name}" to ${editStatus}`);
      setSelectedLeadForEdit(null);
      loadLeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to update lead status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartConversion = (lead: any) => {
    setConvertingLead(lead);
    setProvCompanyName(lead.company_name || '');
    const cleanCode = (lead.company_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setProvCompanyCode(cleanCode || 'COMP');
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
    setProvTier(lead.tier_estimate || 'Growth Suite');
    setProvQuotedSetupFee(String(lead.quoted_amount || 0));
    setProvAdminName(lead.contact_name || '');
    setProvAdminEmail(lead.email || '');
    generateRandomPassword();
    const leadMods = getModulesList(lead.selected_modules);
    setProvModules(
      leadMods.length > 0
        ? leadMods
        : ['products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team']
    );
    setProvSendEmail(true);
    setIsProvisionModalOpen(true);
  };

  const handleSubmitProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provCompanyName.trim() || !provAdminEmail.trim() || !provAdminPassword.trim()) {
      showToast('Please provide all mandatory fields.', 'error');
      return;
    }
    if (provCountry === 'US' && !provState.trim()) {
      showToast('Please select a US state before provisioning.', 'error');
      return;
    }
    setIsSubmittingProvision(true);
    try {
      const res = await api.provisionCompany({
        company_name: provCompanyName.trim(),
        company_code: provCompanyCode.trim().toUpperCase() || undefined,
        unique_code: provCompanyCode.trim().toUpperCase() || undefined,
        industry: provIndustry,
        location: provLocation.trim() || 'Headquarters',
        state: provShowState && provState.trim() ? provState.trim() : undefined,
        pincode: provPincode.trim() || undefined,
        country_code: provCountry,
        tier: provTier,
        tags: [provTier],
        lead_id: convertingLead?.id,
        tax_engine: provEnableTax ? provDerivedTaxEngine : 'NONE',
        setup_fee: parseFloat(provQuotedSetupFee) || 25000,
        monthly_maintenance_fee: 4500,
        quoted_setup_fee: parseFloat(provQuotedSetupFee) || 0,
        admin_full_name: provAdminName.trim() || 'Administrator',
        admin_email: provAdminEmail.trim().toLowerCase(),
        admin_password: provAdminPassword,
        enabled_modules: provModules,
        send_email: provSendEmail,
      });

      showToast(`Company "${res.name}" provisioned successfully from lead! Initial admin credentials dispatched.`);
      setIsProvisionModalOpen(false);
      setConvertingLead(null);
      loadLeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to provision company.', 'error');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  const toggleModuleSelection = (modId: string) => {
    setProvModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  // Metrics computation (100% dynamic)
  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === 'new' || l.status === 'pending').length;
  const discussionCount = leads.filter((l) => l.status === 'in_discussion').length;
  const quotedCount = leads.filter((l) => l.status === 'quoted').length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const lostCount = leads.filter((l) => l.status === 'rejected_lost').length;

  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'new') {
        if (l.status !== 'new' && l.status !== 'pending') return false;
      } else if (l.status !== statusFilter) {
        return false;
      }
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchComp = (l.company_name || '').toLowerCase().includes(term);
      const matchName = (l.contact_name || '').toLowerCase().includes(term);
      const matchEmail = (l.email || '').toLowerCase().includes(term);
      const matchPhone = (l.phone || '').toLowerCase().includes(term);
      if (!matchComp && !matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  const filterOptions: DropdownOption[] = [
    { value: 'all', label: `All Inquiries (${totalCount})` },
    { value: 'new', label: `New Inquiries (${newCount})` },
    { value: 'in_discussion', label: `In Discussion (${discussionCount})` },
    { value: 'quoted', label: `Quoted (${quotedCount})` },
    { value: 'converted', label: `Converted (${convertedCount})` },
    { value: 'rejected_lost', label: `Lost / Declined (${lostCount})` },
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
    <div className="space-y-4 animate-in fade-in duration-200 pb-6">
      <PageMeta
        title="Leads & Quotations | Invenza Platform"
        description="Pre-sales pipeline for reviewing quotation inquiries, negotiations, and one-click provisioning into live company tenants."
        canonicalPath="/leads"
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-in slide-in-from-top duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/90 dark:border-emerald-500/40 dark:text-emerald-300 backdrop-blur-xl'
              : 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/90 dark:border-rose-500/40 dark:text-rose-300 backdrop-blur-xl'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-teal-600 dark:text-teal-400 mb-1">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Pre-Sales Acquisition Pipeline</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Leads & Quotations Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Review incoming requests from the quotation calculator, negotiate offline, and seamlessly provision verified companies into Invenza.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshLeads}
            disabled={isRefreshingLeads}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-500 ${isRefreshingLeads || isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Pipeline</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Captured</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
            {totalCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-500/20 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">New Inquiries</span>
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-teal-700 dark:text-teal-300 mt-1">
            {newCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 shadow-card flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">In Discussion</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-700 dark:text-amber-300 mt-1">
            {discussionCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-500/20 shadow-card flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">Quoted Scope</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-sky-700 dark:text-sky-300 mt-1">
            {quotedCount}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 shadow-card flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Converted</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {convertedCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by company, contact person, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <SimpleSelectDropdown
            options={filterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter Status"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden shadow-card">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="w-[29%] px-4 py-3 text-center">Company Name</th>
                <th className="w-[14%] px-2 py-3 text-center">Contact Person</th>
                <th className="w-[11%] px-2 py-3 text-center">Scope & Quote</th>
                <th className="w-[14%] px-2 py-3 text-center">Modules</th>
                <th className="w-[14%] px-2 py-3 text-center">Status</th>
                <th className="w-[18%] px-2 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    <p className="font-semibold text-sm">No leads match the selected criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New calculator inquiries submitted by prospective clients will automatically appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((l) => {
                  const rawPhone = (l.whatsapp_number || l.phone || '').replace(/[^0-9]/g, '');
                  const normalizedPhone = rawPhone.length === 10 && /^[6-9]/.test(rawPhone) ? `91${rawPhone}` : rawPhone;
                  const waChatUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
                    `Hello ${l.contact_name}, this is Invenza Platform regarding your quotation inquiry for ${l.company_name}.`
                  )}`;
                  const statusMeta = LEAD_STATUS_CONFIG[l.status] || LEAD_STATUS_CONFIG.new;
                  const isConverted = l.status === 'converted' || !!l.converted_tenant_id;
                  const leadModules = getModulesList(l.selected_modules);

                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLeadForDetail(l)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group/row"
                    >
                      {/* 1. Company — Left-aligned with avatar & ellipsis tooltip */}
                      <td className="h-[52px] py-0 px-4 align-middle text-left whitespace-nowrap">
                        <div className="h-full flex items-center justify-start gap-2.5 min-w-0" title={l.company_name}>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20 shrink-0">
                            {l.company_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate group-hover/row:text-teal-500 transition-colors">
                            {l.company_name}
                          </span>
                        </div>
                      </td>

                      {/* 2. Contact Person — Center aligned name only with ellipsis tooltip */}
                      <td className="h-[52px] py-0 px-2 align-middle text-center whitespace-nowrap">
                        <div className="h-full flex items-center justify-center min-w-0" title={l.contact_name}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[125px]">
                            {l.contact_name}
                          </span>
                        </div>
                      </td>

                      {/* 3. Scope & Quote — Amount only, centered horizontally and vertically */}
                      <td className="h-[52px] py-0 px-2 align-middle text-center whitespace-nowrap">
                        <div
                          className="h-full flex items-center justify-center min-w-0"
                          title={`Quoted: ₹${Number(l.quoted_amount || 0).toLocaleString('en-IN')} (${l.tier_estimate || 'Growth Suite'})`}
                        >
                          <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                            ₹{Number(l.quoted_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* 4. Modules — 1 tag only + neutral +N badge, clearly separated */}
                      <td className="h-[52px] py-0 px-2 align-middle text-center whitespace-nowrap">
                        <div className="h-full flex items-center justify-center gap-1.5 flex-nowrap min-w-0">
                          {leadModules.length === 0 ? (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">None</span>
                          ) : (
                            <>
                              <span
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-medium shrink-0 border border-slate-200 dark:border-slate-700/60 max-w-[85px] truncate"
                                title={getModuleLabel(leadModules[0])}
                              >
                                {getModuleLabel(leadModules[0])}
                              </span>
                              {leadModules.length > 1 && (
                                <span
                                  className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold shrink-0 border border-slate-300 dark:border-slate-700"
                                  title={leadModules.slice(1).map(getModuleLabel).join(', ')}
                                >
                                  +{leadModules.length - 1}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* 5. Status — Centered distinct badge with dot */}
                      <td className="h-[52px] py-0 px-2 align-middle text-center whitespace-nowrap">
                        <div className="h-full flex items-center justify-center min-w-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusMeta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                            <span>{statusMeta.label.toUpperCase()}</span>
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions — Centered, standardized fixed button size, tightly fitted */}
                      <td className="h-[52px] py-0 px-2 align-middle text-center whitespace-nowrap">
                        <div className="h-full flex items-center justify-center gap-2 flex-nowrap min-w-0" onClick={(e) => e.stopPropagation()}>
                          {/* WhatsApp Direct Chat */}
                          {normalizedPhone && (
                            <a
                              href={waChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 flex items-center justify-center shrink-0"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Convert / Provisioned Status — Identically sized 114px x 32px */}
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => handleStartConversion(l)}
                              className="h-8 w-[114px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-subtle transition-colors shrink-0 whitespace-nowrap select-none"
                              title="Convert to Live Company Tenant"
                            >
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Convert</span>
                            </button>
                          ) : (
                            <span
                              className="h-8 w-[114px] px-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap select-none cursor-default"
                              title="Provisioned"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Provisioned</span>
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
          currentPage={currentPage}
          totalItems={filteredLeads.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="leads"
        />
      </div>

      {/* Status & Quoted Amount Edit Modal */}
      {selectedLeadForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Lead Pipeline Status
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedLeadForEdit.company_name} &bull; {selectedLeadForEdit.contact_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveLeadStatus} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                  Pipeline Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="new">New Inquiry</option>
                  <option value="in_discussion">In Discussion (Offline Negotiating)</option>
                  <option value="quoted">Quoted (Official Proposal Sent)</option>
                  <option value="converted">Converted (Tenant Provisioned)</option>
                  <option value="rejected_lost">Lost / Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                  Quoted Setup Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editQuotedAmount}
                    onChange={(e) => setEditQuotedAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This amount will automatically pre-fill the Billing Setup Fee when converting to a tenant.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                  Negotiation Notes & Commercials
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Client agreed on ₹25,000 one-time setup fee with 3 months upfront maintenance."
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedLeadForEdit(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-subtle flex items-center gap-1.5"
                >
                  {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision New Company Modal (Pre-populated from Lead) */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-teal-600 dark:text-teal-400 mb-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Converting Lead &rarr; Dedicated Organization</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Provision Organization for {convertingLead?.company_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitProvision} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Scope Tag banner */}
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-between">
                <div>
                  <span className="font-bold text-teal-700 dark:text-teal-300">Quotation Scope Tier: {provTier}</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Carried over as permanent reporting tag. Billing setup fee pre-filled with quoted amount.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-teal-600 text-white font-mono font-bold text-xs">
                  {provCurrencySymbol}{Number(provQuotedSetupFee).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={provCompanyName}
                    onChange={(e) => setProvCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Company Code / Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={provCompanyCode}
                    onChange={(e) => setProvCompanyCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Industry Sector
                  </label>
                  <select
                    value={provIndustry}
                    onChange={(e) => setProvIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  >
                    {INDUSTRIES_LIST.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Operating City / Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={provLocation}
                    onChange={(e) => setProvLocation(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Country of Registration *
                  </label>
                  <select
                    value={provCountry}
                    onChange={(e) => handleProvCountryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Country, state &amp; currency are locked after provisioning.</p>
                </div>

                {provShowState && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      State {provCountry === 'US' ? '(Sales Tax Jurisdiction)' : '(GST Classification)'} *
                    </label>
                    <select
                      value={provState}
                      onChange={(e) => setProvState(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
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
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Pincode (6 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={provPincode}
                    onChange={(e) => setProvPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 560001"
                    className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Base Currency (Auto-Derived)
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{provDerivedCurrency} ({provCurrencySymbol}) — auto-derived from {provCountryName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Tax Engine (Auto-Derived)
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{provTaxEngineDisplay}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Auto-derived from country &bull; locked. Toggle activation in Modules section below.</p>
                </div>
              </div>

              {/* Admin Account Credentials */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-2">
                  <Users className="w-3.5 h-3.5 text-teal-500" />
                  <span>Initial Organization Administrator</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={provAdminName}
                      onChange={(e) => setProvAdminName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={provAdminEmail}
                      onChange={(e) => setProvAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Initial Temporary Password *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-mono font-semibold"
                      >
                        Regenerate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={provShowPassword ? 'text' : 'password'}
                        required
                        value={provAdminPassword}
                        onChange={(e) => setProvAdminPassword(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
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

              {/* Modules selection */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-2">
                  Enabled Feature Modules
                </label>

                {/* Enable Tax Calculation Toggle */}
                <div
                  onClick={() => setProvEnableTax(!provEnableTax)}
                  className={`mb-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                    provEnableTax
                      ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={provEnableTax}
                      onChange={() => {}}
                      className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Enable Tax Calculation ({provDerivedTaxEngine})</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                          provEnableTax ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {provEnableTax ? 'Active' : 'Disabled (No Tax)'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {provEnableTax
                          ? `Applies ${provDerivedTaxEngine} calculations to sales orders and issues tax invoices.`
                          : 'Tax-exempt / plain sales receipts only without statutory tax lines.'}
                      </div>
                    </div>
                  </div>
                  {provEnableTax && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_MODULES.map((m) => {
                    const isSelected = provModules.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModuleSelection(m.id)}
                        className={`p-2 rounded-lg border text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                            : 'border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-semibold text-[11px] truncate">{m.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email dispatch toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Dispatch Credentials Email</div>
                    <div className="text-[11px] text-slate-500">Send welcome email with login details to the admin</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={provSendEmail}
                  onChange={(e) => setProvSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProvision}
                  className="px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-subtle flex items-center gap-2"
                >
                  {isSubmittingProvision ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>Provision Live Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD PROFILE & COMPLETE DETAIL VIEW MODAL */}
      {selectedLeadForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 py-5 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-lg border border-teal-500/20 shadow-inner shrink-0">
                  {selectedLeadForDetail.company_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {selectedLeadForDetail.company_name}
                    </h3>
                    {(() => {
                      const meta = LEAD_STATUS_CONFIG[selectedLeadForDetail.status] || LEAD_STATUS_CONFIG.new;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${meta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                          <span>{meta.label.toUpperCase()}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Inquiry captured {new Date(selectedLeadForDetail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForDetail(null)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Grid 1: Company Profile & Location */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Prospective Company Parameters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Industry */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Industry Domain</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedLeadForDetail.industry || 'General Merchandise'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Operational sector classification</div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Primary Location / HQ</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedLeadForDetail.location || 'India'}
                        {selectedLeadForDetail.state && `, ${selectedLeadForDetail.state}`}
                        {selectedLeadForDetail.pincode && ` - ${selectedLeadForDetail.pincode}`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Reported operational base</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Contact Person Details */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Users className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Primary Stakeholder & Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact Person</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedLeadForDetail.contact_name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Lead representative</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email Address</div>
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedLeadForDetail.email}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Official communication</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F4F5F8] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone / WhatsApp</div>
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {selectedLeadForDetail.phone}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Direct contact line</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: Operational Scope & Commercial Quotation */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <IndianRupee className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Commercial Quotation & Scope Estimate</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Quoted Amount</div>
                    <div className="text-base font-mono font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                      ₹{Number(selectedLeadForDetail.quoted_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tier Estimate</div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {selectedLeadForDetail.tier_estimate || 'Growth Suite'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Est. Warehouses</div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedLeadForDetail.estimated_warehouses || '1-2 Facilities'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Est. SKUs</div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {selectedLeadForDetail.estimated_skus || '< 500 SKUs'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 4: Tagged Modules */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5 font-mono">
                  <Package className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                  <span>Requested Modules ({getModulesList(selectedLeadForDetail.selected_modules).length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isModSelected = getModulesList(selectedLeadForDetail.selected_modules).includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 transition-colors ${
                          isModSelected
                            ? 'bg-teal-500/10 border-teal-500/30 dark:bg-teal-500/15 dark:border-teal-500/30'
                            : 'bg-slate-50/50 dark:bg-[#0C1017]/50 border-slate-200/60 dark:border-slate-800/60 opacity-50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isModSelected ? 'bg-teal-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{mod.label}</div>
                          <div className="text-[10px] text-slate-500 truncate">{mod.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedLeadForDetail.notes && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1.5 font-mono">
                    <FileText className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                    <span>Inquiry Notes & Special Requirements</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedLeadForDetail.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-[#0C1017]">
              {selectedLeadForDetail.status !== 'converted' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      handleOpenEdit(l);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Status / Fee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      handleStartConversion(l);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-subtle transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Convert to Company</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Company Successfully Provisioned</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
