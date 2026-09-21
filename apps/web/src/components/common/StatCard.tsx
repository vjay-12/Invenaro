import React from 'react';
import { IconProps } from '../icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.FC<IconProps>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: 'teal' | 'emerald' | 'amber' | 'rose' | 'slate';
  badge?: string;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'teal',
  badge,
  compact = false,
}) => {
  const iconThemes: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-500/15',
      icon: 'text-teal-700 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-500/30',
      glow: 'group-hover:border-teal-500/40',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      icon: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      glow: 'group-hover:border-emerald-500/40',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      icon: 'text-amber-800 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/30',
      glow: 'group-hover:border-amber-500/40',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-500/15',
      icon: 'text-rose-800 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-500/30',
      glow: 'group-hover:border-rose-500/40',
    },
    slate: {
      bg: 'bg-slate-100 dark:bg-slate-700/20',
      icon: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700/40',
      glow: 'group-hover:border-slate-500/40',
    },
  };

  const activeTheme = iconThemes[colorScheme] || iconThemes.teal;

  if (compact) {
    return (
      <div className={`group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131924] p-3.5 sm:p-4 shadow-card hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 ${activeTheme.glow}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            {title}
          </span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${activeTheme.bg} ${activeTheme.border} ${activeTheme.icon} transition-transform duration-200 group-hover:scale-105`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-1.5">
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          {badge && (
            <span className="rounded font-mono text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-1.5 py-0.5 text-slate-700 dark:text-slate-300 shrink-0">
              {badge}
            </span>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                }`}
              >
                {trend.isPositive ? '↑ +' : '↓ '}{trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#101622]/90 p-5 shadow-subtle hover:shadow-card transition-all duration-200 ${activeTheme.glow}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${activeTheme.bg} ${activeTheme.border} ${activeTheme.icon} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>
        {badge && (
          <span className="rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-2 py-0.5 text-slate-700 dark:text-slate-300 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
              }`}
            >
              {trend.isPositive ? '↑ +' : '↓ '}{trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
