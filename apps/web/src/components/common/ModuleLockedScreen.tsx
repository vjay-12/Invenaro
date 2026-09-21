import React from 'react';
import { IconLock, IconArrowRight, IconShieldCheck } from '../icons';

interface ModuleLockedScreenProps {
  moduleName: string;
  requiredPlan?: 'Business' | 'Enterprise';
  description?: string;
}

export const ModuleLockedScreen: React.FC<ModuleLockedScreenProps> = ({
  moduleName,
  requiredPlan = 'Business',
  description,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-5 border border-teal-500/20 shadow-sm">
        <IconLock className="w-7 h-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-3">
        <IconShieldCheck className="w-3.5 h-3.5 text-teal-600" />
        <span>Available in the {requiredPlan} plan</span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {moduleName} is Locked
      </h2>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
        {description ||
          `This feature requires the ${requiredPlan} subscription tier. Upgrade your Invenaro subscription from your customer portal to enable this capability.`}
      </p>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 w-full text-left space-y-2 mb-6">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
          Included with {requiredPlan}:
        </div>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
          <li>Multi-warehouse transfer challans & delivery orders</li>
          <li>Direct tax invoices & GST breakdown reports</li>
          <li>Automated inventory reconciliations & batch tracking</li>
        </ul>
      </div>

      <a
        href="mailto:billing@invenaro.com?subject=Invenaro%20Subscription%20Upgrade"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-subtle"
      >
        <span>Upgrade Subscription</span>
        <IconArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
};
