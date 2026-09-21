import React, { useState, useRef, useEffect } from 'react';
import { Location } from '../../types/inventory';
import { IconWarehouse, IconChevronDown, IconCheck } from '../icons';

interface WarehouseSelectDropdownProps {
  locations: Location[];
  selectedLocationId: string;
  onSelect: (locationId: string) => void;
  disabled?: boolean;
}

export const WarehouseSelectDropdown: React.FC<WarehouseSelectDropdownProps> = ({
  locations,
  selectedLocationId,
  onSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLoc = locations.find((l) => l.id === selectedLocationId) || locations[0];

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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 h-[34px] rounded-lg border text-xs transition-colors text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-600 select-none ${
          isOpen
            ? 'border-teal-500/60 bg-teal-500/5 text-slate-900 dark:text-slate-100 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <IconWarehouse className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px] shrink-0">
            {selectedLoc?.code}
          </span>
          <span className="text-slate-400 dark:text-slate-600 text-[10px] shrink-0">:</span>
          <span className="truncate font-medium text-slate-800 dark:text-slate-200">
            {selectedLoc?.name}
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
          className="absolute left-0 top-full mt-1 w-full min-w-[260px] z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111622] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Fulfillment Warehouses ({locations.length})
          </div>
          {locations.map((loc) => {
            const isSelected = loc.id === selectedLoc?.id;
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 shrink-0">
                    {loc.code}
                  </span>
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {loc.name}
                  </span>
                </div>
                {isSelected && (
                  <IconCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
