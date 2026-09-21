import React, { useState, useRef, useEffect } from 'react';
import { IconArrowUpDown, IconChevronDown, IconCheck } from '../icons';

export type ProductSortKey =
  | 'name_asc'
  | 'name_desc'
  | 'category'
  | 'category_asc'
  | 'category_desc'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc'
  | 'stock_desc';

export interface SortOptionItem {
  value: ProductSortKey;
  label: string;
  shortLabel: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { value: 'name_asc', label: 'Name (A → Z)', shortLabel: 'Name (A → Z)' },
  { value: 'name_desc', label: 'Name (Z → A)', shortLabel: 'Name (Z → A)' },
  { value: 'category', label: 'Category', shortLabel: 'Category' },
  { value: 'price_asc', label: 'Price (Low → High)', shortLabel: 'Price (Low → High)' },
  { value: 'price_desc', label: 'Price (High → Low)', shortLabel: 'Price (High → Low)' },
  { value: 'stock_asc', label: 'Stock (Low → High)', shortLabel: 'Stock (Low → High)' },
  { value: 'stock_desc', label: 'Stock (High → Low)', shortLabel: 'Stock (High → Low)' },
];

interface SortSelectDropdownProps {
  sortBy: ProductSortKey;
  onSelect: (sortKey: ProductSortKey) => void;
  className?: string;
}

export const SortSelectDropdown: React.FC<SortSelectDropdownProps> = ({
  sortBy,
  onSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption =
    SORT_OPTIONS.find((opt) => opt.value === sortBy) ||
    (sortBy === 'category_asc' ? SORT_OPTIONS[2] : SORT_OPTIONS[0]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative z-50 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-9 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none text-left max-w-[145px] sm:max-w-[170px] ${
          isOpen
            ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-subtle'
            : 'border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <IconArrowUpDown className={`h-3.5 w-3.5 shrink-0 ${isOpen ? 'text-teal-500' : 'text-teal-600 dark:text-teal-400'}`} />
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[11px] sm:text-xs">
            {currentOption.shortLabel}
          </span>
        </div>
        <IconChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{ zIndex: 9999 }}
          className="absolute left-0 top-full mt-1.5 min-w-[210px] w-max max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111622] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Sort Catalog
          </div>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.value === sortBy || (opt.value === 'category' && sortBy === 'category_asc');
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <IconCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 ml-2 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
