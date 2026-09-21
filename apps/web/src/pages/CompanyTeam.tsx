import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconUsers,
  IconUserPlus,
  IconShieldCheck,
  IconKey,
  IconCheck,
  IconCheckCircle2,
  IconAlertCircle,
  IconMail,
  IconLock,
  IconTrash2,
  IconEdit,
  IconRefreshCw,
  IconSend,
  IconSearch,
  IconX,
  IconPlus,
  IconPhone,
  IconMapPin,
  IconBuilding,
  IconFileText,
  IconArchive,
  IconPower,
  IconChevronDown,
  IconChevronRight,
  IconPackage,
} from '../components/icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { Customer } from '../types/inventory';
import { PageMeta } from '../components/common/PageMeta';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { StateSelectDropdown } from '../components/common/StateSelectDropdown';
import { TabType } from '../components/layout/Sidebar';

interface CompanyTeamProps {
  onNavigate?: (tab: TabType, params?: Record<string, string>) => void;
  initialTab?: 'customers' | 'team';
}

const GRANULAR_PERMISSIONS = [
  { id: 'inventory:read', label: 'View Products & Inventory', desc: 'Can view inventory catalog, stock levels, and search items' },
  { id: 'inventory:write', label: 'Add & Edit Products', desc: 'Can create new SKUs, modify pricing, categories, and attributes' },
  { id: 'orders:manage', label: 'Manage Orders & GRN', desc: 'Can create POs/SOs, receive shipments, and fulfill orders' },
  { id: 'transfers:manage', label: 'Transfers & Adjustments', desc: 'Can initiate stock transfers between locations and manual counts' },
  { id: 'reports:view', label: 'View Financial Valuation', desc: 'Can view FIFO/weighted average valuation and ledger audit trails' },
];

