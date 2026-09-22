import React, { useState, useEffect, Suspense } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { LicenseBanner } from './components/common/LicenseBanner';
import { ModuleLockedScreen } from './components/common/ModuleLockedScreen';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { QuickSearchModal } from './components/layout/QuickSearchModal';
import { Footer } from './components/layout/Footer';
import { HelpCenterModal } from './components/layout/HelpCenterModal';
import { ContactSupportModal } from './components/layout/ContactSupportModal';
import { InvenzaChatbot } from './components/chat/InvenzaChatbot';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { JsonLd } from './components/common/JsonLd';
import { api } from './services/api';
import {
  DashboardSkeleton,
  ProductsSkeleton,
  LedgerSkeleton,
  OrdersSkeleton,
  ReportsSkeleton,
} from './components/common/Skeleton';

// Code-split all page routes via React.lazy
const SuperAdminConsole = React.lazy(() =>
  import('./pages/SuperAdminConsole').then((m) => ({ default: m.SuperAdminConsole }))
);
const LeadsManagement = React.lazy(() =>
  import('./pages/LeadsManagement').then((m) => ({ default: m.LeadsManagement }))
);
const SecuritySafeguards = React.lazy(() =>
  import('./pages/SecuritySafeguards').then((m) => ({ default: m.SecuritySafeguards }))
);
const PrivilegedAuditLog = React.lazy(() =>
  import('./pages/PrivilegedAuditLog').then((m) => ({ default: m.PrivilegedAuditLog }))
);
const RoleManagement = React.lazy(() =>
  import('./pages/RoleManagement').then((m) => ({ default: m.RoleManagement }))
);
const BillingManagement = React.lazy(() =>
  import('./pages/BillingManagement').then((m) => ({ default: m.BillingManagement }))
);
const CompanyTeam = React.lazy(() =>
  import('./pages/CompanyTeam').then((m) => ({ default: m.CompanyTeam }))
);
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const Products = React.lazy(() =>
  import('./pages/Products').then((m) => ({ default: m.Products }))
);
const Ledger = React.lazy(() =>
  import('./pages/Ledger').then((m) => ({ default: m.Ledger }))
);
const PurchaseOrders = React.lazy(() =>
  import('./pages/PurchaseOrders').then((m) => ({ default: m.PurchaseOrders }))
);
const SalesOrders = React.lazy(() =>
  import('./pages/SalesOrders').then((m) => ({ default: m.SalesOrders }))
);
const CreateSalesOrderPage = React.lazy(() =>
  import('./pages/CreateSalesOrderPage').then((m) => ({ default: m.CreateSalesOrderPage }))
);
const Invoices = React.lazy(() =>
  import('./pages/Invoices').then((m) => ({ default: m.Invoices }))
);
const Transfers = React.lazy(() =>
  import('./pages/Transfers').then((m) => ({ default: m.Transfers }))
);
const Adjustments = React.lazy(() =>
  import('./pages/Adjustments').then((m) => ({ default: m.Adjustments }))
);
const Warehouses = React.lazy(() =>
  import('./pages/Warehouses').then((m) => ({ default: m.Warehouses }))
);
const Reports = React.lazy(() =>
  import('./pages/Reports').then((m) => ({ default: m.Reports }))
);
const Settings = React.lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings }))
);
const Terms = React.lazy(() =>
  import('./pages/Terms').then((m) => ({ default: m.Terms }))
);
const Privacy = React.lazy(() =>
  import('./pages/Privacy').then((m) => ({ default: m.Privacy }))
);
const Profile = React.lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.Profile }))
);
const NotFound = React.lazy(() =>
  import('./pages/NotFound').then((m) => ({ default: m.NotFound }))
);

const pathToTab: Record<string, TabType | '404'> = {
  '/': 'home',
  '/home': 'home',
  '/login': 'login',
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/ledger': 'ledger',
  '/purchase-orders': 'purchase_orders',
  '/sales-orders': 'sales_orders',
  '/create-sales-order': 'create_sales_order',
  '/invoices': 'sales_orders',
  '/transfers': 'transfers',
  '/adjustments': 'adjustments',
  '/warehouses': 'warehouses',
  '/reports': 'reports',
  '/settings': 'settings',
  '/team': 'team',
  '/customers': 'customers',
  '/companies': 'companies',
  '/leads': 'leads',
  '/security-safeguards': 'safeguards',
  '/audit-log': 'audit_log',
  '/role-management': 'roles',
  '/billing': 'billing',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/profile': 'profile',
};

