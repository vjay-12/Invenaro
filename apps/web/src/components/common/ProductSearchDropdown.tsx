import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../../types/inventory';
import { IconSearch, IconChevronDown, IconCheck } from '../icons';

interface ProductSearchDropdownProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (product: Product) => void;
  warehouseId?: string;
  formatCurrency: (amount: number, currency?: any) => string;
  priceType?: 'cost' | 'sell';
  disabled?: boolean;
}

export const ProductSearchDropdown: React.FC<ProductSearchDropdownProps> = ({
  products,
  selectedProductId,
  onSelect,
  warehouseId,
  formatCurrency,
  priceType = 'sell',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedProductStock = warehouseId
    ? (selectedProduct?.locationStock?.[warehouseId] ?? 0)
    : (selectedProduct?.currentStock ?? 0);
  const isSelectedOutOfStock = Boolean(selectedProduct && selectedProductStock === 0);

  // Sort products alphabetically by product name (A→Z)
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [products]);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return sortedProducts;
    const q = searchQuery.toLowerCase();
    return sortedProducts.filter((p) => {
      const sku = (p.sku || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return sku.includes(q) || name.includes(q) || barcode.includes(q) || cat.includes(q);
    });
  }, [sortedProducts, searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 40);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside and escape handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Ensure highlighted item is visible in list
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-product-option]');
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredProducts.length === 0 ? 0 : (prev + 1) % filteredProducts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredProducts.length === 0 ? 0 : (prev - 1 + filteredProducts.length) % filteredProducts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        onSelect(filteredProducts[highlightedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Dropdown Box Trigger */}
      {!isOpen ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 h-[34px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer select-none text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate text-left">
            {selectedProduct ? (
              <>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[10px] shrink-0 px-1.5 py-0.5 rounded bg-teal-500/10">
                  {selectedProduct.sku}
                </span>
                <span className="text-slate-400 dark:text-slate-600 text-[10px] shrink-0">•</span>
                <span
                  className="truncate font-medium text-slate-800 dark:text-slate-200 text-xs"
                  title={selectedProduct.name}
                >
                  {selectedProduct.name}
                </span>
                {isSelectedOutOfStock && (
                  <span className="shrink-0 font-bold text-[9px] uppercase tracking-wide text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                    0 in stock
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400 italic text-xs">Select or search product...</span>
            )}
          </div>
          <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      ) : (
        /* Search Box Embedded Directly in the Dropdown Box */
        <div className="w-full flex items-center gap-1.5 px-2.5 py-1 h-[34px] rounded-lg border border-teal-500/70 bg-white dark:bg-[#131924] text-slate-800 dark:text-slate-200 ring-1 ring-teal-500/20 shadow-sm text-xs">
          <IconSearch className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder={selectedProduct ? `Search (current: ${selectedProduct.sku})...` : 'Type SKU or product name...'}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 shrink-0"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-teal-500 shrink-0 p-0.5"
            title="Close dropdown"
          >
            <IconChevronDown className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Floating Dropdown Results Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-[calc(100vw-2.5rem)] sm:min-w-[420px] sm:max-w-lg z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Metadata bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161D2B] text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>{filteredProducts.length} items found</span>
            <span>Use ↑↓ to navigate, Enter to pick</span>
          </div>

          {/* Catalog items list */}
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No catalog items matching "{searchQuery}"
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = p.id === selectedProductId;
                const isHighlighted = idx === highlightedIndex;
                const locStock = warehouseId
                  ? (p.locationStock?.[warehouseId] ?? 0)
                  : (p.currentStock ?? 0);
                const isOut = locStock === 0;

                return (
                  <button
                    key={p.id}
                    data-product-option
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(p);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs cursor-pointer ${
                      isHighlighted || isSelected
                        ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-medium border border-teal-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 shrink-0">
                          {p.sku}
                        </span>
                        <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{p.category}</span>
                        <span>•</span>
                        <span className={isOut ? 'text-rose-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                          Stock: {locStock} {p.unitOfMeasure}
                        </span>
                        {p.reorderPoint > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-500/80">Reorder Min: {p.reorderPoint}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatCurrency(priceType === 'cost' ? p.costPrice : p.sellPrice)}
                      </div>
                      {isSelected && (
                        <div className="text-teal-600 dark:text-teal-400 flex justify-end mt-0.5">
                          <IconCheck className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
