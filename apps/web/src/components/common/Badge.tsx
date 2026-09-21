import React from 'react';
import { MovementType, AdjustmentReasonCode } from '../../types/inventory';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'sky' | 'teal' | 'slate' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  
  const variants: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    amber: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    rose: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    sky: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    teal: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
    slate: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    default: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded ${sizeClasses} ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
};

export const MovementBadge: React.FC<{ type: MovementType }> = ({ type }) => {
  switch (type) {
    case 'IN':
      return (
        <span className="inline-flex items-center font-mono font-bold rounded text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          IN · Receipt
        </span>
      );
    case 'OUT':
      return (
        <span className="inline-flex items-center font-mono font-bold rounded text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
          OUT · Dispatch
        </span>
      );
    case 'ADJUST':
      return (
        <span className="inline-flex items-center font-mono font-bold rounded text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
          Adjust
        </span>
      );
    case 'TRANSFER':
      return (
        <span className="inline-flex items-center font-mono font-bold rounded text-[10px] px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 whitespace-nowrap">
          Transfer
        </span>
      );
    case 'DRAFT_DELETED':
      return (
        <span className="inline-flex items-center font-mono font-bold rounded text-[10px] px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-400/30 dark:border-slate-600/40 whitespace-nowrap">
          Draft Deleted
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center font-mono font-semibold rounded text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
          {type}
        </span>
      );
  }
};

export const ReasonBadge: React.FC<{ reason: AdjustmentReasonCode | string }> = ({ reason }) => {
  const reasonLower = (reason || '').toLowerCase();
  const reasonColor: Record<string, 'rose' | 'amber' | 'sky' | 'teal'> = {
    damage: 'rose',
    loss: 'rose',
    miscount: 'amber',
    return: 'sky',
    audit: 'teal',
    removed: 'rose',
    'product removed': 'rose',
  };
  return (
    <Badge variant={reasonColor[reasonLower] || 'slate'} size="sm">
      {reason.toUpperCase()}
    </Badge>
  );
};
