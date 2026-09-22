import React, { useState, useEffect } from 'react';
import {
  IconDashboard,
  IconBuilding,
  IconUsers,
  IconPackage,
  IconLayers,
  IconFileDown,
  IconFileUp,
  IconArrowLeftRight,
  IconSlidersHorizontal,
  IconWarehouse,
  IconBarChart3,
  IconSettings,
  IconFileText,
  IconX,
  IconShieldCheck,
  IconIndianRupee,
  IconMessageCircle,
  IconPlus,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { useLicense } from '../../context/LicenseContext';
import { api } from '../../services/api';

export type TabType =
  | 'home'
  | 'dashboard'
  | 'create_sales_order'
  | 'companies'
  | 'leads'
  | 'safeguards'
  | 'audit_log'
  | 'roles'
  | 'billing'
  | 'team'
  | 'customers'
  | 'products'
  | 'ledger'
  | 'purchase_orders'
  | 'sales_orders'
  | 'invoices'
  | 'transfers'
  | 'adjustments'
  | 'warehouses'
  | 'reports'
  | 'settings'
  | 'terms'
  | 'privacy'
  | 'profile';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { products, purchaseOrders, salesOrders, taxConfig } = useInventory();
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { plan, hasModule } = useLicense();
  const isBasic = plan === 'basic';

  const [newLeadsCount, setNewLeadsCount] = useState<number>(0);
  const [pendingSafeguardsCount, setPendingSafeguardsCount] = useState<number>(0);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchBadges = async () => {
        try {
          const [leads, reqs] = await Promise.all([
            api.getLeads('new'),
            api.getSecurityRequests('pending'),
          ]);
          if (Array.isArray(leads)) {
            setNewLeadsCount(leads.length);
          }
          if (Array.isArray(reqs)) {
            setPendingSafeguardsCount(reqs.length);
          }
        } catch {
          // ignore error
        }
      };
      fetchBadges();
      const handleRefresh = () => fetchBadges();
      window.addEventListener('invenza_notifications_refresh', handleRefresh);
      window.addEventListener('focus', handleRefresh);
      const interval = setInterval(fetchBadges, 15000);
      return () => {
        window.removeEventListener('invenza_notifications_refresh', handleRefresh);
        window.removeEventListener('focus', handleRefresh);
        clearInterval(interval);
      };
    }
  }, [isSuperAdmin]);

  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderPoint && p.currentStock > 0).length;
  const pendingPOCount = purchaseOrders.filter((p) => p.status === 'pending').length;
  const pendingSOCount = salesOrders.filter((s) => s.status === 'pending').length;

  // Dynamic Navigation Sections
  interface NavItem {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavSection {
    id: string;
    title: string;
    items: NavItem[];
  }

  let navSections: NavSection[] = [];

  if (isSuperAdmin) {
    navSections = [
      {
        id: 'platform_management',
        title: 'Platform Management',
        items: [
          {
            id: 'companies' as TabType,
            label: 'Tenants & Deployments',
            icon: IconBuilding,
          },
          {
            id: 'leads' as TabType,
            label: 'Customer Quotes',
            icon: IconMessageCircle,
            badge: newLeadsCount > 0 ? `${newLeadsCount} New` : undefined,
          },
          {
            id: 'safeguards' as TabType,
            label: 'Security Safeguards',
            icon: IconShieldCheck,
            badge: pendingSafeguardsCount > 0 ? `${pendingSafeguardsCount} Pending` : undefined,
          },
          {
            id: 'audit_log' as TabType,
            label: 'Audit Log Viewer',
            icon: IconFileText,
          },
          {
            id: 'billing' as TabType,
            label: 'License Billing',
            icon: IconIndianRupee,
          },
        ],
      },
    ];
  } else {
    // 1. Sales Section (In Basic, Sales Order is the Bill)
    const salesItems: NavItem[] = [
      {
        id: 'create_sales_order' as TabType,
        label: isBasic ? 'Create Bill / Order' : 'Create Sales Order',
        icon: IconPlus,
      },
      {
        id: 'sales_orders' as TabType,
        label: isBasic ? 'Orders & Bills' : 'Sales Orders',
        icon: IconFileUp,
        badge: pendingSOCount > 0 ? `${pendingSOCount}` : undefined,
      },
      {
        id: 'customers' as TabType,
        label: 'Customers',
        icon: IconUsers,
      },
    ];

    if (hasModule('invoices_returns')) {
      salesItems.push({
        id: 'invoices' as TabType,
        label: 'Invoices & Returns',
        icon: IconFileText,
      });
    }

    // 2. Inventory Operations Section
    const inventoryItems: NavItem[] = [
      {
        id: 'products' as TabType,
        label: 'Products & SKUs',
        icon: IconPackage,
        badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
      },
      {
        id: 'purchase_orders' as TabType,
        label: 'Purchase Orders',
        icon: IconFileDown,
        badge: pendingPOCount > 0 ? `${pendingPOCount}` : undefined,
      },
    ];

    if (hasModule('transfers')) {
      inventoryItems.push({
        id: 'transfers' as TabType,
        label: 'Stock Transfers',
        icon: IconArrowLeftRight,
      });
    }

    if (hasModule('stock_control')) {
      inventoryItems.push({
        id: 'adjustments' as TabType,
        label: 'Stock Adjustments',
        icon: IconSlidersHorizontal,
      });
    }

    if (hasModule('multi_godown')) {
      inventoryItems.push({
        id: 'warehouses' as TabType,
        label: 'Godowns',
        icon: IconWarehouse,
      });
    }

    if (hasModule('ledger_ui')) {
      inventoryItems.push({
        id: 'ledger' as TabType,
        label: 'Movement Ledger',
        icon: IconLayers,
      });
    }

    if (hasModule('reports_advanced')) {
      inventoryItems.push({
        id: 'reports' as TabType,
        label: 'Advanced Reports',
        icon: IconBarChart3,
      });
    }

    inventoryItems.push({
      id: 'settings' as TabType,
      label: 'Settings & Business',
      icon: IconSettings,
    });

    navSections = [
      {
        id: 'sales',
        title: isBasic ? 'Sales & Billing' : 'Sales',
        items: salesItems,
      },
      {
        id: 'inventory_operations',
        title: 'Inventory Operations',
        items: inventoryItems,
      },
    ];
  }

  const handleTabClick = (tabId: TabType) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const planBadgeClasses: Record<string, string> = {
    basic: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    business: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    enterprise: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  };

  const sidebarContent = (
    <aside className="flex flex-col w-[268px] shrink-0 border-r border-slate-200 dark:border-[#16202E] bg-[#E8ECF2] dark:bg-[#090E17] text-slate-900 dark:text-slate-100 h-full transition-colors z-40 select-none">
      {/* Bold Wordmark Logo - Aligned to Header Height */}
      <div className="pt-3 pb-2 px-5 sm:px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleTabClick(isSuperAdmin ? 'companies' : 'dashboard')}
            className="text-left group focus:outline-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-sans">
                Invenaro
              </span>
              <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-0.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>
            <div className="text-[9px] font-mono tracking-widest text-slate-500 uppercase truncate">
              {isSuperAdmin ? 'Master Platform' : user?.companyName || 'Multi-Godown Platform'}
            </div>
          </button>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <IconX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active Plan Read-Only Badge */}
        <div className="mt-2.5 flex items-center justify-between bg-white/70 dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold pl-1">
            Active Plan:
          </span>
          <span
            className={`text-[11px] font-mono font-bold uppercase py-0.5 px-2 rounded border ${
              planBadgeClasses[plan] || planBadgeClasses.business
            }`}
          >
            {plan}
          </span>
        </div>
      </div>

      {/* Navigation Links — Typography-Led with Balanced Spacing */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3.5 space-y-4">
        {/* Top-level Dashboard for Regular Tenants */}
        {!isSuperAdmin && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleTabClick('dashboard')}
              className={`w-full text-left py-1.5 px-2.5 -mx-2.5 rounded-lg flex items-center justify-between group transition-colors focus:outline-none ${
                currentTab === 'dashboard'
                  ? 'bg-teal-500/10 dark:bg-teal-500/10'
                  : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconDashboard
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    currentTab === 'dashboard'
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300'
                  }`}
                />
                <span
                  className={`text-sm tracking-tight transition-colors truncate ${
                    currentTab === 'dashboard'
                      ? 'text-teal-700 dark:text-teal-400 font-bold'
                      : 'text-slate-700 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  }`}
                >
                  Dashboard
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Render Sections with Distinct Section Headers */}
        {navSections.map((section) => (
          <div key={section.id} className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 px-0.5">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full text-left py-1.5 px-2.5 -mx-2.5 rounded-lg flex items-center justify-between group transition-colors focus:outline-none ${
                    isActive
                      ? 'bg-teal-500/10 dark:bg-teal-500/10'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span
                      className={`text-sm tracking-tight transition-colors truncate ${
                        isActive
                          ? 'text-teal-700 dark:text-teal-400 font-bold'
                          : 'text-slate-700 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.badge && (
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden md:block shrink-0 h-full">
        {sidebarContent}
      </div>

      {/* Mobile Slide-out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/70"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 animate-in slide-in-from-left duration-200 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
