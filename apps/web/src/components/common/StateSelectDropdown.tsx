import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck } from '../icons';
import { useInventory } from '../../context/InventoryContext';

interface StateOption {
  code: string;
  name: string;
  label: string;
}

const INDIA_STATE_OPTIONS: StateOption[] = [
  { code: '29', name: 'Karnataka', label: '29 - Karnataka (Intra-State CGST+SGST)' },
  { code: '33', name: 'Tamil Nadu', label: '33 - Tamil Nadu (Inter-State IGST)' },
  { code: '27', name: 'Maharashtra', label: '27 - Maharashtra (Inter-State IGST)' },
  { code: '07', name: 'Delhi', label: '07 - Delhi (Inter-State IGST)' },
  { code: '36', name: 'Telangana', label: '36 - Telangana (Inter-State IGST)' },
  { code: '24', name: 'Gujarat', label: '24 - Gujarat (Inter-State IGST)' },
  { code: '32', name: 'Kerala', label: '32 - Kerala (Inter-State IGST)' },
  { code: '19', name: 'West Bengal', label: '19 - West Bengal (Inter-State IGST)' },
];

const US_STATE_OPTIONS: StateOption[] = [
  { code: 'CA', name: 'California', label: 'CA - California (7.25% Sales Tax)' },
  { code: 'DE', name: 'Delaware', label: 'DE - Delaware (0% - Tax-Exempt)' },
  { code: 'NY', name: 'New York', label: 'NY - New York (4.0% Sales Tax)' },
  { code: 'TX', name: 'Texas', label: 'TX - Texas (6.25% Sales Tax)' },
  { code: 'FL', name: 'Florida', label: 'FL - Florida (6.0% Sales Tax)' },
  { code: 'WA', name: 'Washington', label: 'WA - Washington (6.5% Sales Tax)' },
  { code: 'IL', name: 'Illinois', label: 'IL - Illinois (6.25% Sales Tax)' },
  { code: 'OR', name: 'Oregon', label: 'OR - Oregon (0% - Tax-Exempt)' },
];

const EU_REGION_OPTIONS: StateOption[] = [
  { code: 'DE', name: 'Germany', label: 'DE - Germany (Domestic 19% VAT)' },
  { code: 'FR', name: 'France', label: 'FR - France (Intra-EU Reverse Charge)' },
  { code: 'NL', name: 'Netherlands', label: 'NL - Netherlands (Intra-EU Reverse Charge)' },
  { code: 'IT', name: 'Italy', label: 'IT - Italy (Intra-EU Reverse Charge)' },
  { code: 'ES', name: 'Spain', label: 'ES - Spain (Intra-EU Reverse Charge)' },
  { code: 'AT', name: 'Austria', label: 'AT - Austria (Intra-EU Reverse Charge)' },
  { code: 'EX', name: 'Export', label: 'EX - Non-EU Export (0% Zero-Rated)' },
];

interface StateSelectDropdownProps {
  selectedCode: string;
  onSelect: (code: string, name: string) => void;
  disabled?: boolean;
  className?: string;
}

export const StateSelectDropdown: React.FC<StateSelectDropdownProps> = ({
  selectedCode,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const { taxConfig } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const stateOptions =
    taxConfig?.taxType === 'VAT'
      ? EU_REGION_OPTIONS
      : taxConfig?.taxType === 'SALES_TAX'
      ? US_STATE_OPTIONS
      : INDIA_STATE_OPTIONS;

  const selectedState =
    stateOptions.find((s) => s.code.toLowerCase() === selectedCode.toLowerCase() || s.name.toLowerCase() === selectedCode.toLowerCase()) ||
    stateOptions[0];

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
        } ${className}`}
      >
        <span className="truncate font-mono text-[11px] text-slate-800 dark:text-slate-200">
          {selectedState.label}
        </span>
        <IconChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 w-full min-w-[280px] sm:min-w-[320px] z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111622] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Place of Supply / {taxConfig?.taxLabel || 'Tax'} Region
          </div>
          {stateOptions.map((st) => {
            const isSelected = st.code === selectedState.code;
            return (
              <button
                key={st.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(st.code, st.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors text-xs font-mono cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <span className="truncate">{st.label}</span>
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
