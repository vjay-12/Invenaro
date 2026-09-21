import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Check } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
  showFirstLast?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  className = '',
  showFirstLast = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate pages and safe bounds
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Auto-clamp page if currentPage exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Click outside to close rows-per-page dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Range calculation
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
    const showLeftEllipsis = safeCurrentPage > 3;
    const showRightEllipsis = safeCurrentPage < totalPages - 2;

    // Always include page 1
    pages.push(1);

    if (showLeftEllipsis) {
      pages.push('ellipsis-left');
    }

    // Determine window around current page
    let start = Math.max(2, safeCurrentPage - 1);
    let end = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (safeCurrentPage <= 3) {
      end = 4;
    } else if (safeCurrentPage >= totalPages - 2) {
      start = totalPages - 3;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (showRightEllipsis) {
      pages.push('ellipsis-right');
    }

    // Always include last page
    pages.push(totalPages);

    return pages;
  };

  const handleSelectPageSize = (size: number) => {
    setIsDropdownOpen(false);
    onPageSizeChange(size);
    // Determine new safe page
    const newTotalPages = Math.max(1, Math.ceil(totalItems / size));
    if (safeCurrentPage > newTotalPages) {
      onPageChange(newTotalPages);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 select-none ${className}`}
    >
      {/* Left side: Range information and Rows per page */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="tabular-nums">
          Showing{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {totalItems === 0 ? 0 : `${startIndex}–${endIndex}`}
          </strong>{' '}
          of{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {totalItems}
          </strong>{' '}
          {itemLabel}
        </span>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Rows per page:
          </span>

          {/* Upward-Opening Dropup Selector */}
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              className={`flex items-center justify-between gap-1.5 px-2.5 py-1 min-w-[62px] h-7 rounded-lg border text-xs font-semibold font-mono transition-all cursor-pointer focus:outline-none ${
                isDropdownOpen
                  ? 'border-teal-500/60 bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
            >
              <span>{pageSize}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-teal-500' : ''
                }`}
              />
            </button>

            {/* Dropup Menu: Opens Upward (bottom-full mb-1.5) with z-50 */}
            {isDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 bottom-full mb-1.5 w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1 space-y-0.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 mb-0.5">
                  Page Size
                </div>
                {pageSizeOptions.map((opt) => {
                  const isSelected = opt === pageSize;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectPageSize(opt)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/30'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent font-medium'
                      }`}
                    >
                      <span>{opt} rows</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Compact Pagination Navigation */}
      <div className="flex items-center gap-1 self-end sm:self-auto">
        {/* First Page button */}
        {showFirstLast && (
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First page"
            className={`p-1.5 rounded-lg border transition-colors ${
              safeCurrentPage <= 1
                ? 'border-slate-200/60 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Previous Page button */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          title="Previous page"
          className={`p-1.5 rounded-lg border transition-colors ${
            safeCurrentPage <= 1
              ? 'border-slate-200/60 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1 px-0.5">
          {getPageNumbers().map((pageItem, idx) => {
            if (typeof pageItem === 'string') {
              return (
                <span
                  key={`${pageItem}-${idx}`}
                  className="px-1 text-slate-400 dark:text-slate-600 select-none font-mono text-xs"
                >
                  …
                </span>
              );
            }

            const isCurrent = safeCurrentPage === pageItem;
            return (
              <button
                key={pageItem}
                type="button"
                onClick={() => onPageChange(pageItem)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all ${
                  isCurrent
                    ? 'bg-teal-600 dark:bg-[#5dcaa5] text-white dark:text-[#04342c] shadow-subtle'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {pageItem}
              </button>
            );
          })}
        </div>

        {/* Next Page button */}
        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          title="Next page"
          className={`p-1.5 rounded-lg border transition-colors ${
            safeCurrentPage >= totalPages
              ? 'border-slate-200/60 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Last Page button */}
        {showFirstLast && (
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
            className={`p-1.5 rounded-lg border transition-colors ${
              safeCurrentPage >= totalPages
                ? 'border-slate-200/60 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
