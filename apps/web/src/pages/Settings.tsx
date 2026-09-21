import React, { useState, useEffect } from 'react';
import {
  IconSettings,
  IconSlidersHorizontal,
  IconShieldCheck,
  IconWebhook,
  IconPlus,
  IconTrash2,
  IconCheck,
  IconGlobe,
  IconRadio,
  IconAlertTriangle,
  IconFileText,
  IconBuilding,
  IconFileUp,
  IconLock,
  IconMail,
  IconEye,
  IconEyeOff,
  IconClock,
  IconCopy,
  IconRefreshCw,
  IconAlertCircle,
} from '../components/icons';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { CustomFieldDefinition } from '../types/inventory';
import { Modal } from '../components/common/Modal';
import { PageMeta } from '../components/common/PageMeta';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const { user, isSuperAdmin, taxConfig, updateUserLocal } = useAuth();
  const {
    customFields,
    addCustomField,
    products,
    purchaseOrders,
    salesOrders,
    ledger,
    clearAllProducts,
    clearLedger,
  } = useInventory();

  // Danger Zone Multi-Step Verification Modal State
  const [dangerModal, setDangerModal] = useState<{
    isOpen: boolean;
    type: 'catalog' | 'ledger';
    title: string;
    description: string;
    itemCount: number;
  }>({
    isOpen: false,
    type: 'catalog',
    title: '',
    description: '',
    itemCount: 0,
  });

  const [dangerPassword, setDangerPassword] = useState('');
  const [showDangerPassword, setShowDangerPassword] = useState(false);
  const [dangerOtp, setDangerOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isExecutingDanger, setIsExecutingDanger] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [dangerSuccess, setDangerSuccess] = useState<string | null>(null);
  const [pendingPurgeRequest, setPendingPurgeRequest] = useState<any | null>(null);
  const [rejectedPurgeRequest, setRejectedPurgeRequest] = useState<any | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Load existing pending ledger purge requests
  const loadPurgeRequests = async () => {
    try {
      const list = await api.getLedgerPurgeRequests();
      if (list && list.length > 0) {
        const pending = list.find((r: any) => r.status === 'pending_super_admin_approval' || r.status === 'pending');
        setPendingPurgeRequest(pending || null);
        const rejected = list.find((r: any) => r.status === 'rejected');
        setRejectedPurgeRequest(rejected || null);
      } else {
        setPendingPurgeRequest(null);
        setRejectedPurgeRequest(null);
      }
    } catch (err) {
      console.warn('Could not load purge requests:', err);
    }
  };

  useEffect(() => {
    loadPurgeRequests();
  }, []);

  const openDangerModal = (type: 'catalog' | 'ledger') => {
    const isCatalog = type === 'catalog';
    setDangerModal({
      isOpen: true,
      type,
      title: isCatalog
        ? 'Identity Verification: Reset Product Catalog'
        : 'High-Security Dual-Authorization: Purge Movement Ledger',
      description: isCatalog
        ? `Permanently deletes all ${products.length} SKU items and stock allocations. Requires account password and registered email verification code.`
        : `CRITICAL ACTION: Requires account password, registered email verification code, AND explicit Super Admin authorization before any data is purged.`,
      itemCount: isCatalog ? products.length : ledger.length,
    });
    setDangerPassword('');
    setShowDangerPassword(false);
    setDangerOtp('');
    setOtpSent(false);
    setOtpCountdown(0);
    setDangerError(null);
    setDangerSuccess(null);
  };

  const handleSendDangerOtp = async () => {
    setIsSendingOtp(true);
    setDangerError(null);
    try {
      const action = dangerModal.type === 'catalog' ? 'clear_catalog' : 'clear_ledger';
      await api.sendDangerZoneOtp(action, user?.email);
      setOtpSent(true);
      setOtpCountdown(60);
    } catch (err: any) {
      setDangerError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleExecuteDangerAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dangerPassword) {
      setDangerError('Please enter your account password.');
      return;
    }
    if (!dangerOtp || dangerOtp.trim().length !== 6) {
      setDangerError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsExecutingDanger(true);
    setDangerError(null);

    try {
      if (dangerModal.type === 'catalog') {
        await clearAllProducts({
          password: dangerPassword,
          otp: dangerOtp.trim(),
          performedBy: user?.fullName ? `${user.fullName} (${user.email})` : 'Administrator',
        });
        setDangerSuccess(
          `Product Catalog cleared. All ${dangerModal.itemCount} items were deleted, and a verified audit entry was logged to the Movement Ledger.`
        );
        setTimeout(() => {
          setDangerModal((prev) => ({ ...prev, isOpen: false }));
          setDangerSuccess(null);
        }, 2200);
      } else if (dangerModal.type === 'ledger') {
        const res = await api.requestLedgerPurge(
          dangerPassword,
          dangerOtp.trim(),
          'Comprehensive administrative audit reset',
          user?.email
        );
        setPendingPurgeRequest(res);
        setDangerSuccess(
          `Identity verified via Password + OTP! Request ${res.request_id || ''} has been submitted for Super Admin review. The Movement Ledger remains locked and untouched until Super Admin approval.`
        );
        loadPurgeRequests();
        setTimeout(() => {
          setDangerModal((prev) => ({ ...prev, isOpen: false }));
          setDangerSuccess(null);
        }, 3200);
      }
    } catch (err: any) {
      setDangerError(err.message || 'Verification failed. Please check your credentials and OTP.');
    } finally {
      setIsExecutingDanger(false);
    }
  };

  const handleSuperAdminDirectApprove = async (requestId: string) => {
    setIsProcessingApproval(true);
    try {
      await api.approveLedgerPurge(requestId);
      await clearLedger({
        requestedBy: pendingPurgeRequest?.requested_by_name || 'Admin',
        approvedBy: user?.fullName ? `${user.fullName} (${user.email})` : 'Super Administrator',
      });
      setPendingPurgeRequest(null);
      loadPurgeRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to approve purge request');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Company Legal & Invoicing Profile State
  const [gstSettings, setGstSettings] = useState({
    legal_business_name: '',
    gstin: '',
    pan: '',
    registered_address: '',
    state: taxConfig.taxType === 'GST' ? 'Karnataka' : (taxConfig.stateName || taxConfig.countryName),
    state_code: taxConfig.taxType === 'GST' ? '29' : (taxConfig.stateCode || taxConfig.countryCode),
    authorized_signatory_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_branch: '',
    account_holder_name: '',
    invoice_prefix: 'INV',
    auto_email_invoice: false,
    logo_url: '',
    signature_url: '',
  });
  const [isLoadingGst, setIsLoadingGst] = useState(true);
  const [isSavingGst, setIsSavingGst] = useState(false);
  const [gstSaveSuccess, setGstSaveSuccess] = useState(false);
  const [taxEngine, setTaxEngine] = useState<string>(() => {
    if (taxConfig.currencyCode === 'EUR' || user?.currencyCode === 'EUR') return 'VAT';
    if (taxConfig.currencyCode === 'USD' || user?.currencyCode === 'USD') return 'SALES_TAX';
    return user?.taxEngine || taxConfig.taxType || 'GST';
  });
  const [applyTaxToSalesOrders, setApplyTaxToSalesOrders] = useState<boolean>(true);
  const [isTaxToggleModalOpen, setIsTaxToggleModalOpen] = useState(false);
  const [pendingTaxToggleState, setPendingTaxToggleState] = useState<boolean | null>(null);
  const [isUpdatingTaxToggle, setIsUpdatingTaxToggle] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    if (taxConfig.currencyCode === 'EUR' || user?.currencyCode === 'EUR') {
      setTaxEngine('VAT');
    } else if (taxConfig.currencyCode === 'USD' || user?.currencyCode === 'USD') {
      setTaxEngine('SALES_TAX');
    } else if (taxConfig.taxType && taxConfig.taxType !== 'GST') {
      setTaxEngine(taxConfig.taxType);
    }
  }, [taxConfig.currencyCode, taxConfig.taxType, user?.currencyCode]);

  useEffect(() => {
    const loadGstSettings = async () => {
      try {
        const data = await api.getTenantInvoicingSettings();
        if (data) {
          if (data.tax_engine) setTaxEngine(data.tax_engine);
          else if (data.currency_code === 'EUR') setTaxEngine('VAT');
          else if (data.currency_code === 'USD') setTaxEngine('SALES_TAX');
          else if (data.tax_type) setTaxEngine(data.tax_type);
          if (data.apply_tax_to_sales_orders !== undefined) {
            const isTaxApp = Boolean(data.apply_tax_to_sales_orders);
            setApplyTaxToSalesOrders(isTaxApp);
            updateUserLocal({ applyTaxToSalesOrders: isTaxApp, taxEngine: data.tax_engine || user?.taxEngine });
          }
          setGstSettings({
            legal_business_name: data.legal_business_name || '',
            gstin: data.gstin || data.tax_id || '',
            pan: data.pan || data.national_tax_id || '',
            registered_address: data.registered_address || '',
            state: data.state || (taxConfig.taxType === 'GST' ? 'Karnataka' : (taxConfig.stateName || taxConfig.countryName)),
            state_code: data.state_code || (taxConfig.taxType === 'GST' ? '29' : (taxConfig.stateCode || taxConfig.countryCode)),
            authorized_signatory_name: data.authorized_signatory_name || '',
            bank_name: data.bank_name || '',
            bank_account_number: data.bank_account_number || '',
            bank_ifsc_code: data.bank_ifsc_code || data.bank_routing_code || '',
            bank_branch: data.bank_branch || '',
            account_holder_name: data.account_holder_name || '',
            invoice_prefix: data.invoice_prefix || 'INV',
            auto_email_invoice: Boolean(data.auto_email_invoice),
            logo_url: data.logo_url || '',
            signature_url: data.signature_url || '',
          });
        }
      } catch (err) {
        console.error('Failed to load legal settings:', err);
      } finally {
        setIsLoadingGst(false);
      }
    };
    loadGstSettings();
  }, [taxConfig.taxType, taxConfig.stateName, taxConfig.countryName, taxConfig.stateCode, taxConfig.countryCode]);

  const handleSaveGstSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGst(true);
    setGstSaveSuccess(false);
    try {
      await api.updateTenantInvoicingSettings({
        ...gstSettings,
        apply_tax_to_sales_orders: applyTaxToSalesOrders,
      });
      updateUserLocal({ applyTaxToSalesOrders: applyTaxToSalesOrders });
      setGstSaveSuccess(true);
      setTimeout(() => setGstSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update tax settings:', err);
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSavingGst(false);
    }
  };

  const effectiveTaxEngine =
    taxEngine && taxEngine !== 'GST'
      ? taxEngine
      : (taxConfig.currencyCode === 'EUR' || user?.currencyCode === 'EUR'
          ? 'VAT'
          : taxConfig.currencyCode === 'USD' || user?.currencyCode === 'USD'
          ? 'SALES_TAX'
          : user?.taxEngine || (user as any)?.tax_engine || taxConfig.taxType || 'GST');

  const handleConfirmTaxToggle = async () => {
    if (pendingTaxToggleState === null) return;
    setIsUpdatingTaxToggle(true);
    try {
      await api.updateTenantInvoicingSettings({
        apply_tax_to_sales_orders: pendingTaxToggleState,
      });
      setApplyTaxToSalesOrders(pendingTaxToggleState);
      updateUserLocal({ applyTaxToSalesOrders: pendingTaxToggleState });
      setIsTaxToggleModalOpen(false);
      const newState = pendingTaxToggleState;
      setPendingTaxToggleState(null);
      showToast(
        newState
          ? `Tax calculation for sales orders has been ENABLED (${effectiveTaxEngine} regime).`
          : 'Tax calculation for sales orders has been DISABLED. Orders will now generate plain Sales Receipts.',
        'success'
      );
    } catch (err: any) {
      console.error('Failed to update tax policy:', err);
      showToast(err.message || 'Failed to update tax toggle', 'error');
    } finally {
      setIsUpdatingTaxToggle(false);
    }
  };

  // Custom Field Form State
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  // Webhooks simulated state
  const [webhooks, setWebhooks] = useState([
    { id: '1', url: 'https://api.invenza.internal/webhooks/sap-stock-sync', events: ['ledger.in', 'ledger.out'] },
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName || !fieldKey) return;

    const newField: CustomFieldDefinition = {
      id: `cf-${Date.now()}`,
      name: fieldName,
      key: fieldKey.toLowerCase().replace(/\s+/g, '_'),
      type: fieldType,
      required: isRequired,
      options: fieldType === 'select' ? fieldOptions.split(',').map((o) => o.trim()) : undefined,
    };

    addCustomField(newField);
    setFieldName('');
    setFieldKey('');
    setFieldOptions('');
    setIsRequired(false);
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    setWebhooks((prev) => [
      ...prev,
      { id: Date.now().toString(), url: newWebhookUrl, events: ['ledger.all'] },
    ]);
    setNewWebhookUrl('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <PageMeta
        title="Settings & JSONB Custom Schema | Invenza Inventory"
        description="Configure company legal profile, tax invoicing parameters, bank remittance details, dynamic JSONB SKU schema, and system security."
        canonicalPath="/settings"
      />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Settings & Custom Schema Engine
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure organization legal & tax parameters, bank remittance, extensible JSONB product attributes, and system security.
        </p>
      </div>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          <IconCheck className="w-4 h-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Single Toggle: Apply Tax to Sales Orders (ONLY Shown if org has a Tax Engine assigned) */}
      {effectiveTaxEngine !== 'NONE' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Apply Tax to Sales Orders
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    applyTaxToSalesOrders
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                  }`}
                >
                  {applyTaxToSalesOrders ? 'ENABLED' : 'DISABLED'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                  <IconLock className="w-3 h-3 text-slate-400" />
                  <span>Engine: {effectiveTaxEngine === 'GST' ? 'GST (India)' : effectiveTaxEngine === 'VAT' ? 'VAT (EU)' : effectiveTaxEngine === 'SALES_TAX' ? 'Sales Tax (USA)' : 'None (No Tax)'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                {applyTaxToSalesOrders ? (
                  <>
                    Full statutory <strong>{effectiveTaxEngine === 'SALES_TAX' ? 'Sales Tax' : effectiveTaxEngine}</strong> tax regime applies. Sales orders calculate tax line items and fulfillment generates official <strong>Tax Invoices</strong>.
                  </>
                ) : (
                  <>
                    Tax calculation is disabled. Orders calculate 0% tax, omit tax lines, and generate plain <strong>Sales Receipts</strong> without statutory tax claims.
                  </>
                )}
              </p>
            </div>

            {/* Confirmation-Gated Toggle Switch */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 select-none">
                {applyTaxToSalesOrders ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={applyTaxToSalesOrders}
                onClick={() => {
                  setPendingTaxToggleState(!applyTaxToSalesOrders);
                  setIsTaxToggleModalOpen(true);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                  applyTaxToSalesOrders ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    applyTaxToSalesOrders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Dynamic Company Legal & Invoicing Profile */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
              <IconBuilding className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {taxConfig.legalProfileTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {taxConfig.legalProfileSubtitle}
              </p>
            </div>
          </div>

          {gstSaveSuccess && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-fadeIn self-start sm:self-auto shrink-0">
              <IconCheck className="h-3.5 w-3.5" />
              <span>Settings Saved!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveGstSettings} className="mt-6 space-y-6">
          {/* Sub-block 1: Company Legal Identity & Tax Registration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
                {taxConfig.legalSectionTitle}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {taxConfig.legalComplianceHelper}
              </span>
            </div>

            {taxConfig.taxType === 'NONE' ? (
              /* Non-Tax / Plain Commercial Entity Profile */
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.legal_business_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, legal_business_name: e.target.value })}
                    placeholder="e.g. Acme Commercial Enterprises"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Authorized Signatory *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.authorized_signatory_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, authorized_signatory_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Commercial / Trade License # (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={gstSettings.gstin}
                    onChange={(e) => setGstSettings({ ...gstSettings, gstin: e.target.value })}
                    placeholder="e.g. BL-987654"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Printed on receipts if provided
                  </span>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    National Business Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={gstSettings.pan}
                    onChange={(e) => setGstSettings({ ...gstSettings, pan: e.target.value })}
                    placeholder="e.g. ENT-12345"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Optional company registry or tax-exempt code
                  </span>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.registered_address}
                    onChange={(e) => setGstSettings({ ...gstSettings, registered_address: e.target.value })}
                    placeholder="Enter full registered business address"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            ) : taxConfig.taxType === 'GST' ? (
              /* GST Legal Profile (India) */
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Legal Business Name */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.legal_business_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, legal_business_name: e.target.value })}
                    placeholder="e.g. Invenza Global Technologies Ltd"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* PAN */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Permanent Account Number (PAN) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={gstSettings.pan}
                    onChange={(e) => setGstSettings({ ...gstSettings, pan: e.target.value.toUpperCase() })}
                    placeholder="AABCI1234F"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* Company GSTIN */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company GSTIN (15 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={gstSettings.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstSettings({
                        ...gstSettings,
                        gstin: val,
                        state_code: val.length >= 2 ? val.slice(0, 2) : gstSettings.state_code,
                      });
                    }}
                    placeholder="29AABCI1234F1Z5"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* State & GST State Code */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    State & GST State Code *
                  </label>
                  <select
                    value={gstSettings.state_code}
                    onChange={(e) => {
                      const sc = e.target.value;
                      const stateMap: Record<string, string> = {
                        '29': 'Karnataka',
                        '33': 'Tamil Nadu',
                        '27': 'Maharashtra',
                        '07': 'Delhi',
                        '36': 'Telangana',
                        '24': 'Gujarat',
                        '32': 'Kerala',
                        '19': 'West Bengal',
                      };
                      setGstSettings({
                        ...gstSettings,
                        state_code: sc,
                        state: stateMap[sc] || 'Karnataka',
                      });
                    }}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  >
                    <option value="29">29 - Karnataka</option>
                    <option value="33">33 - Tamil Nadu</option>
                    <option value="27">27 - Maharashtra</option>
                    <option value="07">07 - Delhi</option>
                    <option value="36">36 - Telangana</option>
                    <option value="24">24 - Gujarat</option>
                    <option value="32">32 - Kerala</option>
                    <option value="19">19 - West Bengal</option>
                  </select>
                </div>

                {/* Registered Office Address */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Office Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.registered_address}
                    onChange={(e) => setGstSettings({ ...gstSettings, registered_address: e.target.value })}
                    placeholder="Plot 42, Outer Ring Road, Bengaluru, Karnataka 560103"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* Authorized Signatory */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Authorized Signatory *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.authorized_signatory_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, authorized_signatory_name: e.target.value })}
                    placeholder="e.g. Vijay B"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            ) : taxConfig.taxType === 'VAT' ? (
              /* EU / Germany VAT Legal Profile */
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Legal Business Name */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.legal_business_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, legal_business_name: e.target.value })}
                    placeholder="e.g. SK E-Commerce GmbH"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* Authorized Signatory */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Authorized Signatory *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.authorized_signatory_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, authorized_signatory_name: e.target.value })}
                    placeholder="e.g. Stefan Meier"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* USt-IdNr. (VAT ID) */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    USt-IdNr. (VAT ID, format DE + 9 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={gstSettings.gstin}
                    onChange={(e) => setGstSettings({ ...gstSettings, gstin: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    placeholder="DE123456789"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Format: 2-letter country code + 9 digits
                  </span>
                </div>

                {/* Steuernummer (Tax Number) */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Steuernummer (Domestic Tax Number) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={gstSettings.pan}
                    onChange={(e) => setGstSettings({ ...gstSettings, pan: e.target.value })}
                    placeholder="e.g. 12/345/67890"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Issued by domestic Finanzamt
                  </span>
                </div>

                {/* Registered Business Address */}
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.registered_address}
                    onChange={(e) => setGstSettings({ ...gstSettings, registered_address: e.target.value })}
                    placeholder="e.g. Friedrichstraße 43, 10117 Berlin, Germany"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            ) : (
              /* US Sales Tax Legal Profile */
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Legal Business Name */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.legal_business_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, legal_business_name: e.target.value })}
                    placeholder="e.g. Pacific Crest Distribution Inc."
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* Authorized Signatory */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Authorized Signatory *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.authorized_signatory_name}
                    onChange={(e) => setGstSettings({ ...gstSettings, authorized_signatory_name: e.target.value })}
                    placeholder="e.g. Michael Vance"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>

                {/* EIN */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Employer Identification Number (EIN) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={gstSettings.pan}
                    onChange={(e) => setGstSettings({ ...gstSettings, pan: e.target.value })}
                    placeholder="e.g. 12-3456789"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Federal 9-digit Tax ID (XX-XXXXXXX)
                  </span>
                </div>

                {/* State Sales Tax Permit # */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    State Sales Tax Permit / Registration # *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={gstSettings.gstin}
                    onChange={(e) => setGstSettings({ ...gstSettings, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. SR AC 12-345678"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    State Department of Revenue Permit
                  </span>
                </div>

                {/* Registered Business Address */}
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstSettings.registered_address}
                    onChange={(e) => setGstSettings({ ...gstSettings, registered_address: e.target.value })}
                    placeholder="e.g. 500 Howard Street, Suite 400, San Francisco, CA 94105"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sub-block 2: Bank Remittance Details (Printed on Invoices) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
                Bank Remittance Details (Printed on Invoices)
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Direct wire / electronic instructions displayed on customer invoices
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {/* Account Holder Name */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={gstSettings.account_holder_name}
                  onChange={(e) => setGstSettings({ ...gstSettings, account_holder_name: e.target.value })}
                  placeholder="Beneficiary Legal Name"
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                />
              </div>

              {/* Bank Name */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={gstSettings.bank_name}
                  onChange={(e) => setGstSettings({ ...gstSettings, bank_name: e.target.value })}
                  placeholder={taxConfig.taxType === 'VAT' ? 'e.g. Deutsche Bank' : taxConfig.taxType === 'SALES_TAX' ? 'e.g. JPMorgan Chase' : 'e.g. HDFC Bank'}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                />
              </div>

              {/* Bank Account / IBAN */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {taxConfig.bankAccountLabel}
                </label>
                <input
                  type="text"
                  required
                  maxLength={34}
                  value={gstSettings.bank_account_number}
                  onChange={(e) => setGstSettings({ ...gstSettings, bank_account_number: e.target.value.toUpperCase() })}
                  placeholder={taxConfig.bankAccountPlaceholder}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                />
              </div>

              {/* Routing / BIC / IFSC */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {taxConfig.bankRoutingLabel}
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={gstSettings.bank_ifsc_code}
                  onChange={(e) => setGstSettings({ ...gstSettings, bank_ifsc_code: e.target.value.toUpperCase() })}
                  placeholder={taxConfig.bankRoutingPlaceholder}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                />
              </div>

              {/* Branch Name */}
              <div className="md:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {taxConfig.bankBranchLabel}
                </label>
                <input
                  type="text"
                  value={gstSettings.bank_branch}
                  onChange={(e) => setGstSettings({ ...gstSettings, bank_branch: e.target.value })}
                  placeholder={taxConfig.taxType === 'VAT' ? 'e.g. Frankfurt Main Branch, Germany' : taxConfig.taxType === 'SALES_TAX' ? 'e.g. San Francisco Financial District' : 'e.g. Koramangala 5th Block, Bengaluru, KA - 560034'}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Sub-block 3: Invoicing Dispatch & Prefix Options */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            {/* Invoice Prefix */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Invoice Series Prefix
              </label>
              <input
                type="text"
                maxLength={6}
                value={gstSettings.invoice_prefix}
                onChange={(e) => setGstSettings({ ...gstSettings, invoice_prefix: e.target.value.toUpperCase() })}
                placeholder="INV"
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
              />
            </div>

            {/* Auto-email Toggle Card */}
            <div className="md:col-span-4">
              <label className="flex items-center gap-3 h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] cursor-pointer hover:border-teal-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={gstSettings.auto_email_invoice}
                  onChange={(e) => setGstSettings({ ...gstSettings, auto_email_invoice: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
                  Auto-email tax invoice PDF copy to buyer upon fulfillment
                </span>
              </label>
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {taxConfig.legalFooterText}
            </p>
            <button
              type="submit"
              disabled={isSavingGst}
              className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 h-9 text-xs font-bold text-white shadow-subtle transition-colors shrink-0"
            >
              <IconCheck className="h-4 w-4" />
              <span>{isSavingGst ? 'Saving Profile...' : taxConfig.saveSettingsButtonText}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Dynamic JSONB Custom Schema Builder */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            <IconSlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Dynamic JSONB SKU Schema Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add arbitrary custom attributes (e.g. Serial #, Expiry Date, Material, Grade) backed by PostgreSQL JSONB.
            </p>
          </div>
        </div>

        {/* Existing Custom Fields */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Registered Tenant Fields
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {customFields.length} active custom {customFields.length === 1 ? 'attribute' : 'attributes'}
            </span>
          </div>

          {customFields.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              No custom attributes defined yet. Create your first field below.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customFields.map((cf) => (
                <div
                  key={cf.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017]"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{cf.name}</div>
                    <div className="font-mono text-[10px] text-teal-700 dark:text-teal-400 font-bold truncate">
                      Key: {cf.key} ({cf.type})
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {cf.required ? 'REQUIRED' : 'OPTIONAL'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Field Form */}
        <form
          onSubmit={handleCreateField}
          className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
              Register New Schema Field
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Instantly dynamic across all catalog SKU items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Display Label *
              </label>
              <input
                type="text"
                required
                value={fieldName}
                onChange={(e) => {
                  setFieldName(e.target.value);
                  if (!fieldKey) {
                    setFieldKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }
                }}
                placeholder="e.g. Battery Capacity"
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                JSONB Storage Key *
              </label>
              <input
                type="text"
                required
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="e.g. battery_capacity"
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Data Type
              </label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
              >
                <option value="text">Text (String)</option>
                <option value="number">Numeric (Float/Int)</option>
                <option value="date">Date (ISO Timestamp)</option>
                <option value="select">Dropdown Choice</option>
              </select>
            </div>
          </div>

          {fieldType === 'select' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Options (Comma Separated) *
              </label>
              <input
                type="text"
                required
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="e.g. 5000mAh, 10000mAh, 20000mAh"
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              Enforce required validation upon creation
            </label>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 h-9 text-xs font-bold text-white shadow-subtle transition-colors shrink-0"
            >
              <IconPlus className="h-4 w-4" />
              <span>Register Schema Field</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Role-Based Access Control Overview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            <IconShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Role Matrix & Cryptographic Permissions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Granular access privilege distribution across authenticated tenant operator tiers.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0C1017] text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">System Role</th>
                <th className="py-2.5 px-3 text-center">View Ledger</th>
                <th className="py-2.5 px-3 text-center">Create PO / SO</th>
                <th className="py-2.5 px-3 text-center">Approve Transfers</th>
                <th className="py-2.5 px-3 text-center">Reconcile Stock</th>
                <th className="py-2.5 px-3 text-center">Modify Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">
                  Company Admin
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">
                  Warehouse Manager
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">
                  Operations Staff
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">
                  Viewer (Auditor)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                <td className="py-2.5 px-3 text-center text-slate-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Future Roadmap Notice: Multi-Currency Support */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#131924]/60 p-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <IconGlobe className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-medium">
              Tenant Base Currency support can be implemented in the future if required — contact{' '}
              <a href="mailto:support@invenza.com" className="text-teal-600 dark:text-teal-400 font-semibold hover:underline">
                support@invenza.com
              </a>{' '}
              to request this.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            Allows amounts to be converted between currencies such as INR, USD, and EUR.
          </span>
        </div>
      </div>

      {/* 4. Outbound Webhooks Config */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            <IconWebhook className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Outbound Event Webhooks
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fire HTTP POST payloads whenever stock events occur to integrate with external ERPs.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddWebhook} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            required
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
            placeholder="https://your-service.com/api/invenza-listener"
            className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-subtle transition-colors shrink-0"
          >
            Register Webhook
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs bg-[#F4F5F8] dark:bg-[#0C1017]"
            >
              <div className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-md">
                {wh.url}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded font-mono text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
                <button
                  type="button"
                  onClick={() => setWebhooks((prev) => prev.filter((w) => w.id !== wh.id))}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  aria-label="Remove Webhook"
                >
                  <IconTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Legal & Terms Shortcuts */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            <IconFileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Legal Agreements & Security Policies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review Master Subscription Agreements and tenant cryptographic isolation policies.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/terms"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <IconFileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <IconFileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Privacy Policy
          </a>
        </div>
      </div>

      {/* 6. Danger Zone: Data & Ledger Management */}
      <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-500/5 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-rose-200 dark:border-rose-900/50 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 shrink-0">
            <IconAlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Danger Zone: Data & Ledger Safeguards
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Irreversible destructive operations protected by multi-step identity verification and Super Admin dual-authorization.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1: Clear Product Catalog */}
          <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white/80 dark:bg-slate-900/60 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Reset Product Catalog
                  </h3>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    MFA Protected
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">
                  {products.length} Items
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Permanently purges all SKU catalog entries and warehouse allocations. Requires account password and email OTP verification. Logged to Movement Ledger audit trail.
              </p>
            </div>
            <button
              type="button"
              disabled={products.length === 0}
              onClick={() => openDangerModal('catalog')}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                products.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-700 hover:bg-rose-800 text-white shadow-subtle'
              }`}
            >
              <IconLock className="h-3.5 w-3.5" />
              <IconTrash2 className="h-3.5 w-3.5" />
              Clear Entire Catalog
            </button>
          </div>

          {/* Action 2: Clear Movement Ledger (CRITICAL - DUAL-AUTHORIZATION) */}
          <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white/80 dark:bg-slate-900/60 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Purge Movement Ledger
                  </h3>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
                    Dual-Auth Required
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">
                  {ledger.length} Records
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Highest security level. Destroys immutable stock audit history. Requires Password + Email OTP, plus <strong>mandatory explicit authorization from Super Admin</strong> before execution.
              </p>
            </div>

            {/* If there is a pending purge request */}
            {pendingPurgeRequest && (pendingPurgeRequest.status === 'pending_super_admin_approval' || pendingPurgeRequest.status === 'pending') ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <IconClock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Pending Super Admin Approval
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                    {pendingPurgeRequest.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Requested by <strong>{pendingPurgeRequest.requested_by_name}</strong>. Verified via Password + Email OTP. Audit ledger is untouched pending approval.
                </p>
                {isSuperAdmin && (
                  <button
                    type="button"
                    disabled={isProcessingApproval}
                    onClick={() => handleSuperAdminDirectApprove(pendingPurgeRequest.id)}
                    className="w-full py-1.5 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <IconShieldCheck className="h-3.5 w-3.5" />
                    {isProcessingApproval ? 'Authorizing...' : 'Super Admin: Authorize & Execute Purge'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {rejectedPurgeRequest && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <IconAlertTriangle className="h-3.5 w-3.5" />
                        Previous Purge Request Rejected
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                        {rejectedPurgeRequest.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Reason: <strong>{rejectedPurgeRequest.rejection_reason || 'Rejected by Super Administrator'}</strong>
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={ledger.length === 0}
                  onClick={() => openDangerModal('ledger')}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    ledger.length === 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-rose-700 hover:bg-rose-800 text-white shadow-subtle'
                  }`}
                >
                  <IconShieldCheck className="h-3.5 w-3.5" />
                  <IconTrash2 className="h-3.5 w-3.5" />
                  Clear Movement Ledger
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Step Identity & Security Verification Modal */}
      <Modal
        isOpen={dangerModal.isOpen}
        onClose={() => {
          if (!isExecutingDanger) {
            setDangerModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        title={dangerModal.type === 'catalog' ? 'Multi-Step Verification: Catalog Reset' : 'High Security Dual-Authorization: Ledger Purge'}
        subtitle="Password and Email OTP verification required before destructive action"
        maxWidth="lg"
      >
        <form onSubmit={handleExecuteDangerAction} className="space-y-4">
          {/* Security Notice Banner */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
              dangerModal.type === 'ledger'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <IconAlertTriangle
              className={`h-5 w-5 shrink-0 mt-0.5 ${
                dangerModal.type === 'ledger' ? 'text-amber-500' : 'text-rose-500'
              }`}
            />
            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{dangerModal.title}</span>
                {dangerModal.type === 'ledger' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Dual-Authorization
                  </span>
                )}
              </div>
              <p className="leading-relaxed">{dangerModal.description}</p>
              {dangerModal.type === 'ledger' && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  CRITICAL RULE: The Movement Ledger purge destroys the immutable audit history. Verifying your identity with Password + Email OTP will NOT wipe the ledger immediately. It submits a formal purge authorization request to the Super Administrator. The ledger remains locked and untouched until Super Admin approval is explicitly granted.
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Password Verification */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-[10px] font-extrabold text-white dark:text-slate-900">
                  1
                </span>
                Account Password Verification
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {user?.email || 'admin@invenza.internal'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showDangerPassword ? 'text' : 'password'}
                required
                value={dangerPassword}
                onChange={(e) => setDangerPassword(e.target.value)}
                placeholder="Enter your current account password"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowDangerPassword(!showDangerPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showDangerPassword ? 'Hide password' : 'Show password'}
              >
                {showDangerPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Step 2: Registered Email OTP */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-[10px] font-extrabold text-white dark:text-slate-900">
                  2
                </span>
                Registered Email OTP Verification
              </label>
              {otpSent && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <IconCheck className="h-3 w-3" />
                  Code Dispatched
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={dangerOtp}
                  onChange={(e) => setDangerOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full font-mono text-center tracking-[0.3em] font-bold text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="button"
                disabled={isSendingOtp || otpCountdown > 0}
                onClick={handleSendDangerOtp}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  otpCountdown > 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-sm'
                }`}
              >
                {isSendingOtp ? (
                  <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconMail className="h-3.5 w-3.5" />
                )}
                <span>
                  {otpCountdown > 0
                    ? `Resend in ${otpCountdown}s`
                    : otpSent
                    ? 'Resend Verification Code'
                    : 'Send Verification Code'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>A 6-digit verification code has been dispatched to <strong>{user?.email || 'admin@invenza.internal'}</strong></span>
              <span className="text-[10px] text-slate-400">Valid for 10 minutes</span>
            </div>
          </div>

          {/* Feedback Messages */}
          {dangerError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              <span>{dangerError}</span>
            </div>
          )}

          {dangerSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <IconCheck className="h-4 w-4 shrink-0" />
              <span>{dangerSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isExecutingDanger}
              onClick={() => setDangerModal((prev) => ({ ...prev, isOpen: false }))}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isExecutingDanger || !dangerPassword || dangerOtp.length !== 6}
              className={`rounded-lg px-5 py-2 text-xs font-bold text-white shadow-subtle transition-all flex items-center gap-2 ${
                isExecutingDanger || !dangerPassword || dangerOtp.length !== 6
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : dangerModal.type === 'ledger'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {isExecutingDanger ? (
                <>
                  <IconRefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : dangerModal.type === 'catalog' ? (
                <>
                  <IconTrash2 className="h-4 w-4" />
                  <span>Verify & Clear Entire Catalog</span>
                </>
              ) : (
                <>
                  <IconShieldCheck className="h-4 w-4" />
                  <span>Verify Identity & Submit for Super Admin Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Toggling Tax Policy */}
      {isTaxToggleModalOpen && pendingTaxToggleState !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${pendingTaxToggleState ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                <IconAlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {pendingTaxToggleState ? 'Enable Tax on Sales Orders?' : 'Disable Tax on Sales Orders?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingTaxToggleState
                    ? `You are enabling tax calculations under the assigned ${effectiveTaxEngine} tax regime.`
                    : 'You are disabling tax calculations. Future sales orders will generate plain Sales Receipts.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white">Compliance & Operational Impact:</div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {pendingTaxToggleState ? (
                  <>
                    <li>Future sales orders will calculate statutory {effectiveTaxEngine} tax on line items.</li>
                    <li>Fulfillment will issue legal, numbered <strong>Tax Invoices</strong>.</li>
                    <li>Previously generated sales receipts and in-flight orders remain locked to their creation state.</li>
                  </>
                ) : (
                  <>
                    <li>Future sales orders will have 0% tax calculated and will not display tax lines.</li>
                    <li>Fulfillment will generate plain <strong>Sales Receipts</strong> without statutory tax claims.</li>
                    <li>Previously generated tax invoices remain legally frozen and will not be retroactively altered.</li>
                  </>
                )}
              </ul>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <IconShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>This toggle change will be recorded in the Security Safeguards Audit Log.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isUpdatingTaxToggle}
                onClick={() => {
                  setIsTaxToggleModalOpen(false);
                  setPendingTaxToggleState(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingTaxToggle}
                onClick={handleConfirmTaxToggle}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-2 ${
                  pendingTaxToggleState
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isUpdatingTaxToggle ? 'Updating...' : pendingTaxToggleState ? 'Confirm Enable Tax' : 'Confirm Disable Tax'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
