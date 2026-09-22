/**
 * Invenza API Client
 * Connects React frontend to FastAPI backend endpoints.
 * Automatically handles JWT authentication, Super Admin operations, and Tenant isolation.
 */

// Use relative '/api/v1' so requests flow through Vite dev proxy (or Nginx in production).
// This enables mobile devices and other LAN clients (e.g. 192.168.x.x:5173) to connect seamlessly
// rather than failing on hardcoded '127.0.0.1' (which refers to the phone itself).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('invenza_token');
}

export function getActiveTenantId(): string | null {
  try {
    const userStr = localStorage.getItem('invenza_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      return u.tenantId || u.tenant_id || null;
    }
  } catch {}
  return null;
}

export async function fetchWithFallback<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = getAuthToken();
    const tenantId = getActiveTenantId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      ...(options?.headers as Record<string, string> || {}),
    };

    const res = await fetch(`${API_BASE_URL}${url}`, {
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error(errBody.detail || 'Access Forbidden: Company account deactivated or insufficient permissions.');
      }
      if (options?.method && options.method !== 'GET') {
        throw new Error(errBody.detail || `Request failed with status ${res.status}`);
      }
      console.warn(`API response status ${res.status} on ${url}:`, errBody);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    if (err?.message && (err.message.includes('Access Forbidden') || (options?.method && options.method !== 'GET'))) {
      throw err;
    }
    console.warn(`Backend call failed for ${url}, fallback to local store:`, err);
    return null;
  }
}

