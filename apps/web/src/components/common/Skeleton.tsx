import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Title */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonBox className="h-7 w-56" />
        <SkeletonBox className="h-4 w-80" />
      </div>
      <SkeletonBox className="h-9 w-32 rounded-lg" />
    </div>

    {/* 4 Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-3">
          <div className="flex justify-between items-center">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-8 w-8 rounded-lg" />
          </div>
          <SkeletonBox className="h-7 w-32" />
          <SkeletonBox className="h-3 w-40" />
        </div>
      ))}
    </div>

    {/* Chart + Summary Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-4">
        <SkeletonBox className="h-5 w-48" />
        <SkeletonBox className="h-64 w-full rounded-lg" />
      </div>
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-4">
        <SkeletonBox className="h-5 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/60">
              <SkeletonBox className="h-4 w-28" />
              <SkeletonBox className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const ProductsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonBox className="h-7 w-48" />
        <SkeletonBox className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        <SkeletonBox className="h-9 w-24 rounded-lg" />
        <SkeletonBox className="h-9 w-28 rounded-lg" />
      </div>
    </div>

    {/* Search & Filters */}
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] flex flex-wrap gap-3">
      <SkeletonBox className="h-9 w-64 rounded-lg" />
      <SkeletonBox className="h-9 w-36 rounded-lg" />
      <div className="flex gap-2 ml-auto">
        <SkeletonBox className="h-9 w-20 rounded-lg" />
        <SkeletonBox className="h-9 w-24 rounded-lg" />
        <SkeletonBox className="h-9 w-24 rounded-lg" />
      </div>
    </div>

    {/* Table */}
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-4 w-48" />
            <SkeletonBox className="h-4 w-20" />
            <SkeletonBox className="h-4 w-16" />
            <SkeletonBox className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const LedgerSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonBox className="h-7 w-52" />
        <SkeletonBox className="h-4 w-96" />
      </div>
      <SkeletonBox className="h-9 w-32 rounded-lg" />
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-4 flex gap-3">
      <SkeletonBox className="h-9 w-64 rounded-lg" />
      <div className="flex gap-2">
        <SkeletonBox className="h-9 w-16 rounded-lg" />
        <SkeletonBox className="h-9 w-20 rounded-lg" />
        <SkeletonBox className="h-9 w-20 rounded-lg" />
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] divide-y divide-slate-100 dark:divide-slate-800/60">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-6 w-16 rounded-full" />
          <SkeletonBox className="h-4 w-40" />
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-4 w-16" />
          <SkeletonBox className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const OrdersSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonBox className="h-7 w-48" />
        <SkeletonBox className="h-4 w-80" />
      </div>
      <SkeletonBox className="h-9 w-36 rounded-lg" />
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] divide-y divide-slate-100 dark:divide-slate-800/60">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-5 space-y-3">
          <div className="flex justify-between items-center">
            <SkeletonBox className="h-5 w-32" />
            <SkeletonBox className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBox className="h-4 w-64" />
          <div className="flex justify-between">
            <SkeletonBox className="h-4 w-40" />
            <SkeletonBox className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ReportsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonBox className="h-7 w-56" />
        <SkeletonBox className="h-4 w-80" />
      </div>
      <SkeletonBox className="h-9 w-40 rounded-lg" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-4">
        <SkeletonBox className="h-5 w-44" />
        <SkeletonBox className="h-8 w-36" />
        <SkeletonBox className="h-4 w-full" />
      </div>
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-4">
        <SkeletonBox className="h-5 w-44" />
        <SkeletonBox className="h-8 w-36" />
        <SkeletonBox className="h-4 w-full" />
      </div>
    </div>

    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] space-y-4">
      <SkeletonBox className="h-5 w-48" />
      <SkeletonBox className="h-48 w-full rounded-lg" />
    </div>
  </div>
);
