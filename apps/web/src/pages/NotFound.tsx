import React from 'react';
import { PageMeta } from '../components/common/PageMeta';
import { IconPackage, IconArrowRight, IconDashboard } from '../components/icons';

interface NotFoundProps {
  onNavigate?: (tab: string) => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  const handleHomeClick = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleCatalogClick = () => {
    if (onNavigate) {
      onNavigate('products');
    } else {
      window.location.href = '/products';
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <PageMeta
        title="Page Not Found (404) | Invenza Inventory"
        description="The requested inventory route or document could not be located on this server. Return to the operations dashboard."
        canonicalPath="/404"
      />

      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual Brand Indicator */}
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-card text-teal-600 dark:text-teal-400">
          <IconPackage className="h-10 w-10 stroke-[1.5]" />
        </div>

        {/* Heading & Status */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            HTTP 404 Status
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The resource, order manifest, or SKU path you requested does not exist or has been relocated within the inventory hierarchy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleHomeClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-5 py-2.5 text-xs font-bold transition-colors shadow-subtle"
          >
            <IconDashboard className="h-4 w-4" />
            Operations Dashboard
          </button>
          <button
            type="button"
            onClick={handleCatalogClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 text-xs font-bold transition-colors shadow-subtle"
          >
            <IconPackage className="h-4 w-4" />
            Product Catalog
            <IconArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
