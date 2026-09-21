import React, { useState, useEffect, useMemo } from 'react';
import {
  IconShieldCheck as Shield,
  IconCheck as CheckCircle2,
  IconAlertCircle as AlertCircle,
  IconRefreshCw as RefreshCw,
  IconFileText as FileText,
  IconSearch as Search,
  IconEye as Eye,
  IconFileDown as FileDown,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconChevronsLeft as ChevronsLeft,
  IconChevronsRight as ChevronsRight,
} from '../components/icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageMeta } from '../components/common/PageMeta';
import { SimpleSelectDropdown, DropdownOption } from '../components/common/SimpleSelectDropdown';
import { Pagination } from '../components/common/Pagination';

interface PrivilegedAuditLogProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

export const PrivilegedAuditLog: React.FC<PrivilegedAuditLogProps> = ({ onNavigate }) => {
  const { isSuperAdmin } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [selectedAuditLogForDetail, setSelectedAuditLogForDetail] = useState<any | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const data = await api.getAuditLogs({
        action_type: auditActionFilter !== 'all' ? auditActionFilter : undefined,
        search: auditSearchTerm || undefined,
        limit: 250,
      });
      if (Array.isArray(data)) {
        setAuditLogs(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load privileged audit logs', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [auditActionFilter]);

  // Client-side filtering across fields for instant responsiveness
  const filteredAuditLogs = useMemo(() => {
    const q = auditSearchTerm.trim().toLowerCase();
    return auditLogs.filter((log) => {
      // Category match
      if (auditActionFilter !== 'all') {
        const act = (log.action_type || '').toLowerCase();
        if (auditActionFilter === 'company' && !act.includes('company')) return false;
        if (auditActionFilter === 'purge' && !act.includes('purge')) return false;
        if (auditActionFilter === 'safeguard' && !act.includes('safeguard')) return false;
        if (auditActionFilter === 'billing' && !act.includes('billing') && !act.includes('maintenance')) return false;
        if (auditActionFilter === 'role' && !act.includes('role') && !act.includes('permission')) return false;
        if (auditActionFilter === 'tax' && !act.includes('tax')) return false;
        if (
          !['company', 'purge', 'safeguard', 'billing', 'role', 'tax'].includes(auditActionFilter) &&
          act !== auditActionFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // Search match
      if (!q) return true;
      const actor = (log.actor_name || '').toLowerCase();
      const email = (log.actor_email || '').toLowerCase();
      const org = (log.tenant_name || '').toLowerCase();
      const orgId = (log.tenant_id || '').toLowerCase();
      const action = (log.action_type || '').toLowerCase();
      const desc = (log.description || '').toLowerCase();

      return (
        actor.includes(q) ||
        email.includes(q) ||
        org.includes(q) ||
        orgId.includes(q) ||
        action.includes(q) ||
        desc.includes(q)
      );
    });
  }, [auditLogs, auditSearchTerm, auditActionFilter]);

  // Reset pagination to first page when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [auditSearchTerm, auditActionFilter, pageSize]);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAuditLogs.length);
  const paginatedLogs = filteredAuditLogs.slice(startIndex, endIndex);

  // Helper formatting
  const formatActionLabel = (act: string) => {
    return act
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionBadgeColor = (act: string) => {
    if (act.includes('purge') || act.includes('remove_last_admin') || act.includes('deactivate') || act.includes('archived')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
    }
    if (act.includes('fee') || act.includes('billing') || act.includes('maintenance')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
    }
    if (act.includes('approved') || act.includes('provisioned')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    }
    return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25';
  };

  const auditActionOptions: DropdownOption[] = [
    { value: 'all', label: 'All Action Categories' },
    { value: 'company', label: 'Company Provisioning & Archival' },
    { value: 'safeguard', label: 'Safeguard Dual-Auth Submissions' },
    { value: 'purge', label: 'Data & Ledger Purges' },
    { value: 'billing', label: 'Billing Fees & Maintenance Rates' },
    { value: 'role', label: 'Role & Access Control Mutations' },
    { value: 'tax', label: 'Tax Policy Updates' },
  ];

  // CSV Export
  const handleExportCsv = () => {
    try {
      setIsExportingCsv(true);
      const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Organization', 'Organization ID', 'Action Type', 'Description'];
      const rows = filteredAuditLogs.map((log) => [
        new Date(log.created_at).toISOString(),
        `"${(log.actor_name || 'Super Admin').replace(/"/g, '""')}"`,
        `"${(log.actor_email || '').replace(/"/g, '""')}"`,
        `"${(log.tenant_name || 'Platform Wide').replace(/"/g, '""')}"`,
        `"${(log.tenant_id || '').replace(/"/g, '""')}"`,
        `"${log.action_type || ''}"`,
        `"${(log.description || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invenza_privileged_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Privileged audit log exported successfully.');
    } catch (err) {
      showToast('Failed to export CSV', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-2">
      <PageMeta
        title="Privileged Audit Log | Invenza Platform"
        description="Platform-wide tamper-evident audit trail for privileged actions, tenant mutations, and governance compliance."
        canonicalPath="/audit-log"
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

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-teal-600 dark:text-teal-400 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Tamper-Evident Governance & Compliance</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Privileged Platform Audit Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Immutable audit trail of all administrative events, user permission alterations, billing overrides, and security-critical mutations across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv || auditLogs.length === 0}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle disabled:opacity-50"
            title="Download CSV Audit Snapshot"
          >
            <FileDown className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
            <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={loadAuditLogs}
            disabled={isLoadingAudit}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1A2232] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
            title="Refresh Audit Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-500 dark:text-teal-400 ${isLoadingAudit ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Compliance Retention Standard Banner */}
      <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-500/30 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200 shadow-subtle">
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">
            <strong>Compliance Retention Standard:</strong> All privileged administrative actions across organizations, roles, and billing are immutably logged and preserved for a minimum of 12 months.
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 shrink-0 ml-3">
          {filteredAuditLogs.length} Records Loaded
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit records by actor email, organization, or action description..."
            value={auditSearchTerm}
            onChange={(e) => setAuditSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs()}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="w-full sm:w-72 shrink-0">
          <SimpleSelectDropdown
            options={auditActionOptions}
            value={auditActionFilter}
            onChange={setAuditActionFilter}
            placeholder="All Action Categories"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[920px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0C1017] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="w-[16%] px-3.5 py-2.5">Timestamp</th>
                <th className="w-[20%] px-3.5 py-2.5">Actor / Admin</th>
                <th className="w-[20%] px-3.5 py-2.5">Organization</th>
                <th className="w-[16%] px-3.5 py-2.5">Action Type</th>
                <th className="w-[22%] px-3.5 py-2.5">Description</th>
                <th className="w-[6%] px-3.5 py-2.5 text-right">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    <p className="font-semibold text-sm">No audit records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {auditSearchTerm || auditActionFilter !== 'all'
                        ? 'No records matching the specified filters.'
                        : 'Privileged activities and configuration mutations will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const actorTooltip = log.actor_email
                    ? `${log.actor_name || 'Super Admin'} (${log.actor_email})`
                    : (log.actor_name || 'Super Admin');

                  const orgTooltip = log.tenant_id
                    ? `${log.tenant_name || 'Platform Wide'} (ID: ${log.tenant_id})`
                    : (log.tenant_name || 'Platform Wide');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actor / Admin */}
                      <td className="px-3.5 py-2.5">
                        <div
                          className="font-semibold text-slate-900 dark:text-white truncate cursor-default"
                          title={actorTooltip}
                        >
                          {log.actor_name || 'Super Admin'}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-3.5 py-2.5">
                        <div
                          className="font-semibold text-slate-800 dark:text-slate-200 truncate cursor-default"
                          title={orgTooltip}
                        >
                          {log.tenant_name || 'Platform Wide'}
                        </div>
                      </td>

                      {/* Action Type */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold border truncate max-w-full cursor-default ${getActionBadgeColor(log.action_type)}`}
                          title={formatActionLabel(log.action_type)}
                        >
                          {formatActionLabel(log.action_type)}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-3.5 py-2.5">
                        <div
                          className="text-slate-700 dark:text-slate-300 text-[11px] truncate cursor-default"
                          title={log.description}
                        >
                          {log.description}
                        </div>
                      </td>

                      {/* Diff Inspector */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {(log.before_values || log.after_values) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAuditLogForDetail(log)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border border-slate-200 dark:border-slate-700"
                            title="Inspect Before & After State"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">&mdash;</span>
                        )}
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
          totalItems={filteredAuditLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="audit records"
        />
      </div>

      {/* Audit Detail & Diff Modal */}
      {selectedAuditLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Snapshot Details
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedAuditLogForDetail.action_type} &bull; {selectedAuditLogForDetail.tenant_name || 'Platform Wide'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLogForDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-[11px]">
              {selectedAuditLogForDetail.before_values && (
                <div>
                  <div className="text-rose-500 font-bold mb-1">&minus; Previous State (Before Mutation):</div>
                  <pre className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 overflow-x-auto">
                    {JSON.stringify(selectedAuditLogForDetail.before_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAuditLogForDetail.after_values && (
                <div>
                  <div className="text-emerald-500 font-bold mb-1">&plus; Applied State (After Mutation):</div>
                  <pre className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 overflow-x-auto">
                    {JSON.stringify(selectedAuditLogForDetail.after_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLogForDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
