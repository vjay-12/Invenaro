import React, { useState, useEffect, useMemo } from 'react';
import {
  IconShieldCheck as Shield,
  IconCheck as CheckCircle2,
  IconAlertCircle as AlertCircle,
  IconAlertTriangle as AlertTriangle,
  IconRefreshCw as RefreshCw,
  IconClock as Clock,
  IconUsers as Users,
  IconBuilding as Building2,
  IconSearch as Search,
  IconLayers as Layers,
} from '../components/icons';
import { api } from '../services/api';
import { PageMeta } from '../components/common/PageMeta';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { Pagination } from '../components/common/Pagination';

interface SecuritySafeguardsProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

export const SecuritySafeguards: React.FC<SecuritySafeguardsProps> = ({ onNavigate }) => {
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approval Queue State
  const [queueRequests, setQueueRequests] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('all');
  const [queueActionFilter, setQueueActionFilter] = useState<string>('all');
  const [queueSearchTerm, setQueueSearchTerm] = useState<string>('');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Confirmation Modal for High-Impact Approval/Rejection
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    type: 'approve' | 'reject';
    request: any;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      // Fetch all requests so counts and client filtering remain stable
      const data = await api.getSecurityRequests('all');
      if (Array.isArray(data)) {
        setQueueRequests(data);
      }
    } catch (err: any) {
      console.warn('Failed to load safeguards queue:', err);
      showToast('Failed to fetch approval queue', 'error');
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleExecuteApproval = async () => {
    if (!actionConfirmModal) return;
    const req = actionConfirmModal.request;
    setProcessingRequestId(req.id);
    try {
      await api.approveSecurityRequest(req.id, actionNotes);
      showToast(`Privileged action "${formatActionLabel(req.action_type)}" approved and executed for ${req.tenant_name}.`);
      setActionConfirmModal(null);
      setActionNotes('');
      loadQueue();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleExecuteRejection = async () => {
    if (!actionConfirmModal) return;
    const req = actionConfirmModal.request;
    if (!actionNotes.trim()) {
      showToast('Please provide a reason for rejecting this sensitive action.', 'error');
      return;
    }
    setProcessingRequestId(req.id);
    try {
      await api.rejectSecurityRequest(req.id, actionNotes.trim());
      showToast(`Privileged action "${formatActionLabel(req.action_type)}" has been rejected.`);
      setActionConfirmModal(null);
      setActionNotes('');
      loadQueue();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Helper formatting
  const formatActionLabel = (act: string) => {
    return act
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionBadgeColor = (act: string) => {
    if (act.includes('purge') || act.includes('remove_last_admin') || act.includes('deactivate')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
    }
    if (act.includes('fee') || act.includes('billing')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
    }
    return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25';
  };

  // Fixed counters derived from the full queue
  const totalRequestsCount = queueRequests.length;
  const pendingQueueCount = queueRequests.filter((r) => r.status === 'pending').length;
  const approvedQueueCount = queueRequests.filter((r) => r.status === 'approved').length;
  const rejectedQueueCount = queueRequests.filter((r) => r.status === 'rejected').length;

  const queueFilterOptions: DropdownOption[] = [
    { value: 'all', label: `All Requests (${totalRequestsCount})` },
    { value: 'pending', label: `Pending Approvals (${pendingQueueCount})` },
    { value: 'approved', label: `Approved Actions (${approvedQueueCount})` },
    { value: 'rejected', label: `Rejected Actions (${rejectedQueueCount})` },
  ];

  const queueActionOptions: DropdownOption[] = [
    { value: 'all', label: 'All Action Types' },
    { value: 'ledger_purge', label: 'Ledger Purge' },
    { value: 'remove_last_admin', label: 'Sole Admin Removal' },
    { value: 'fee_waiver', label: 'Billing Fee Waiver' },
    { value: 'deactivate_tenant', label: 'Tenant Deactivation' },
    { value: 'export_customer_data', label: 'Export Customer Data' },
  ];

  const filteredQueueRequests = useMemo(() => {
    return queueRequests.filter((r) => {
      // Status filter
      if (queueStatusFilter !== 'all' && r.status !== queueStatusFilter) {
        return false;
      }
      // Action type filter
      if (queueActionFilter !== 'all' && r.action_type !== queueActionFilter) {
        return false;
      }
      // Search term
      if (queueSearchTerm.trim()) {
        const q = queueSearchTerm.toLowerCase();
        const actionMatch = r.action_type.toLowerCase().includes(q);
        const orgMatch = (r.tenant_name || '').toLowerCase().includes(q);
        const reqMatch = (r.requester_email || '').toLowerCase().includes(q) || (r.requester_name || '').toLowerCase().includes(q);
        const refMatch = (r.target_id || '').toLowerCase().includes(q) || (r.details?.reference_code || '').toLowerCase().includes(q);
        const reasonMatch = (r.reason || '').toLowerCase().includes(q);
        return actionMatch || orgMatch || reqMatch || refMatch || reasonMatch;
      }
      return true;
    });
  }, [queueRequests, queueStatusFilter, queueActionFilter, queueSearchTerm]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [queueSearchTerm, queueStatusFilter, queueActionFilter, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedQueueRequests = filteredQueueRequests.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-2">
      <PageMeta
        title="Security Safeguards & Dual Authorization | Invenza Platform"
        description="Two-man rule approval queue for sensitive tenant actions across the Invenza platform."
        canonicalPath="/security-safeguards"
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
            <Shield className="w-3.5 h-3.5" />
            <span>Multi-Tenant Platform Governance</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security Safeguards & Dual Authorization
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Protect tenant integrity through two-man rule sign-offs on sensitive actions requiring explicit Super Admin approval.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadQueue}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
            title="Refresh Approval Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-500 ${isLoadingQueue ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* APPROVAL QUEUE CONTENT */}
      <div className="space-y-3.5">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Pending Approvals</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {pendingQueueCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Dual-authorization requests</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Approved Actions</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {approvedQueueCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Signed & executed</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Rejected Actions</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {rejectedQueueCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Safeguarded rejections</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800/80 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Avg Resolution Time</span>
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              &lt; 2h
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Super Admin SLA</div>
          </div>
        </div>

        {/* Action Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, organization, requester email, reference ID..."
              value={queueSearchTerm}
              onChange={(e) => setQueueSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48 shrink-0">
              <SimpleSelectDropdown
                options={queueActionOptions}
                value={queueActionFilter}
                onChange={setQueueActionFilter}
                placeholder="Action Type"
              />
            </div>
            <div className="w-48 shrink-0">
              <SimpleSelectDropdown
                options={queueFilterOptions}
                value={queueStatusFilter}
                onChange={setQueueStatusFilter}
                placeholder="Filter Status"
              />
            </div>
          </div>
        </div>

        {/* Approval Queue Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed min-w-[900px]">
              <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="w-[26%] px-3.5 py-2.5">Action Requested</th>
                  <th className="w-[20%] px-3.5 py-2.5">Target Organization</th>
                  <th className="w-[22%] px-3.5 py-2.5">Requester Details</th>
                  <th className="w-[12%] px-3.5 py-2.5">Requested At</th>
                  <th className="w-[10%] px-3.5 py-2.5">Status</th>
                  <th className="w-[10%] px-3.5 py-2.5 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredQueueRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                      <p className="font-semibold text-sm">No requests found matching criteria</p>
                      <p className="text-xs text-slate-400 mt-1">
                        When sensitive actions (ledger purges, last-admin removals, fee waivers) are initiated, they appear here for dual approval.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedQueueRequests.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Action Requested */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col min-w-0" title={r.reason || formatActionLabel(r.action_type)}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md border shrink-0 ${getActionBadgeColor(r.action_type)}`}>
                              {formatActionLabel(r.action_type)}
                            </span>
                            {(r.target_id || r.details?.reference_code) && (
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                {r.target_id || r.details?.reference_code}
                              </span>
                            )}
                          </div>
                          {r.target_name && (
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                              Scope: {r.target_name}
                            </span>
                          )}
                          {r.reason && (
                            <span className="text-[10px] text-slate-400 italic truncate max-w-xs">
                              &ldquo;{r.reason}&rdquo;
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Target Organization */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-0" title={`ID: ${r.tenant_id}`}>
                          <div className="p-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {r.tenant_name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {r.tenant_id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Requester Details */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {r.requester_name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 truncate">
                            {r.requester_email}
                          </span>
                        </div>
                      </td>

                      {/* Requested At */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : r.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Decision Actions */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActionNotes('');
                                setActionConfirmModal({ type: 'approve', request: r });
                              }}
                              disabled={processingRequestId === r.id}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-subtle transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionNotes('');
                                setActionConfirmModal({ type: 'reject', request: r });
                              }}
                              disabled={processingRequestId === r.id}
                              className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 font-semibold text-[11px] border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {r.status === 'approved' ? `Signed by ${r.reviewed_by || 'Admin'}` : 'Declined'}
                          </span>
                        )}
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
            totalItems={filteredQueueRequests.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="approval requests"
          />
        </div>
      </div>

      {/* Confirmation Modal for Dual-Auth Decision */}
      {actionConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                actionConfirmModal.type === 'approve'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-500'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {actionConfirmModal.type === 'approve' ? 'Confirm Privileged Execution' : 'Reject Authorization Request'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Target: {actionConfirmModal.request.tenant_name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Action:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {actionConfirmModal.request.action_type}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Requester:</span>
                  <span className="text-slate-900 dark:text-white">{actionConfirmModal.request.requester_email}</span>
                </div>
              </div>

              {actionConfirmModal.type === 'approve' && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Signing off will immediately execute this high-impact action on the live environment and log your identity as the approving Super Administrator.
                </p>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {actionConfirmModal.type === 'approve' ? 'Optional Approval Note' : 'Rejection Reason *'}
                </label>
                <input
                  type="text"
                  required={actionConfirmModal.type === 'reject'}
                  placeholder={actionConfirmModal.type === 'approve' ? 'e.g. Verified with tenant director via phone' : 'e.g. Unauthorized request outside SLA'}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionConfirmModal(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={actionConfirmModal.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
                  className={`px-4 py-2 rounded-lg text-white font-bold shadow-subtle ${
                    actionConfirmModal.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionConfirmModal.type === 'approve' ? 'Sign & Execute' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