const tabToPath: Record<string, string> = {
  home: '/home',
  login: '/login',
  dashboard: '/dashboard',
  products: '/products',
  ledger: '/ledger',
  purchase_orders: '/purchase-orders',
  sales_orders: '/sales-orders',
  create_sales_order: '/create-sales-order',
  invoices: '/sales-orders',
  transfers: '/transfers',
  adjustments: '/adjustments',
  warehouses: '/warehouses',
  reports: '/reports',
  settings: '/settings',
  team: '/team',
  customers: '/customers',
  companies: '/companies',
  leads: '/leads',
  safeguards: '/security-safeguards',
  audit_log: '/audit-log',
  roles: '/role-management',
  billing: '/billing',
  terms: '/terms',
  privacy: '/privacy',
  profile: '/profile',
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Uncaught Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 rounded-2xl bg-white dark:bg-[#131924] border border-rose-200 dark:border-rose-900/40 shadow-card max-w-xl mx-auto text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold font-mono">
            !
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              View Rendering Interrupted
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              An unexpected rendering exception occurred. You can reload the page or return to the overview.
            </p>
            {this.state.error?.message && (
              <p className="mt-2 text-[11px] font-mono text-rose-500/90 bg-rose-500/10 py-1 px-2.5 rounded-lg inline-block">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-subtle transition-colors"
            >
              Reload View
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) {
                  this.props.onReset();
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isSuperAdmin, user } = useAuth();
  const license = useLicense();

  // Initialize currentTab from browser location pathname
  const initialPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const resolvedTab = pathToTab[initialPath] || (initialPath === '' ? 'home' : '404');

  const [currentTab, setCurrentTab] = useState<TabType | '404'>(resolvedTab);
  const [currentParams, setCurrentParams] = useState<Record<string, string>>(() => {
    try {
      return Object.fromEntries(new URLSearchParams(window.location.search).entries());
    } catch {
      return {};
    }
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      api.getSetupStatus()
        .then((res) => {
          if (active && res?.needsSetup) {
            setNeedsSetup(true);
          }
        })
        .catch(() => {});
    } else {
      setNeedsSetup(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Sync tab changes to browser URL and history
  const navigateTo = (tab: TabType | '404', params?: Record<string, string>, replace: boolean = false) => {
    setCurrentTab(tab);
    setCurrentParams(params || {});
    let targetPath = tabToPath[tab] || (tab === '404' ? '/404' : '/dashboard');
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      targetPath += `?${qs}`;
    }
    if (window.location.pathname + window.location.search !== targetPath) {
      if (replace) {
        window.history.replaceState({ tab, params }, '', targetPath);
      } else {
        window.history.pushState({ tab, params }, '', targetPath);
      }
    }
  };

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      const mapped = pathToTab[path] || '404';
      setCurrentTab(mapped);
      try {
        setCurrentParams(Object.fromEntries(new URLSearchParams(window.location.search).entries()));
      } catch {
        setCurrentParams({});
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync tab with user role upon login / logout
  useEffect(() => {
    if (isAuthenticated) {
      if (isSuperAdmin && (currentTab === 'home' || currentTab === 'dashboard')) {
        navigateTo('companies');
      } else if (!isSuperAdmin && (currentTab === 'home' || currentTab === 'companies')) {
        navigateTo('dashboard');
      }
    } else if (!isLoading) {
      // For unauthenticated visitors, ensure URL path is cleanly /home (or /terms, /privacy, /login)
      const publicPaths = ['/home', '/terms', '/privacy', '/login'];
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (!publicPaths.includes(path) && !needsSetup) {
        window.history.replaceState({ tab: 'home' }, '', '/home');
        setCurrentTab('home');
      }
    }
  }, [isAuthenticated, isSuperAdmin, isLoading, currentTab, needsSetup]);

  // Global keyboard shortcut for Command Palette (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F5F8] dark:bg-[#0C1017] text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] text-teal-600 dark:text-teal-400 font-mono font-bold text-2xl shadow-card animate-pulse">
            I
          </div>
          <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
            Initializing Invenza Core Engine...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, allow public routes or show Login portal / setup wizard
  if (!isAuthenticated) {
    if (needsSetup || currentTab === 'login') {
      return <Login onNavigate={(t) => navigateTo(t as any)} />;
    }

    if (currentTab === 'terms') {
      return (
        <div className="min-h-screen bg-[#F4F5F8] dark:bg-[#0C1017] p-6 lg:p-12">
          <Suspense fallback={<DashboardSkeleton />}>
            <Terms onNavigate={(t) => navigateTo(t as any)} />
          </Suspense>
        </div>
      );
    }

    if (currentTab === 'privacy') {
      return (
        <div className="min-h-screen bg-[#F4F5F8] dark:bg-[#0C1017] p-6 lg:p-12">
          <Suspense fallback={<DashboardSkeleton />}>
            <Privacy onNavigate={(t) => navigateTo(t as any)} />
          </Suspense>
        </div>
      );
    }

    return <LandingPage onNavigate={(t) => navigateTo(t as any)} />;
  }

  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'home':
        return <LandingPage onNavigate={(t) => navigateTo(t as any)} />;
      case 'companies':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <SuperAdminConsole onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'leads':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <LeadsManagement onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'safeguards':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <SecuritySafeguards onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'audit_log':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <PrivilegedAuditLog onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'roles':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <RoleManagement onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'billing':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <BillingManagement
              orgId={currentParams?.org}
              onNavigate={(t, p) => navigateTo(t as any, p)}
            />
          </Suspense>
        );
      case 'team': {
        const enabledModules = user?.enabledModules || [
          'products', 'locations', 'orders', 'transfers', 'adjustments', 'ledger', 'reports', 'storage', 'team'
        ];
        const isTeamEnabled = enabledModules.includes('team') || isSuperAdmin;
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <CompanyTeam initialTab={isTeamEnabled ? "team" : "customers"} onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      }
      case 'customers':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <CompanyTeam initialTab="customers" onNavigate={(t, p) => navigateTo(t as any, p)} />
          </Suspense>
        );
      case 'dashboard':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard onNavigate={(tab) => navigateTo(tab as any)} />
          </Suspense>
        );
      case 'products':
        return (
          <Suspense fallback={<ProductsSkeleton />}>
            <Products />
          </Suspense>
        );
      case 'ledger':
        if (!license.hasModule('ledger_ui')) {
          return <ModuleLockedScreen moduleName="Valuation & Costing Ledger" requiredPlan="Business" />;
        }
        return (
          <Suspense fallback={<LedgerSkeleton />}>
            <Ledger />
          </Suspense>
        );
      case 'purchase_orders':
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <PurchaseOrders />
          </Suspense>
        );
      case 'create_sales_order':
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <CreateSalesOrderPage onNavigate={(tab) => navigateTo(tab as any)} />
          </Suspense>
        );
      case 'sales_orders':
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <SalesOrders
              onNavigate={(tab, params, replace) => navigateTo(tab as any, params, replace)}
              params={currentParams}
              initialOrderId={currentParams?.orderId || currentParams?.so || currentParams?.soNumber}
            />
          </Suspense>
        );
      case 'invoices':
        if (!license.hasModule('invoices_returns')) {
          return <ModuleLockedScreen moduleName="Direct Tax Invoices & Returns" requiredPlan="Business" />;
        }
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <SalesOrders
              onNavigate={(tab, params, replace) => navigateTo(tab as any, params, replace)}
              params={currentParams}
              initialOrderId={currentParams?.orderId || currentParams?.so || currentParams?.soNumber}
            />
          </Suspense>
        );
      case 'transfers':
        if (!license.hasModule('transfers')) {
          return <ModuleLockedScreen moduleName="Stock Transfers" requiredPlan="Business" />;
        }
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <Transfers />
          </Suspense>
        );
      case 'adjustments':
        if (!license.hasModule('stock_control')) {
          return <ModuleLockedScreen moduleName="Stock Control & Adjustments" requiredPlan="Business" />;
        }
        return (
          <Suspense fallback={<OrdersSkeleton />}>
            <Adjustments />
          </Suspense>
        );
      case 'warehouses':
        if (!license.hasModule('multi_godown')) {
          return <ModuleLockedScreen moduleName="Multi-Godown Management" requiredPlan="Business" />;
        }
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Warehouses />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<ReportsSkeleton />}>
            <Reports />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Settings />
          </Suspense>
        );
      case 'terms':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Terms onNavigate={(t) => navigateTo(t as any)} />
          </Suspense>
        );
      case 'privacy':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Privacy onNavigate={(t) => navigateTo(t as any)} />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <Profile />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<DashboardSkeleton />}>
            <NotFound onNavigate={(t) => navigateTo(t as any)} />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F3F7] dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 selection:bg-teal-700 selection:text-white transition-colors duration-200 overflow-hidden font-sans">
      <JsonLd type="organization" />
      <JsonLd type="software" />

      {/* Sidebar (Desktop sticky full-height & Mobile drawer) */}
      <Sidebar
        currentTab={currentTab as TabType}
        onSelectTab={(tab) => navigateTo(tab)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport (Navbar + Scrollable Content + Footer) - Starts horizontally AFTER Sidebar */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F1F3F7] dark:bg-[#0C1017]">
        <LicenseBanner />
        <Navbar
          currentTab={currentTab as TabType}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigate={(tab) => navigateTo(tab as any)}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F1F3F7] dark:bg-[#0C1017]">
          <main className={`w-full max-w-[1600px] mx-auto ${
            currentTab === 'dashboard' || currentTab === 'companies'
              ? 'p-3.5 sm:p-4 lg:px-6 lg:pt-4 lg:pb-3'
              : 'p-4 sm:p-5 lg:px-6 lg:pt-5 lg:pb-3'
          } animate-in fade-in duration-200`}>
            <AppErrorBoundary onReset={() => navigateTo(isSuperAdmin ? 'companies' : 'dashboard')}>
              {renderCurrentPage()}
            </AppErrorBoundary>
          </main>
        </div>

        {/* Slim Footer Bar - Starts after sidebar, pinned at bottom of main viewport */}
        <Footer
          currentTab={currentTab}
          onNavigate={(tab) => navigateTo(tab as any)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenContact={() => setIsContactModalOpen(true)}
        />
      </div>

      {/* Modals & Overlays */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => navigateTo(tab as any)}
      />

      <HelpCenterModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onOpenChat={() => {
          setIsHelpModalOpen(false);
          setIsChatOpen(true);
        }}
        onNavigate={(tab) => navigateTo(tab as any)}
      />

      <ContactSupportModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <InvenzaChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpen={() => setIsChatOpen(true)}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LicenseProvider>
          <InventoryProvider>
            <AppContent />
          </InventoryProvider>
        </LicenseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