export const CompanyTeam: React.FC<CompanyTeamProps> = ({ onNavigate, initialTab = 'customers' }) => {
  const { user } = useAuth();
  const { formatCurrency, taxConfig } = useInventory();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const enabledModules = user?.enabledModules || [
    'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
  ];
  const isTeamEnabled = enabledModules.includes('team') || user?.role === 'super_admin';

  // Active Main Tab: 'customers' (first/default) vs 'team' (existing Team & Roles)
  const [activeMainTab, setActiveMainTab] = useState<'customers' | 'team'>(() => {
    return initialTab === 'team' && isTeamEnabled ? 'team' : 'customers';
  });

  useEffect(() => {
    if (initialTab === 'team') {
      if (isTeamEnabled) {
        setActiveMainTab('team');
      } else {
        setActiveMainTab('customers');
        showToast('Teams & Roles module is disabled for your organization.', 'error');
      }
    } else if (initialTab === 'customers') {
      setActiveMainTab('customers');
    }
  }, [initialTab, isTeamEnabled]);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // =========================================================================
  // SECTION A: CUSTOMERS STATE & ACTIONS
  // =========================================================================
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(20);

  // Add Customer Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);
  const [custLegalName, setCustLegalName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custBillingAddress, setCustBillingAddress] = useState('');
  const [custBillingState, setCustBillingState] = useState('Karnataka');
  const [custBillingStateCode, setCustBillingStateCode] = useState('29');
  const [custShippingAddress, setCustShippingAddress] = useState('');
  const [custShippingSameAsBilling, setCustShippingSameAsBilling] = useState(true);

  // Edit Customer Modal
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState<string | null>(null);
  const [editCustLegalName, setEditCustLegalName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustGstin, setEditCustGstin] = useState('');
  const [editCustBillingAddress, setEditCustBillingAddress] = useState('');
  const [editCustBillingState, setEditCustBillingState] = useState('Karnataka');
  const [editCustBillingStateCode, setEditCustBillingStateCode] = useState('29');
  const [editCustShippingAddress, setEditCustShippingAddress] = useState('');
  const [editCustIsActive, setEditCustIsActive] = useState(true);

  // Archive Customer Modal State
  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);
  const [isArchivingCustomer, setIsArchivingCustomer] = useState(false);

  // Customer Order History Modal (Detail View)
  const [selectedCustomerForOrders, setSelectedCustomerForOrders] = useState<Customer | null>(null);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState(false);
  const [customerOrdersData, setCustomerOrdersData] = useState<any | null>(null);
  const [hoveredOrderPopover, setHoveredOrderPopover] = useState<{
    orderId: string;
    items: any[];
    rect: DOMRect;
  } | null>(null);

  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const data = await api.getCustomers();
      if (Array.isArray(data)) {
        setCustomers(
          data.map((c: any) => ({
            id: c.id,
            tenantId: c.tenant_id,
            legalName: c.legal_name,
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
            orderCount: c.order_count || 0,
            totalRevenue: Number(c.total_revenue || 0),
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      showToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    const handleSync = () => loadCustomers();
    window.addEventListener('invenza_customers_updated', handleSync);
    return () => {
      window.removeEventListener('invenza_customers_updated', handleSync);
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (customerStatusFilter === 'active' && c.isActive === false) return false;
      if (customerStatusFilter === 'archived' && c.isActive !== false) return false;
      if (!customerSearch.trim()) return true;
      const q = customerSearch.toLowerCase();
      return (
        c.legalName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.billingState && c.billingState.toLowerCase().includes(q)) ||
        (c.billingAddress && c.billingAddress.toLowerCase().includes(q))
      );
    });
  }, [customers, customerSearch, customerStatusFilter]);

  useEffect(() => {
    setCustomerCurrentPage(1);
  }, [customerSearch, customerStatusFilter]);

  const customerStartIndex = (customerCurrentPage - 1) * customerPageSize;
  const paginatedCustomers = filteredCustomers.slice(
    customerStartIndex,
    customerStartIndex + customerPageSize
  );

  // Handle Add Customer
  const handleOpenAddCustomerModal = () => {
    setCustLegalName('');
    setCustEmail('');
    setCustPhone('');
    setCustGstin('');
    setCustBillingAddress('');
    setCustBillingState(taxConfig?.stateName || user?.state || 'Karnataka');
    setCustBillingStateCode(taxConfig?.stateCode || '29');
    setCustShippingAddress('');
    setCustShippingSameAsBilling(true);
    setAddCustomerError(null);
    setIsAddCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custLegalName.trim() || !custBillingAddress.trim()) {
      setAddCustomerError('Customer legal name and billing address are required.');
      return;
    }

    setIsSavingCustomer(true);
    setAddCustomerError(null);
    try {
      const shipping = custShippingSameAsBilling ? custBillingAddress.trim() : custShippingAddress.trim() || custBillingAddress.trim();
      const res = await api.createCustomer({
        legal_name: custLegalName.trim(),
        email: custEmail.trim() || undefined,
        phone: custPhone.trim() || undefined,
        gstin: custGstin.trim().toUpperCase() || undefined,
        billing_address: custBillingAddress.trim(),
        billing_state: custBillingState,
        billing_state_code: custBillingStateCode,
        shipping_address: shipping,
        shipping_state: custBillingState,
        shipping_state_code: custBillingStateCode,
        state: custBillingState,
        state_code: custBillingStateCode,
      });

      showToast(`Customer "${res.legal_name || custLegalName}" created successfully.`, 'success');
      setIsAddCustomerModalOpen(false);
      window.dispatchEvent(new CustomEvent('invenza_customers_updated'));
      await loadCustomers();
    } catch (err: any) {
      setAddCustomerError(err.message || 'Failed to create customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Handle Edit Customer
  const handleOpenEditCustomerModal = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToEdit(c);
    setEditCustLegalName(c.legalName);
    setEditCustEmail(c.email || '');
    setEditCustPhone(c.phone || '');
    setEditCustGstin(c.gstin || '');
    setEditCustBillingAddress(c.billingAddress);
    setEditCustBillingState(c.billingState || 'Karnataka');
    setEditCustBillingStateCode(c.billingStateCode || '29');
    setEditCustShippingAddress(c.shippingAddress || c.billingAddress);
    setEditCustIsActive(c.isActive !== false);
    setEditCustomerError(null);
    setIsEditCustomerModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit) return;
    if (!editCustLegalName.trim() || !editCustBillingAddress.trim()) {
      setEditCustomerError('Customer legal name and billing address are required.');
      return;
    }

    setIsUpdatingCustomer(true);
    setEditCustomerError(null);
    try {
      await api.updateCustomer(customerToEdit.id, {
        legal_name: editCustLegalName.trim(),
        email: editCustEmail.trim() || undefined,
        phone: editCustPhone.trim() || undefined,
        gstin: editCustGstin.trim().toUpperCase() || undefined,
        billing_address: editCustBillingAddress.trim(),
        billing_state: editCustBillingState,
        billing_state_code: editCustBillingStateCode,
        shipping_address: editCustShippingAddress.trim() || editCustBillingAddress.trim(),
        shipping_state: editCustBillingState,
        shipping_state_code: editCustBillingStateCode,
        state: editCustBillingState,
        state_code: editCustBillingStateCode,
        is_active: editCustIsActive,
      });

      showToast(`Customer "${editCustLegalName}" updated successfully.`, 'success');
      setIsEditCustomerModalOpen(false);
      setCustomerToEdit(null);
      window.dispatchEvent(new CustomEvent('invenza_customers_updated'));
      await loadCustomers();
    } catch (err: any) {
      setEditCustomerError(err.message || 'Failed to update customer');
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  // Handle Confirm Archive Customer (active -> archived)
  const handleConfirmArchiveCustomer = async () => {
    if (!customerToArchive) return;
    setIsArchivingCustomer(true);
    try {
      await api.archiveCustomer(customerToArchive.id);
      showToast(`Customer "${customerToArchive.legalName}" moved to Archived.`, 'success');
      setCustomerToArchive(null);
      setCustomerStatusFilter('archived');
      window.dispatchEvent(new CustomEvent('invenza_customers_updated'));
      await loadCustomers();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive customer', 'error');
    } finally {
      setIsArchivingCustomer(false);
    }
  };

  // Handle Restore Customer (archived -> active)
  const handleRestoreCustomer = async (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.archiveCustomer(c.id);
      showToast(`Customer "${c.legalName}" restored to Active.`, 'success');
      window.dispatchEvent(new CustomEvent('invenza_customers_updated'));
      await loadCustomers();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore customer', 'error');
    }
  };

  // Handle Open Customer Order History
  const handleOpenCustomerOrders = async (c: Customer) => {
    setSelectedCustomerForOrders(c);
    setIsLoadingCustomerOrders(true);
    setCustomerOrdersData(null);
    try {
      const data = await api.getCustomerOrders(c.id);
      setCustomerOrdersData(data);
    } catch (err: any) {
      console.error('Failed to load customer orders:', err);
      showToast(err.message || 'Failed to fetch customer order history', 'error');
    } finally {
      setIsLoadingCustomerOrders(false);
    }
  };

  const handleNavigateToSalesOrder = (so: any) => {
    setSelectedCustomerForOrders(null);
    setHoveredOrderPopover(null);
    if (onNavigate) {
      onNavigate('sales_orders', {
        orderId: so.id,
        soNumber: so.so_number || so.soNumber || '',
      });
    }
  };

  // =========================================================================
  // SECTION B: TEAM MEMBERS & ROLES STATE (ORIGINAL IMPLEMENTATION PRESERVED)
  // =========================================================================
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Delete Member Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  // Pagination State for Team
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [permissions, setPermissions] = useState<string[]>(['inventory:read', 'inventory:write']);
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Review Email Change Request Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedRequestUser, setSelectedRequestUser] = useState<any | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const [usersData, requestsData] = await Promise.all([
        api.getCompanyUsers(),
        isAdmin ? api.getEmailChangeRequests().catch(() => []) : Promise.resolve([]),
      ]);
      setUsers(usersData || []);
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch team members', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const handleRefresh = () => loadUsers();
    window.addEventListener('invenza_notifications_refresh', handleRefresh);
    return () => {
      window.removeEventListener('invenza_notifications_refresh', handleRefresh);
    };
  }, [isAdmin]);

  const requestsByUserId = useMemo(() => {
    const map: Record<string, any> = {};
    pendingRequests.forEach((req) => {
      if (req.user_id) map[req.user_id] = req;
      if (req.current_email) map[req.current_email.toLowerCase()] = req;
    });
    return map;
  }, [pendingRequests]);

  const openReviewModal = (req: any, u: any) => {
    setSelectedRequest(req);
    setSelectedRequestUser(u);
    setIsReviewModalOpen(true);
  };

  const handleApproveEmailChange = async () => {
    if (!selectedRequest) return;
    setIsReviewSubmitting(true);
    try {
      const res = await api.approveEmailChangeRequest(selectedRequest.id);
      showToast(res.message || `Email change approved! Updated to ${selectedRequest.requested_email}.`, 'success');
      window.dispatchEvent(new CustomEvent('invenza_notifications_refresh'));
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setSelectedRequestUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve email change', 'error');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleRejectEmailChange = async () => {
    if (!selectedRequest) return;
    setIsReviewSubmitting(true);
    try {
      const res = await api.rejectEmailChangeRequest(selectedRequest.id, 'Rejected by organization administrator');
      showToast(res.message || 'Email change request rejected.', 'success');
      window.dispatchEvent(new CustomEvent('invenza_notifications_refresh'));
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setSelectedRequestUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject email change', 'error');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createCompanyUser({
        full_name: fullName,
        email,
        password,
        role,
        permissions,
        send_email: sendEmail,
      });

      showToast(`User ${fullName} created successfully!`, 'success');
      setIsAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('staff');
      setPermissions(['inventory:read', 'inventory:write']);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (u: any) => {
    const isSelf = Boolean(
      user && (
        (u.id && user.id && String(u.id).toLowerCase() === String(user.id).toLowerCase()) ||
        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
      )
    );
    if (isSelf) {
      showToast('Administrators cannot edit their own account through team management.', 'error');
      return;
    }
    setEditingUser(u);
    setEditFullName(u.full_name || '');
    setEditRole(u.role || 'staff');
    setEditPermissions(u.permissions || []);
    setEditIsActive(u.is_active !== false);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsEditSubmitting(true);
      await api.updateCompanyUser(editingUser.id, {
        full_name: editFullName,
        role: editRole,
        permissions: editPermissions,
        is_active: editIsActive,
      });

      showToast(`Updated user ${editFullName}`, 'success');
      setIsEditModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const isSelf = Boolean(
      user && (
        (userToDelete.id && user.id && String(userToDelete.id).toLowerCase() === String(user.id).toLowerCase()) ||
        (userToDelete.email && user.email && userToDelete.email.toLowerCase() === user.email.toLowerCase())
      )
    );
    if (isSelf) {
      showToast('Cannot delete your own admin account.', 'error');
      setUserToDelete(null);
      return;
    }
    try {
      setIsDeletingUser(true);
      await api.deleteCompanyUser(userToDelete.id);
      showToast(`User ${userToDelete.full_name || userToDelete.email} removed`, 'success');
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageMeta
        title={activeMainTab === 'customers' ? "Customers Directory | Invenza Platform" : "Teams & Roles Directory | Invenza Platform"}
        description={activeMainTab === 'customers' ? "Commercial customer database, billing addresses, GSTINs, and order history." : "Enterprise team members, role designations, granular RBAC permissions, and access credentials."}
        canonicalPath={activeMainTab === 'customers' ? "/customers" : "/team"}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-modal flex items-center gap-3 border text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-500/40 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:border-rose-500/40 dark:text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <IconCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <IconAlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner - Compact Enterprise ERP Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeMainTab === 'customers' ? 'Customers' : 'Teams & Roles'}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              {activeMainTab === 'customers' ? (
                <>
                  <IconBuilding className="w-3 h-3" />
                  <span>Commercial Customer Directory</span>
                </>
              ) : (
                <>
                  <IconShieldCheck className="w-3 h-3" />
                  <span>Organization Directory & Access Control</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl truncate sm:whitespace-normal">
            {activeMainTab === 'customers'
              ? 'Commercial customer accounts, GSTIN details, billing addresses, and sales order history.'
              : 'Enterprise team members, role designations, granular RBAC permissions, and access credentials.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {activeMainTab === 'customers' ? (
            <button
              type="button"
              onClick={handleOpenAddCustomerModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          ) : (
            isAdmin && (
              <button
                type="button"
                onClick={() => {
                  generatePassword();
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors"
              >
                <IconUserPlus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Primary Tab Switcher: "Customers" & "Teams & Roles" */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('customers');
            onNavigate?.('customers');
          }}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'customers'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
          }`}
        >
          <IconUsers className="w-4 h-4" />
          <span>Customers</span>
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeMainTab === 'customers'
                ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {customers.length}
          </span>
        </button>

        {isTeamEnabled && (
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('team');
              onNavigate?.('team');
            }}
            className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'team'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
            }`}
          >
            <IconShieldCheck className="w-4 h-4" />
            <span>Teams & Roles</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeMainTab === 'team'
                  ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {users.length}
            </span>
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CUSTOMERS DIRECTORY TABLE & ACTIONS */}
      {/* =================================================================== */}
      {activeMainTab === 'customers' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
          {/* Filter & Search Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, GSTIN, phone, state..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 text-xs font-semibold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'archived', label: 'Archived' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setCustomerStatusFilter(pill.id as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                      customerStatusFilter === pill.id
                        ? 'bg-teal-700 text-white font-bold shadow-subtle'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>


              <button
                type="button"
                onClick={loadCustomers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                <IconRefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Customers Table - Strict Fit Without Horizontal Overflow */}
          <div className="overflow-x-hidden w-full">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="w-[21%] py-3 px-3 font-bold">Customer Name</th>
                  <th className="w-[17%] py-3 px-3 font-bold">Contact Info</th>
                  <th className="w-[21%] py-3 px-3 font-bold">Billing Address & State</th>
                  <th className="w-[13%] py-3 px-2.5 font-bold">Tax ID / GSTIN</th>
                  <th className="w-[10%] py-3 px-2 font-bold text-center">Orders Placed</th>
                  <th className="w-[9%] py-3 px-2 font-bold text-center">Status</th>
                  <th className="w-[9%] py-3 px-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {isLoadingCustomers ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Loading customer directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      <div className="max-w-xs mx-auto space-y-2">
                        <IconUsers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No customers found</p>
                        <p className="text-[11px] text-slate-500">
                          {customerSearch
                            ? 'Try refining your search filter.'
                            : 'Add your first commercial client profile to immediately link orders.'}
                        </p>
                        {!customerSearch && (
                          <button
                            type="button"
                            onClick={handleOpenAddCustomerModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors"
                          >
                            <IconPlus className="w-3.5 h-3.5" />
                            <span>Add Customer</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenCustomerOrders(c)}
                      className="h-[52px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors group"
                      title="Click to view complete sales order history"
                    >
                      {/* Customer Name */}
                      <td className="py-2.5 px-3 overflow-hidden align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20">
                            {c.legalName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" title={c.legalName}>
                              {c.legalName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              ID: {c.id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-2.5 px-3 overflow-hidden align-middle">
                        <div className="min-w-0 space-y-0.5">
                          {c.email ? (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate" title={c.email}>
                              <IconMail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No email</span>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate" title={c.phone}>
                              <IconPhone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Billing Address & State */}
                      <td className="py-2.5 px-3 overflow-hidden align-middle">
                        <div className="min-w-0">
                          <div className="text-slate-800 dark:text-slate-200 truncate" title={c.billingAddress}>
                            {c.billingAddress}
                          </div>
                          <div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono font-medium truncate" title={`${c.billingState || 'Karnataka'} ${c.billingStateCode ? `(${c.billingStateCode})` : ''}`}>
                            {c.billingState || 'Karnataka'} {c.billingStateCode ? `(${c.billingStateCode})` : ''}
                          </div>
                        </div>
                      </td>

                      {/* Tax ID / GSTIN */}
                      <td className="py-2.5 px-2.5 overflow-hidden align-middle">
                        {c.gstin ? (
                          <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 truncate max-w-full" title={c.gstin}>
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono italic truncate block" title="Unregistered / Consumer">
                            Unregistered
                          </span>
                        )}
                      </td>

                      {/* Orders Placed & Lifetime Value */}
                      <td className="py-2.5 px-2 text-center overflow-hidden align-middle">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                            {c.orderCount ?? 0} {c.orderCount === 1 ? 'order' : 'orders'}
                          </span>
                          {(c.totalRevenue ?? 0) > 0 && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                              {formatCurrency(c.totalRevenue ?? 0)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 text-center overflow-hidden align-middle">
                        {c.isActive !== false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit + Archive / Restore */}
                      <td className="py-2.5 px-2.5 text-right overflow-hidden align-middle">
                        <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditCustomerModal(c, e)}
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit customer details"
                            aria-label="Edit customer"
                          >
                            <IconEdit className="w-3.5 h-3.5" />
                          </button>

                          {c.isActive !== false ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerToArchive(c);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Archive customer"
                              aria-label="Archive customer"
                            >
                              <IconArchive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleRestoreCustomer(c, e)}
                              className="p-1 rounded text-amber-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              title="Restore customer (reactivate)"
                              aria-label="Restore customer"
                            >
                              <IconRefreshCw className="w-3.5 h-3.5" />
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

          {/* Shared Pagination Bar */}
          <Pagination
            currentPage={customerCurrentPage}
            totalItems={filteredCustomers.length}
            pageSize={customerPageSize}
            onPageChange={setCustomerCurrentPage}
            onPageSizeChange={setCustomerPageSize}
            itemLabel="customers"
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TEAM MEMBERS TABLE & WORKFLOWS (EXISTING CODE PRESERVED) */}
      {/* =================================================================== */}
      {activeMainTab === 'team' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <IconSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team by name, email, or role..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs text-slate-400 font-mono">
                {filteredUsers.length} of {users.length} members
              </span>
              <button
                type="button"
                onClick={loadUsers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                <IconRefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-bold">Operator</th>
                  <th className="py-3 px-4 font-bold">Role Tier</th>
                  <th className="py-3 px-4 font-bold">Granted Permissions</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Enrolled</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Loading team members...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const req = requestsByUserId[u.id] || requestsByUserId[u.email?.toLowerCase()];
                    const isSelf = Boolean(
                      user && (
                        (u.id && user.id && String(u.id).toLowerCase() === String(user.id).toLowerCase()) ||
                        (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
                      )
                    );
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#161D2B] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/20">
                              {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.full_name || 'Organization Member'}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                                <span>{u.email}</span>
                                {req && (
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(req, u)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30 text-[10px] font-sans hover:bg-amber-500/20 transition-colors"
                                  >
                                    <IconAlertCircle className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                    <span>Pending Change</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' || u.role === 'super_admin'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : u.role === 'manager'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.permissions && u.permissions.length > 0 ? (
                              u.permissions.slice(0, 3).map((p: string) => (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No granular permissions</span>
                            )}
                            {u.permissions && u.permissions.length > 3 && (
                              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400">
                                +{u.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              u.is_active !== false ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                u.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {u.is_active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => !isSelf && handleEditClick(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-md transition-colors ${
                                isSelf
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={isSelf ? 'Cannot edit your own account' : 'Edit roles & permissions'}
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => !isSelf && setUserToDelete(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-md transition-colors ${
                                isSelf
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800'
                              }`}
                              title={isSelf ? 'Cannot delete your own account' : 'Remove team member'}
                            >
                              <IconTrash2 className="w-4 h-4" />
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

          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="team members"
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: ADD CUSTOMER MODAL */}
      {/* =================================================================== */}
      {isAddCustomerModalOpen && (
        <Modal
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)}
          title="Add New Customer / Client"
          subtitle="Register customer profile for direct use across sales orders, invoices, and quotations"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4">
            {addCustomerError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>{addCustomerError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Business Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={custLegalName}
                  onChange={(e) => setCustLegalName(e.target.value)}
                  placeholder="e.g. Acme Industrial Labs Ltd"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="accounts@customer.com"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Identification Number / GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value.toUpperCase())}
                  placeholder="29ABCDE1234F1Z5 (Leave blank for unregistered consumers)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={custBillingAddress}
                  onChange={(e) => setCustBillingAddress(e.target.value)}
                  placeholder="Street address, building, city, postal code"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing State / Place of Supply *
                </label>
                <StateSelectDropdown
                  selectedCode={custBillingStateCode}
                  onSelect={(code, name) => {
                    setCustBillingStateCode(code);
                    setCustBillingState(name);
                  }}
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={custShippingSameAsBilling}
                    onChange={(e) => setCustShippingSameAsBilling(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Shipping address same as billing</span>
                </label>
              </div>

              {!custShippingSameAsBilling && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shipping Address
                  </label>
                  <textarea
                    rows={2}
                    value={custShippingAddress}
                    onChange={(e) => setCustShippingAddress(e.target.value)}
                    placeholder="Warehouse / delivery point address"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCustomer}
                className="flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors disabled:opacity-50"
              >
                {isSavingCustomer && <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isSavingCustomer ? 'Saving Customer...' : 'Create Customer'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: EDIT CUSTOMER MODAL */}
      {/* =================================================================== */}
      {isEditCustomerModalOpen && customerToEdit && (
        <Modal
          isOpen={isEditCustomerModalOpen}
          onClose={() => setIsEditCustomerModalOpen(false)}
          title={`Edit Customer: ${customerToEdit.legalName}`}
          subtitle="Update billing details, contact information, and active account status"
          maxWidth="2xl"
        >
          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            {editCustomerError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>{editCustomerError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Business Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCustLegalName}
                  onChange={(e) => setEditCustLegalName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editCustEmail}
                  onChange={(e) => setEditCustEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Identification Number / GSTIN
                </label>
                <input
                  type="text"
                  value={editCustGstin}
                  onChange={(e) => setEditCustGstin(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editCustBillingAddress}
                  onChange={(e) => setEditCustBillingAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111A] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing State / Place of Supply *
                </label>
                <StateSelectDropdown
                  selectedCode={editCustBillingStateCode}
                  onSelect={(code, name) => {
                    setEditCustBillingStateCode(code);
                    setEditCustBillingState(name);
                  }}
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={editCustIsActive}
                    onChange={(e) => setEditCustIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Active Account (Uncheck to Archive/Soft-delete)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditCustomerModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingCustomer}
                className="flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2 text-xs font-bold text-white shadow-subtle transition-colors disabled:opacity-50"
              >
                {isUpdatingCustomer && <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isUpdatingCustomer ? 'Updating...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: ARCHIVE CUSTOMER CONFIRMATION MODAL */}
      {/* =================================================================== */}
      {customerToArchive && (
        <Modal
          isOpen={Boolean(customerToArchive)}
          onClose={() => setCustomerToArchive(null)}
          title="Archive Customer"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
              <IconAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Archive {customerToArchive.legalName}?
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  This customer will be soft-deleted and moved to the <strong>Archived</strong> filter. They will no longer appear in the active sales order customer dropdown. All past orders and ledger records will be fully preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerToArchive(null)}
                disabled={isArchivingCustomer}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchiveCustomer}
                disabled={isArchivingCustomer}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-subtle disabled:opacity-50"
              >
                {isArchivingCustomer ? (
                  <>
                    <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <IconArchive className="w-3.5 h-3.5" />
                    <span>Archive Customer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: CUSTOMER SALES ORDER HISTORY DETAIL MODAL (ROW CLICK VIEW) */}
      {/* =================================================================== */}
      {selectedCustomerForOrders && (
        <Modal
          isOpen={Boolean(selectedCustomerForOrders)}
          onClose={() => {
            setSelectedCustomerForOrders(null);
            setHoveredOrderPopover(null);
          }}
          title={selectedCustomerForOrders.legalName}
          subtitle={`Commercial Account • ${selectedCustomerForOrders.billingState || 'Karnataka'} • Lifetime Sales Order Ledger`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Customer Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold block">
                  Tax Registration
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                  {selectedCustomerForOrders.gstin || 'Consumer / Unregistered'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold block">
                  Total Orders Placed
                </span>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono mt-0.5 block">
                  {customerOrdersData?.total_orders ?? selectedCustomerForOrders.orderCount ?? 0} orders
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold block">
                  Total Lifetime Spend
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
                  {formatCurrency(customerOrdersData?.total_spent ?? selectedCustomerForOrders.totalRevenue ?? 0)}
                </span>
              </div>
            </div>

            {/* Orders Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed min-w-[700px]">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C1017] text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="w-[22%] py-2.5 px-3 font-bold">SO # / Document</th>
                      <th className="w-[16%] py-2.5 px-3 font-bold">Order Date</th>
                      <th className="w-[34%] py-2.5 px-3 font-bold">Items / Line Products</th>
                      <th className="w-[16%] py-2.5 px-3 font-bold text-right">Total Amount</th>
                      <th className="w-[12%] py-2.5 px-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {isLoadingCustomerOrders ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          <div className="flex items-center justify-center gap-2">
                            <IconRefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                            <span>Loading order history...</span>
                          </div>
                        </td>
                      </tr>
                    ) : !customerOrdersData?.orders || customerOrdersData.orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          <div className="space-y-1">
                            <IconFileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No orders placed yet</p>
                            <p className="text-[11px] text-slate-400">
                              This client has not been booked on any sales orders.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      customerOrdersData.orders.map((so: any) => {
                        const items = so.items || [];
                        const primaryItem = items[0];
                        const additionalCount = items.length - 1;

                        return (
                          <tr
                            key={so.id}
                            onClick={() => handleNavigateToSalesOrder(so)}
                            className="h-[46px] hover:bg-teal-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group select-none"
                            title={`Click to view Sales Order ${so.so_number}`}
                          >
                            {/* SO Number & Document */}
                            <td className="h-[46px] py-2 px-3 overflow-hidden align-middle">
                              <div className="font-mono font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center gap-1.5">
                                <span>{so.so_number}</span>
                                <IconChevronRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </div>
                              {so.invoice_number && (
                                <div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono truncate">
                                  Doc: {so.invoice_number}
                                </div>
                              )}
                            </td>

                            {/* Order Date */}
                            <td className="h-[46px] py-2 px-3 overflow-hidden align-middle font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {so.order_date ? new Date(so.order_date).toLocaleDateString() : 'N/A'}
                            </td>

                            {/* Line Products: Strictly 1 line with +N more popover */}
                            <td className="h-[46px] py-2 px-3 overflow-hidden align-middle">
                              {primaryItem ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]"
                                    title={`${primaryItem.product_name} (${primaryItem.sku}) × ${primaryItem.ordered_qty}`}
                                  >
                                    {primaryItem.product_name}
                                  </span>

                                  {additionalCount > 0 && (
                                    <div className="relative inline-block shrink-0">
                                      <span
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredOrderPopover({
                                            orderId: so.id,
                                            items,
                                            rect,
                                          });
                                        }}
                                        onMouseLeave={() => setHoveredOrderPopover(null)}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 cursor-help"
                                      >
                                        +{additionalCount} more
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No items</span>
                              )}
                            </td>

                            {/* Total Amount */}
                            <td className="h-[46px] py-2 px-3 text-right overflow-hidden align-middle font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                              {formatCurrency(so.total_amount)}
                            </td>

                            {/* Status */}
                            <td className="h-[46px] py-2 px-3 text-center overflow-hidden align-middle">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                                  so.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                    : so.status === 'invoiced' || so.status === 'receipted'
                                    ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20'
                                    : so.status === 'dispatched'
                                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                    : so.status === 'void'
                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {so.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating Popover for +N more items */}
      {hoveredOrderPopover && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 300, Math.max(10, hoveredOrderPopover.rect.left - 50))}px`,
            top: `${hoveredOrderPopover.rect.bottom + 6}px`,
            zIndex: 9999,
          }}
          className="w-72 p-3 rounded-xl bg-slate-900 dark:bg-slate-950 text-white shadow-2xl border border-slate-700 ring-1 ring-white/10 pointer-events-none space-y-2 text-xs"
        >
          <div className="font-bold text-teal-300 text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>All Line Items ({hoveredOrderPopover.items.length})</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {hoveredOrderPopover.items.map((it: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="truncate mr-2">
                  <div className="font-medium text-slate-200 truncate">{it.product_name}</div>
                  <div className="font-mono text-[9px] text-slate-400">{it.sku}</div>
                </div>
                <span className="font-mono font-bold text-teal-400 shrink-0">
                  × {it.ordered_qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: ADD TEAM MEMBER MODAL (ORIGINAL) */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-xl shadow-modal relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Team Member</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assign role, access permissions, and dispatch credentials via email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Work Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Initial Password *
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Generate New
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full font-mono pl-3.5 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                    <IconLock className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'staff', label: 'Staff', desc: 'Warehouse & picking staff' },
                      { id: 'manager', label: 'Manager', desc: 'Warehouse supervisor' },
                      { id: 'admin', label: 'Admin', desc: 'Full organization access' },
                    ].map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          role === r.id
                            ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-500/15'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white capitalize flex items-center justify-between">
                          <span>{r.label}</span>
                          {role === r.id && <IconCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Granular Inventory Permissions
                  </label>
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-[#F4F5F8] dark:bg-[#0C1017]">
                    {GRANULAR_PERMISSIONS.map((p) => {
                      const checked = permissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPermissions([...permissions, p.id]);
                              } else {
                                setPermissions(permissions.filter((id) => id !== p.id));
                              }
                            }}
                            className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{p.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <IconSend className="w-3.5 h-3.5 text-teal-600" />
                      Dispatch temporary credentials and onboarding link to user's email
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-end gap-2.5 bg-slate-50 dark:bg-[#10151E] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: EDIT TEAM MEMBER MODAL (ORIGINAL) */}
      {/* =================================================================== */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 rounded-xl shadow-modal relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Team Member</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update role level and granted privileges for {editingUser.email}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['staff', 'manager', 'admin'].map((r) => (
                      <div
                        key={r}
                        onClick={() => setEditRole(r)}
                        className={`p-3 rounded-lg border cursor-pointer capitalize font-bold text-xs flex items-center justify-between transition-all ${
                          editRole === r
                            ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{r}</span>
                        {editRole === r && <IconCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Granted Permissions
                  </label>
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-[#F4F5F8] dark:bg-[#0C1017]">
                    {GRANULAR_PERMISSIONS.map((p) => {
                      const checked = editPermissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditPermissions([...editPermissions, p.id]);
                              } else {
                                setEditPermissions(editPermissions.filter((id) => id !== p.id));
                              }
                            }}
                            className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{p.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Active Account (Allow login & API access)
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-end gap-2.5 bg-slate-50 dark:bg-[#10151E] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-subtle transition-colors disabled:opacity-50"
                >
                  {isEditSubmitting ? (
                    <>
                      <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: REVIEW EMAIL CHANGE REQUEST MODAL (ORIGINAL) */}
      {/* =================================================================== */}
      {isReviewModalOpen && selectedRequest && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedRequest(null);
            setSelectedRequestUser(null);
          }}
          title="Review Work Email Change Request"
          subtitle="Authorize corporate credential update for organization operator"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <IconAlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs">Administrative Approval Required</p>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Approving will immediately re-key this operator's login email and revoke existing active session tokens.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] space-y-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Operator</span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {selectedRequest.user_name || selectedRequestUser?.full_name || 'Organization Member'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Current Email</span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{selectedRequest.current_email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400 block font-bold">Requested Email</span>
                  <span className="font-mono text-[11px] font-bold text-teal-600 dark:text-teal-400">{selectedRequest.requested_email}</span>
                </div>
              </div>
              {selectedRequest.reason && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Reason Provided</span>
                  <p className="text-[11px] italic text-slate-600 dark:text-slate-400 mt-0.5">"{selectedRequest.reason}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                disabled={isReviewSubmitting}
                onClick={handleRejectEmailChange}
                className="rounded-lg border border-rose-200 dark:border-rose-900/40 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={isReviewSubmitting}
                onClick={handleApproveEmailChange}
                className="rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-subtle flex items-center gap-1.5 transition-colors"
              >
                {isReviewSubmitting ? <IconRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <IconCheck className="w-3.5 h-3.5" />}
                <span>{isReviewSubmitting ? 'Approving...' : 'Approve & Re-key Account'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL 7: DELETE MEMBER CONFIRMATION MODAL (ORIGINAL) */}
      {/* =================================================================== */}
      {userToDelete && (
        <Modal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          title="Remove Organization Member"
          subtitle="Confirm operator removal & platform credential revocation"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-rose-800 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <IconTrash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    Are you sure you want to remove <span className="text-rose-600 dark:text-rose-400">{userToDelete.full_name}</span>?
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {userToDelete.email} &bull; Role: {userToDelete.role}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              This member will be permanently removed from your organization and their login credentials will be revoked immediately. Any past audit logs or movements logged by this operator will remain preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-subtle flex items-center gap-1.5 transition-all shadow-rose-500/20"
              >
                {isDeletingUser ? <IconRefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isDeletingUser ? 'Removing...' : 'Remove Member'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