export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Invalid email or password');
      }
      return await res.json();
    } catch (err: any) {
      throw err;
    }
  },

  getSetupStatus: async (): Promise<{ needsSetup: boolean }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/setup-status`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return { needsSetup: false };
      return await res.json();
    } catch {
      return { needsSetup: false };
    }
  },

  setupAdmin: async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || 'Setup failed. Please try again.');
    }
    return await res.json();
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
  },

  changePassword: async (data: { currentPassword?: string; newPassword: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || 'Failed to update password');
    }
    return await res.json();
  },

  getLicenseStatus: async () => {
    return await fetchWithFallback<any>('/license/status');
  },

  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to dispatch reset code.');
    }
    return await res.json();
  },

  verifyResetOtp: async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid verification code.');
    }
    return await res.json();
  },

  resetPassword: async (data: { email: string; otp: string; new_password: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update password.');
    }
    return await res.json();
  },

  getCurrentUser: async () => fetchWithFallback<any>('/auth/me'),

  // Super Admin Endpoints
  getCompanies: async (search?: string, industry?: string, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (industry && industry !== 'all') params.append('industry', industry);
    if (activeOnly !== undefined) params.append('active_only', String(activeOnly));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<any[]>(`/superadmin/companies${qs}`);
  },

  provisionCompany: async (data: {
    company_name: string;
    company_code?: string;
    unique_code?: string;
    industry: string;
    location: string;
    state?: string;
    pincode?: string;
    country_code: string;
    tax_engine?: string;
    tier?: string;
    tags?: string[];
    lead_id?: string;
    setup_fee: number;
    monthly_maintenance_fee: number;
    quoted_setup_fee?: number;
    admin_full_name: string;
    admin_email: string;
    admin_password: string;
    enabled_modules: string[];
    send_email: boolean;
  }) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to provision company.');
    }
    return await res.json();
  },

  updateCompany: async (companyId: string, data: any) =>
    fetchWithFallback<any>(`/superadmin/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleCompanyStatus: async (companyId: string) =>
    fetchWithFallback<any>(`/superadmin/companies/${companyId}/toggle-status`, {
      method: 'PATCH',
    }),

  archiveCompany: async (companyId: string, archive: boolean = true) =>
    fetchWithFallback<any>(`/superadmin/companies/${companyId}/archive?archive=${archive}`, {
      method: 'POST',
    }),

  getCompanyAnalytics: async (companyId: string) =>
    fetchWithFallback<any>(`/superadmin/companies/${companyId}/analytics`),

  getPlatformReport: async () =>
    fetchWithFallback<any>('/superadmin/reports/platform'),

  // Prospective Leads & Quotations
  submitLeadInquiry: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/leads/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit quotation inquiry.');
    }
    const result = await res.json();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('invenza_notifications_refresh'));
    }
    return result;
  },

  getLeads: async (status?: string) => {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return fetchWithFallback<any[]>(`/superadmin/leads${qs}`);
  },

  updateLeadStatus: async (leadId: string, status: string, quoted_amount?: number, notes?: string) => {
    const res = await fetchWithFallback<any>(`/superadmin/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, quoted_amount, notes }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('invenza_notifications_refresh'));
    }
    return res;
  },

  // Security Safeguards (Dual-Authorization Queue & Audit Logs)
  getSecurityRequests: async (status?: string) => {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return fetchWithFallback<any[]>(`/safeguards/queue${qs}`);
  },

  createSecurityRequest: async (data: {
    tenant_id: string;
    action_type: string;
    target_type?: string;
    target_id?: string;
    payload?: any;
    reason?: string;
  }) =>
    fetchWithFallback<any>('/safeguards/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveSecurityRequest: async (requestId: string, notes?: string) =>
    fetchWithFallback<any>(`/safeguards/queue/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  rejectSecurityRequest: async (requestId: string, rejection_reason?: string) =>
    fetchWithFallback<any>(`/safeguards/queue/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    }),

  getAuditLogs: async (params?: {
    tenant_id?: string;
    action_type?: string;
    actor_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.tenant_id) query.append('tenant_id', params.tenant_id);
    if (params?.action_type && params.action_type !== 'all') query.append('action_type', params.action_type);
    if (params?.actor_id) query.append('actor_id', params.actor_id);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithFallback<any[]>(`/safeguards/audit-logs${qs}`);
  },

  getSecurityAuditLogs: async (params?: Parameters<typeof api.getAuditLogs>[0]) =>
    api.getAuditLogs(params),

  // Role Management (Tenant-Scoped RBAC)
  getRoleOrganizations: async () =>
    fetchWithFallback<any[]>('/role-management/organizations'),

  getRoleOrganizationTeam: async (tenantId: string) =>
    fetchWithFallback<any[]>(`/role-management/organizations/${tenantId}/team`),

  createRoleOrganizationUser: async (
    tenantId: string,
    data: { full_name: string; email: string; password: string; role: string; permissions?: string[]; send_email?: boolean }
  ) =>
    fetchWithFallback<any>(`/role-management/organizations/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUserRoleAndPermissions: async (
    userId: string,
    data: { role: string; permissions: string[]; force_last_admin?: boolean }
  ) =>
    fetchWithFallback<any>(`/role-management/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleRoleUserStatus: async (userId: string, is_active: boolean) =>
    fetchWithFallback<any>(`/role-management/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),

  // Billing & Subscriptions
  getBillingOverview: async (params?: { status?: string; industry?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.industry && params.industry !== 'all') query.append('industry', params.industry);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithFallback<any>(`/billing/overview${qs}`);
  },

  getTenantBillingDetail: async (tenantId: string) =>
    fetchWithFallback<any>(`/billing/tenants/${tenantId}`),

  updateSetupFee: async (
    tenantId: string,
    data: { setup_fee: number; setup_fee_status: string; payment_mode?: string; notes?: string }
  ) =>
    fetchWithFallback<any>(`/billing/tenants/${tenantId}/setup-fee`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateMaintenanceFee: async (
    tenantId: string,
    data: { new_monthly_fee: number; effective_from?: string; reason?: string }
  ) =>
    fetchWithFallback<any>(`/billing/tenants/${tenantId}/update-fee`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordBillingPayment: async (
    tenantId: string,
    data: {
      cycle_month: string;
      amount: number;
      payment_mode: string;
      status?: string;
      transaction_reference?: string;
      notes?: string;
    }
  ) =>
    fetchWithFallback<any>(`/billing/tenants/${tenantId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markSetupFeePaid: async (
    setupFeeId: string,
    data: {
      confirmed_amount: number;
      date_received?: string;
      payment_mode: string;
      note?: string;
    }
  ) =>
    fetchWithFallback<any>(`/billing/setup-fee/${setupFeeId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markCyclePaid: async (
    cycleId: string,
    data: {
      confirmed_amount: number;
      date_received?: string;
      payment_mode: string;
      note?: string;
    }
  ) =>
    fetchWithFallback<any>(`/billing/cycles/${cycleId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markCycleWaived: async (
    cycleId: string,
    data: {
      reason_note: string;
    }
  ) =>
    fetchWithFallback<any>(`/billing/cycles/${cycleId}/mark-waived`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrgMaintenanceRate: async (
    tenantId: string,
    data: {
      new_rate: number;
      effective_from?: string;
      reason?: string;
    }
  ) =>
    fetchWithFallback<any>(`/billing/tenants/${tenantId}/maintenance-plan`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  triggerCycleGeneration: async (cycleMonth?: string) =>
    fetchWithFallback<any>('/billing/cycles/generate', {
      method: 'POST',
      body: JSON.stringify({ cycle_month: cycleMonth }),
    }),

  downloadSetupFeeInvoicePdfById: async (setupFeeId: string, invoiceNumber?: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/billing/setup-fee/${setupFeeId}/invoice-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch {}
      throw new Error(`Failed to download setup fee invoice: ${errDetail}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (invoiceNumber || `setup_fee_${setupFeeId}`).replace(/[\/\\]/g, '_');
    a.download = `Invoice_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  downloadCycleInvoicePdfById: async (cycleId: string, invoiceNumber?: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/billing/cycles/${cycleId}/invoice-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch {}
      throw new Error(`Failed to download cycle invoice: ${errDetail}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (invoiceNumber || `cycle_${cycleId}`).replace(/[\/\\]/g, '_');
    a.download = `Invoice_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  downloadBillingPaymentPdf: async (tenantId: string, paymentId: string, invoiceNumber?: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/billing/tenants/${tenantId}/payments/${paymentId}/invoice-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch {}
      throw new Error(`Failed to download billing invoice: ${errDetail}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (invoiceNumber || `billing_${paymentId}`).replace(/[\/\\]/g, '_');
    a.download = `Invoice_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  downloadBillingSetupFeePdf: async (tenantId: string, invoiceNumber?: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/billing/tenants/${tenantId}/setup-fee/invoice-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch {}
      throw new Error(`Failed to download setup fee invoice: ${errDetail}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (invoiceNumber || `setup_fee_${tenantId}`).replace(/[\/\\]/g, '_');
    a.download = `Invoice_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  // Company Team & Users
  getCompanyUsers: async () => fetchWithFallback<any[]>('/settings'),

  createSettingsUser: async (data: {
    name: string;
    email: string;
    role?: string;
    assigned_godown_id?: string | null;
  }) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/settings/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to create user.');
    }
    return await res.json();
  },

  createCompanyUser: async (data: {
    full_name?: string;
    name?: string;
    email: string;
    password?: string;
    role?: string;
    assigned_godown_id?: string | null;
    permissions?: string[];
    send_email?: boolean;
  }) => {
    const token = getAuthToken();
    const roleMapping: Record<string, string> = {
      admin: 'OWNER',
      owner: 'OWNER',
      manager: 'MANAGER',
      staff: 'STAFF',
    };
    const roleKey = (data.role || 'staff').toLowerCase();
    const assignedRole = roleMapping[roleKey] || data.role || 'STAFF';

    const payload = {
      name: (data.name || data.full_name || '').trim(),
      email: data.email.trim(),
      role: assignedRole,
      assigned_godown_id: data.assigned_godown_id || null,
    };

    const res = await fetch(`${API_BASE_URL}/settings/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to create user.');
    }
    return await res.json();
  },

  updateCompanyUser: async (userId: string, data: any) =>
    fetchWithFallback<any>(`/company/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCompanyUser: async (userId: string) =>
    fetchWithFallback<any>(`/company/users/${userId}`, {
      method: 'DELETE',
    }),

  // Health
  checkHealth: async () => fetchWithFallback<{ status: string }>('/health'),

  // Products
  getProducts: async () => fetchWithFallback<any[]>('/products/'),
  createProduct: async (data: any) =>
    fetchWithFallback<any>('/products/', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: async (id: string, data: any) =>
    fetchWithFallback<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: async (id: string) =>
    fetchWithFallback<any>(`/products/${id}`, { method: 'DELETE' }),
  bulkCreateProducts: async (data: any[]) =>
    fetchWithFallback<any[]>('/products/bulk-import', { method: 'POST', body: JSON.stringify(data) }),
  clearAllProducts: async () =>
    fetchWithFallback<any>('/products/clear-all', { method: 'DELETE' }),

  // Danger Zone Multi-Step Verification & Dual Authorization
  sendDangerZoneOtp: async (action: string, email?: string) =>
    fetchWithFallback<any>('/danger-zone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ action, email }),
    }),
  verifyDangerZoneCredentials: async (password: string, otp: string, action: string, email?: string) =>
    fetchWithFallback<any>('/danger-zone/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({ password, otp, action, email }),
    }),
  clearCatalogVerified: async (password: string, otp: string, email?: string) =>
    fetchWithFallback<any>('/danger-zone/clear-catalog', {
      method: 'POST',
      body: JSON.stringify({ password, otp, action: 'clear_catalog', email }),
    }),
  requestLedgerPurge: async (password: string, otp: string, reason?: string, email?: string) =>
    fetchWithFallback<any>('/danger-zone/request-ledger-purge', {
      method: 'POST',
      body: JSON.stringify({ password, otp, reason, email }),
    }),
  getLedgerPurgeRequests: async () =>
    fetchWithFallback<any[]>('/danger-zone/ledger-purge-requests'),
  approveLedgerPurge: async (requestId: string) =>
    fetchWithFallback<any>(`/danger-zone/approve-ledger-purge/${requestId}`, {
      method: 'POST',
    }),
  rejectLedgerPurge: async (requestId: string, reason?: string) =>
    fetchWithFallback<any>(`/danger-zone/reject-ledger-purge/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Locations
  getLocations: async () => fetchWithFallback<any[]>('/locations/'),
  createLocation: async (data: any) =>
    fetchWithFallback<any>('/locations/', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: async (id: string, data: any) =>
    fetchWithFallback<any>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Ledger
  getMovements: async () => fetchWithFallback<any[]>('/ledger/'),
  clearLedger: async () =>
    fetchWithFallback<any>('/ledger/clear-all', { method: 'DELETE' }),

  // Orders
  getPurchaseOrders: async () => fetchWithFallback<any[]>('/orders/purchase-orders'),
  createPurchaseOrder: async (data: any) =>
    fetchWithFallback<any>('/orders/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  receiveGoodsGRN: async (poId: string, notes?: string) =>
    fetchWithFallback<any>(`/orders/purchase-orders/${poId}/receive`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  getSalesOrders: async () => fetchWithFallback<any[]>('/orders/sales-orders'),
  createSalesOrder: async (data: any) =>
    fetchWithFallback<any>('/orders/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  fulfillSalesOrder: async (soId: string) =>
    fetchWithFallback<any>(`/orders/sales-orders/${soId}/fulfill`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  dispatchSalesOrder: async (soId: string, dispatchedBy?: string) =>
    fetchWithFallback<any>(`/orders/sales-orders/${soId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ dispatched_by: dispatchedBy }),
    }),
  voidSalesOrder: async (soId: string, reason: string) =>
    fetchWithFallback<any>(`/orders/sales-orders/${soId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deleteSalesOrder: async (soId: string) =>
    fetchWithFallback<any>(`/orders/sales-orders/${soId}`, {
      method: 'DELETE',
    }),
    paySalesOrder: async (
    soId: string,
    paymentData?: { payment_method?: string; payment_reference?: string; paid_at?: string }
  ) =>
    fetchWithFallback<any>(`/orders/sales-orders/${soId}/pay`, {
      method: 'POST',
      body: paymentData ? JSON.stringify(paymentData) : undefined,
    }),

  // Customers
  getCustomers: async (search?: string, statusFilter?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter && statusFilter !== 'all') params.append('status_filter', statusFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<any[]>(`/customers${qs}`);
  },
  createCustomer: async (data: any) =>
    fetchWithFallback<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: async (id: string, data: any) =>
    fetchWithFallback<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveCustomer: async (id: string) =>
    fetchWithFallback<any>(`/customers/${id}/archive`, { method: 'POST' }),
  getCustomerOrders: async (id: string) =>
    fetchWithFallback<any>(`/customers/${id}/orders`),

  // Transfers
  getTransfers: async () => fetchWithFallback<any[]>('/transfers/'),
  createTransfer: async (data: any) =>
    fetchWithFallback<any>('/transfers/', { method: 'POST', body: JSON.stringify(data) }),

  // Adjustments
  getAdjustments: async () => fetchWithFallback<any[]>('/adjustments/'),
  createAdjustment: async (data: any) =>
    fetchWithFallback<any>('/adjustments/', { method: 'POST', body: JSON.stringify(data) }),
  bulkAdjustStock: async (data: any[]) =>
    fetchWithFallback<any>('/adjustments/bulk', { method: 'POST', body: JSON.stringify({ adjustments: data }) }),

  // Valuation Reports
  getValuationReport: async () => fetchWithFallback<any>('/reports/valuation'),

  // MinIO Storage
  checkStorageHealth: async () => fetchWithFallback<any>('/storage/health'),
  listStoredFiles: async () => fetchWithFallback<any[]>('/storage/list'),
  uploadFile: async (formData: FormData) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Upload failed: status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Storage upload error:', err);
      throw err;
    }
  },

  // Invoices & Tax
  getInvoices: async (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithFallback<any[]>(`/invoices${qs}`);
  },
  getInvoice: async (invoiceId: string) => fetchWithFallback<any>(`/invoices/${invoiceId}`),
  getInvoicePdfUrl: (invoiceId: string) => {
    const token = getAuthToken();
    return `${API_BASE_URL}/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  getSalesOrderPdfUrl: (soId: string) => {
    const token = getAuthToken();
    return `${API_BASE_URL}/orders/sales-orders/${soId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadInvoicePdf: async (invoiceId: string, invoiceNumber: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/pdf?download=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Failed to download invoice: ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (invoiceNumber || 'invoice').replace(/[\/\\]/g, '_');
    a.download = `Tax_Invoice_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
  downloadSalesOrderPdf: async (soId: string, soNumber: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/orders/sales-orders/${soId}/pdf?download=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Failed to download sales order PDF: ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (soNumber || 'order').replace(/[\/\\]/g, '_');
    a.download = `Sales_Order_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
  voidInvoice: async (invoiceId: string) =>
    fetchWithFallback<any>(`/invoices/${invoiceId}/void`, { method: 'POST' }),
  markInvoicePaid: async (
    invoiceId: string,
    paymentData?: { payment_method?: string; payment_reference?: string; paid_at?: string }
  ) =>
    fetchWithFallback<any>(`/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: paymentData ? JSON.stringify(paymentData) : undefined,
    }),
  getTenantInvoicingSettings: async () => fetchWithFallback<any>('/invoices/settings/company'),
  updateTenantInvoicingSettings: async (data: any) =>
    fetchWithFallback<any>('/invoices/settings/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadCompanyLogo: async (formData: FormData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/invoices/settings/upload-logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Logo upload failed');
    return await res.json();
  },
  uploadAuthorizedSignature: async (formData: FormData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/invoices/settings/upload-signature`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Signature upload failed');
    return await res.json();
  },

  // AI Copilot
  chatWithCopilot: async (messages: { role: string; content: string }[]) =>
    fetchWithFallback<any>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  // Profile & Account Management
  getProfile: async () => fetchWithFallback<any>('/profile/me'),
  updateUserName: async (fullName: string) =>
    fetchWithFallback<any>('/profile/user', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName }),
    }),
  updateCompanyDetails: async (data: { name: string; industry?: string; location?: string }) =>
    fetchWithFallback<any>('/profile/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  resetProfilePassword: async (currentPassword: string, newPassword: string) =>
    fetchWithFallback<any>('/profile/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),
  requestEmailChange: async (requestedEmail: string, reason?: string) =>
    fetchWithFallback<any>('/profile/request-email-change', {
      method: 'POST',
      body: JSON.stringify({
        requested_email: requestedEmail,
        reason: reason || null,
      }),
    }),
  cancelEmailChangeRequest: async () =>
    fetchWithFallback<any>('/profile/request-email-change', {
      method: 'DELETE',
    }),
  getEmailChangeRequests: async () =>
    fetchWithFallback<any[]>('/profile/email-change-requests'),
  approveEmailChangeRequest: async (requestId: string) =>
    fetchWithFallback<any>(`/profile/email-change-requests/${requestId}/approve`, {
      method: 'POST',
    }),
  rejectEmailChangeRequest: async (requestId: string) =>
    fetchWithFallback<any>(`/profile/email-change-requests/${requestId}/reject`, {
      method: 'POST',
    }),

  // Invenaro Platform Extensions
  getEntitlements: async () => fetchWithFallback<any>('/entitlements'),
  getMe: async () => fetchWithFallback<any>('/auth/me'),
  getGodowns: async () => fetchWithFallback<any[]>('/godowns'),
  createGodown: async (data: any) =>
    fetchWithFallback<any>('/godowns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchTransfer: async (id: string) =>
    fetchWithFallback<any>(`/transfers/${id}/dispatch`, {
      method: 'POST',
    }),
  receiveTransfer: async (id: string) =>
    fetchWithFallback<any>(`/transfers/${id}/receive`, {
      method: 'POST',
    }),
  receivePurchaseOrder: async (id: string) =>
    fetchWithFallback<any>(`/purchase-orders/${id}/receive`, {
      method: 'POST',
    }),
  getLedger: async (query?: { godown_id?: string; product_id?: string; movement_type?: string }) => {
    const q = new URLSearchParams();
    if (query?.godown_id) q.set('godown_id', query.godown_id);
    if (query?.product_id) q.set('product_id', query.product_id);
    if (query?.movement_type) q.set('movement_type', query.movement_type);
    const qs = q.toString();
    return fetchWithFallback<any>(`/ledger${qs ? '?' + qs : ''}`);
  },
  getSettings: async () => fetchWithFallback<any>('/settings'),
  updateSettings: async (data: any) =>
    fetchWithFallback<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
