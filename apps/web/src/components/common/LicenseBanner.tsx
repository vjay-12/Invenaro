import React from 'react';
import { useLicense } from '../../context/LicenseContext';
import { IconAlertCircle, IconLock, IconRefreshCw } from '../icons';

export const LicenseBanner: React.FC = () => {
  const { state, message, graceEndsAt, refreshLicense, loading } = useLicense();

  if (state === 'active') {
    return null;
  }

  const isGrace = state === 'grace';
  const isReadOnly = state === 'read_only';
  const isUnlicensed = state === 'unlicensed';

  const bgColor = isGrace
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200';

  const badgeText = isGrace
    ? 'Subscription Grace Period'
    : isUnlicensed
    ? 'License Not Activated'
    : 'Subscription Expired - Read-Only Mode';

  return (
    <div className={`w-full border-b px-4 py-2.5 flex items-center justify-between text-xs font-medium transition-colors ${bgColor}`}>
      <div className="flex items-center gap-2">
        <IconAlertCircle className="w-4 h-4 shrink-0" />
        <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
          {badgeText}
        </span>
        <span>
          {message || (isGrace
            ? `Your subscription is in grace until ${graceEndsAt ? new Date(graceEndsAt).toLocaleDateString() : 'soon'}. Renew now to avoid read-only mode.`
            : isUnlicensed
            ? 'This Invenaro deployment is operating unlicensed in read-only mode. All data is preserved and can be viewed or exported.'
            : 'All data is safely preserved. New writes, imports, and mutations are paused until renewed.')}
        </span>
      </div>
      <button
        type="button"
        onClick={() => refreshLicense()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 font-bold text-[11px] transition-colors"
      >
        <IconRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        <span>Check License</span>
      </button>
    </div>
  );
};
