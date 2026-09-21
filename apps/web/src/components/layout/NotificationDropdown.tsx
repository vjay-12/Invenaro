import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IconBell,
  IconAlertTriangle,
  IconFileDown,
  IconFileUp,
  IconLayers,
  IconCheck,
  IconCheckCircle2,
  IconArrowRight,
  IconX,
  IconMail,
  IconMessageCircle,
  IconShieldAlert,
  IconShieldCheck,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { TabType } from './Sidebar';

export interface NotificationItem {
  id: string;
  type: 'alert' | 'order' | 'audit';
  severity: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  message: string;
  timestamp: string;
  tab: TabType;
  actionLabel?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: TabType) => void;
  onUnreadCountChange?: (count: number) => void;
}

const STORAGE_KEY = 'invenza_read_notifications';
const CLEARED_KEY = 'invenza_cleared_notifications';

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange,
}) => {
  const { products, ledger } = useInventory();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const [emailChangeRequests, setEmailChangeRequests] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [securityRequests, setSecurityRequests] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'alert' | 'order' | 'audit'>('all');
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CLEARED_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchEmailRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.getEmailChangeRequests();
      setEmailChangeRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pending email change requests:', err);
    }
  }, [isAdmin]);

  const fetchSuperAdminData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [leadsData, secData] = await Promise.all([
        api.getLeads(),
        api.getSecurityRequests('pending').catch(() => []),
      ]);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setSecurityRequests(Array.isArray(secData) ? secData : []);
    } catch (err) {
      console.error('Failed to fetch superadmin notifications:', err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setEmailChangeRequests([]);
      return;
    }
    fetchEmailRequests();

    const handleRefresh = () => fetchEmailRequests();
    window.addEventListener('invenza_notifications_refresh', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    const interval = setInterval(fetchEmailRequests, 20000);
    return () => {
      window.removeEventListener('invenza_notifications_refresh', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      clearInterval(interval);
    };
  }, [isAdmin, fetchEmailRequests]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLeads([]);
      setSecurityRequests([]);
      return;
    }
    fetchSuperAdminData();

    const handleRefresh = () => fetchSuperAdminData();
    window.addEventListener('invenza_notifications_refresh', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    const interval = setInterval(fetchSuperAdminData, 15000);
    return () => {
      window.removeEventListener('invenza_notifications_refresh', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      clearInterval(interval);
    };
  }, [isSuperAdmin, fetchSuperAdminData]);

  // Save read state to local cache
  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save notification read state', err);
      }
      return next;
    });
  };

  // Mark all currently visible notifications as read in cache
  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const merged = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(merged);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.error('Failed to save notification read state', err);
    }
  };

  // Dismiss/Clear notifications
  const clearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id);
    const next = Array.from(new Set([...clearedIds, ...allIds]));
    setClearedIds(next);
    try {
      localStorage.setItem(CLEARED_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to save notification cleared state', err);
    }
  };

  // Dynamically derive real-time notifications from live products, ledger, quotes & safeguards
  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    // 0. Super Admin: Pre-Sales Leads & Quotation Inquiries + Security Safeguards
    if (isSuperAdmin) {
      leads.forEach((lead) => {
        const isNew = lead.status === 'new' || lead.status === 'pending';
        const isInDiscussion = lead.status === 'in_discussion';
        const isQuoted = lead.status === 'quoted';

        if (isNew) {
          items.push({
            id: `lead-inquiry-${lead.id}`,
            type: 'order',
            severity: 'info',
            title: `New Quote: ${lead.company_name}`,
            message: `${lead.contact_name} requested quotation for ${lead.tier_estimate || 'Growth Suite'} • ${lead.location || 'Headquarters'}${lead.notes ? ` • Note: ${lead.notes}` : ''}`,
            timestamp: lead.created_at,
            tab: 'leads',
            actionLabel: 'Review Quote Inquiry',
          });
        } else if (isInDiscussion) {
          items.push({
            id: `lead-discussion-${lead.id}`,
            type: 'order',
            severity: 'warning',
            title: `In Discussion: ${lead.company_name}`,
            message: `${lead.contact_name} • Scope: ${lead.tier_estimate || 'Growth Suite'}${lead.notes ? ` • Note: ${lead.notes}` : ''}`,
            timestamp: lead.updated_at || lead.created_at,
            tab: 'leads',
            actionLabel: 'View Pre-Sales Pipeline',
          });
        } else if (isQuoted) {
          items.push({
            id: `lead-quoted-${lead.id}`,
            type: 'order',
            severity: 'success',
            title: `Quoted: ${lead.company_name}`,
            message: `${lead.contact_name} • Quoted: ₹${Number(lead.quoted_amount || 0).toLocaleString('en-IN')} (${lead.tier_estimate || 'Growth Suite'})`,
            timestamp: lead.updated_at || lead.created_at,
            tab: 'leads',
            actionLabel: 'Convert to Tenant',
          });
        }
      });

      securityRequests.forEach((req) => {
        if (req.status === 'pending') {
          items.push({
            id: `safeguard-approval-${req.id}`,
            type: 'alert',
            severity: 'danger',
            title: `Safeguard: ${(req.action_type || 'Action').replace(/_/g, ' ').toUpperCase()}`,
            message: `${req.tenant_name || 'Tenant'}: ${req.reason || 'Dual-authorization approval required.'}`,
            timestamp: req.created_at,
            tab: 'safeguards',
            actionLabel: 'Review Safeguard Queue',
          });
        }
      });
    }

    // 1. Pending Team Member Email Change Requests (Admin Only)
    if (isAdmin && emailChangeRequests.length > 0) {
      emailChangeRequests.forEach((req) => {
        items.push({
          id: `email-change-${req.id}`,
          type: 'alert',
          severity: 'warning',
          title: `Email Change: ${req.user_name || req.current_email}`,
          message: `Requested email update to "${req.requested_email}"${req.reason ? ` • Note: ${req.reason}` : ''}`,
          timestamp: req.created_at,
          tab: 'team',
          actionLabel: 'Review in Customers & Team',
        });
      });
    }

    // 2. Critical Low Stock Alerts from active products
    if (!isSuperAdmin) {
      const lowStockProducts = products.filter((p) => p.currentStock <= p.reorderPoint);
      lowStockProducts.forEach((p) => {
        items.push({
          id: `low-stock-${p.id}`,
          type: 'alert',
          severity: 'warning',
          title: `Low Stock: ${p.name}`,
          message: `${p.currentStock} ${p.unitOfMeasure} remaining in stock (Reorder threshold: ${p.reorderPoint})`,
          timestamp: new Date().toISOString(),
          tab: 'products',
          actionLabel: 'Restock SKU',
        });
      });

      // 3. Recent Dispatches, Inbound Receipts, and Audit Movements from Ledger
      const recentLedger = ledger.slice(0, 15);
      recentLedger.forEach((m) => {
        if (m.reasonCode === 'product removed') {
          items.push({
            id: `audit-del-${m.id}`,
            type: 'audit',
            severity: 'danger',
            title: `Product Removed: ${m.productName}`,
            message: `Audit reference ${m.referenceId} logged by ${m.performedBy || 'Operator'}`,
            timestamp: m.timestamp,
            tab: 'ledger',
            actionLabel: 'View Audit Trail',
          });
        } else if (m.movementType === 'IN') {
          items.push({
            id: `inbound-${m.id}`,
            type: 'order',
            severity: 'success',
            title: `Stock Received: ${m.productName}`,
            message: `+${Math.abs(m.quantity)} units received at ${m.locationName} (${m.referenceId})`,
            timestamp: m.timestamp,
            tab: 'purchase_orders',
            actionLabel: 'View Purchase Order',
          });
        } else if (m.movementType === 'OUT') {
          items.push({
            id: `outbound-${m.id}`,
            type: 'order',
            severity: 'info',
            title: `Order Dispatched: ${m.productName}`,
            message: `-${Math.abs(m.quantity)} units dispatched (${m.referenceId})`,
            timestamp: m.timestamp,
            tab: 'sales_orders',
            actionLabel: 'View Sales Order',
          });
        } else if (m.movementType === 'ADJUST') {
          items.push({
            id: `adjust-${m.id}`,
            type: 'audit',
            severity: 'warning',
            title: `Stock Adjusted: ${m.productName}`,
            message: `Delta: ${m.quantity > 0 ? '+' : ''}${m.quantity} • Reason: ${m.reasonCode || 'Manual count'}`,
            timestamp: m.timestamp,
            tab: 'adjustments',
            actionLabel: 'View Adjustment',
          });
        }
      });
    }

    // Sort items newest first
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter out user-cleared notifications
    return items.filter((item) => !clearedIds.includes(item.id));
  }, [isSuperAdmin, leads, securityRequests, isAdmin, emailChangeRequests, products, ledger, clearedIds]);

  // Compute unread count and notify parent for bell badge
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (onNavigate) {
      onNavigate(item.tab);
    }
    onClose();
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(timestamp).getTime();
      const diffMin = Math.floor((now - past) / (1000 * 60));
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#101622] shadow-modal z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <IconBell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold px-2 py-0.2">
                  {unreadCount} new
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline px-2 py-1 rounded transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close notifications"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-50/60 dark:bg-[#0C1017]/60 border-b border-slate-100 dark:border-slate-800/60 text-xs font-mono">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'alert', label: isSuperAdmin ? 'Safeguards' : 'Alerts' },
            { id: 'order', label: isSuperAdmin ? 'Quotes' : 'Orders' },
            { id: 'audit', label: 'Audit' },
          ] as const
        ).map((f) => {
          const isActive = activeFilter === f.id;
          const count =
            f.id === 'all'
              ? notifications.length
              : notifications.filter((n) => n.type === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#131924] text-teal-700 dark:text-teal-400 shadow-subtle'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2.5">
              <IconCheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              All caught up!
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No pending notifications in this category.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors group ${
                  isRead
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75'
                    : 'bg-teal-500/[0.03] dark:bg-teal-500/[0.05] hover:bg-teal-500/[0.08] dark:hover:bg-teal-500/[0.1]'
                }`}
              >
                {/* Severity Icon */}
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    item.severity === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400'
                      : item.severity === 'danger'
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-400'
                      : item.severity === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                      : 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/25 text-teal-700 dark:text-teal-400'
                  }`}
                >
                  {item.tab === 'leads' ? (
                    <IconMessageCircle className="h-3.5 w-3.5" />
                  ) : item.tab === 'safeguards' ? (
                    <IconShieldAlert className="h-3.5 w-3.5" />
                  ) : item.tab === 'team' ? (
                    <IconMail className="h-3.5 w-3.5" />
                  ) : (
                    <>
                      {item.severity === 'warning' && <IconAlertTriangle className="h-3.5 w-3.5" />}
                      {item.severity === 'danger' && <IconLayers className="h-3.5 w-3.5" />}
                      {item.severity === 'success' && <IconFileDown className="h-3.5 w-3.5" />}
                      {item.severity === 'info' && <IconFileUp className="h-3.5 w-3.5" />}
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isRead
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {item.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                      <span>{item.actionLabel || 'View Details'}</span>
                      <IconArrowRight className="h-3 w-3" />
                    </span>

                    {!isRead && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0"
                        title="Unread"
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50/80 dark:bg-[#0C1017]/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate(isSuperAdmin ? 'leads' : 'ledger');
            onClose();
          }}
          className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          {isSuperAdmin ? 'View Pre-Sales Pipeline →' : 'View Audit Ledger →'}
        </button>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={clearAllNotifications}
            className="text-[10px] font-mono text-slate-400 hover:text-rose-500 transition-colors"
          >
            Clear list
          </button>
        )}
      </div>
    </div>
  );
};
