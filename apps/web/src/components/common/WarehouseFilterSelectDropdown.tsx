import React, { useState, useRef, useEffect } from 'react';
import { Location } from '../../types/inventory';
import { IconWarehouse, IconBuilding, IconChevronDown, IconCheck } from '../icons';

interface WarehouseFilterSelectDropdownProps {
  locations: Location[];
  selectedLocationId: string;
  onSelect: (locationId: string) => void;
  className?: string;
}

export const WarehouseFilterSelectDropdown: React.FC<WarehouseFilterSelectDropdownProps> = ({
  locations,
  selectedLocationId,
  onSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);
  const displayText =
    selectedLocationId === 'all' || !selectedLoc
      ? 'All Warehouses'
      : selectedLoc.name;

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
    <div className={`relative z-40 ${className}`} ref={dropdownRef}>
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
        title={`Filter by warehouse: ${displayText}`}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
          <IconWarehouse
            className={`h-3.5 w-3.5 shrink-0 ${
              isOpen || selectedLocationId !== 'all'
                ? 'text-teal-500 dark:text-teal-400'
                : 'text-slate-400'
            }`}
          />
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[11px] sm:text-xs">
            {displayText}
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
          className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-1.5 shadow-modal z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header info */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Filter Warehouse
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {locations.length + 1} options
            </span>
          </div>

          {/* All Warehouses Option */}
          <button
            type="button"
            role="option"
            aria-selected={selectedLocationId === 'all'}
            onClick={() => {
              onSelect('all');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
              selectedLocationId === 'all'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                  selectedLocationId === 'all'
                    ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <IconWarehouse className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    All Warehouses
                  </span>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 text-teal-700 dark:text-teal-400 shrink-0">
                    ALL
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                  Aggregated multi-location view
                </div>
              </div>
            </div>
            <div className="w-5 shrink-0 flex items-center justify-end ml-1.5">
              {selectedLocationId === 'all' && (
                <IconCheck className="h-4 w-4 text-teal-500" />
              )}
            </div>
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

          {/* Location List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {locations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(loc.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconBuilding className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {loc.name}
                        </span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {loc.code}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                        {loc.address || 'Active warehouse facility'}
                      </div>
                    </div>
                  </div>
                  <div className="w-5 shrink-0 flex items-center justify-end ml-1.5">
                    {isSelected && (
                      <IconCheck className="h-4 w-4 text-teal-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
