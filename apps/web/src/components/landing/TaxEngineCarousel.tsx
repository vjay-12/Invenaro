import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconFileText,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from '../icons';

export interface TaxMatrixRule {
  id: string;
  title: string;
  subtitle: string;
  taxEffect: string;
  colorScheme: 'teal' | 'purple';
}

export interface TaxSimulatorOption {
  id: string;
  label: string;
  sublabel: string;
  rateDesc: string;
  taxLines: (subtotal: number) => Array<{
    label: string;
    amount: number;
    highlightColor: string;
  }>;
}

export interface TaxSlideConfig {
  id: string;
  tabLabel: string;
  regimeCode: 'GST' | 'VAT' | 'SALES_TAX';
  countryBadge: string;
  headline: string;
  description: string;
  keyBenefits: string[];
  ruleMatrix: {
    title: string;
    rules: [TaxMatrixRule, TaxMatrixRule];
  };
  simulator: {
    title: string;
    itemName: string;
    unitPrice: number;
    currencyCode: string;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    options: [TaxSimulatorOption, TaxSimulatorOption];
  };
}

export const DEFAULT_TAX_SLIDES: TaxSlideConfig[] = [
  // Slide 1: India GST Model
  {
    id: 'gst',
    tabLabel: 'GST Engine (India)',
    regimeCode: 'GST',
    countryBadge: 'Automated Tax Engine · GST Model (India)',
    headline: 'Automated GST Invoicing: Intelligent CGST, SGST & IGST Routing',
    description:
      'Never second-guess tax rules or HSN assignments. Invenza evaluates supplier and buyer jurisdictions, automatically applying exact CGST + SGST splits or full IGST without manual calculation.',
    keyBenefits: [
      'Automatic splitting: Central Tax (CGST) + State Tax (SGST) for local transactions',
      'Full Integrated Tax (IGST) calculated automatically for cross-state orders',
      'Ready-to-print GST-compliant tax invoices with digital signature attachment',
    ],
    ruleMatrix: {
      title: 'Tax Rule Matrix',
      rules: [
        {
          id: 'SAME_STATE',
          title: 'Intra-State (Same State)',
          subtitle: 'Karnataka to Karnataka',
          taxEffect: 'Applies: 9% CGST + 9% SGST',
          colorScheme: 'teal',
        },
        {
          id: 'DIFFERENT_STATE',
          title: 'Inter-State (Cross-State)',
          subtitle: 'Karnataka to Maharashtra / Delhi',
          taxEffect: 'Applies: 18% Full IGST',
          colorScheme: 'purple',
        },
      ],
    },
    simulator: {
      title: 'Live Invoice Tax Preview',
      itemName: 'Industrial Bearings @ INR 1,200/unit',
      unitPrice: 1200,
      currencyCode: 'INR',
      currencySymbol: '₹',
      formatAmount: (amt) => `INR ${amt.toLocaleString('en-IN')}.00`,
      options: [
        {
          id: 'SAME_STATE',
          label: 'Same State (Local)',
          sublabel: 'CGST + SGST (9% + 9%)',
          rateDesc: '18% Split',
          taxLines: (subtotal) => [
            {
              label: 'Central Tax (CGST 9%):',
              amount: subtotal * 0.09,
              highlightColor: 'text-teal-800 dark:text-teal-400',
            },
            {
              label: 'State Tax (SGST 9%):',
              amount: subtotal * 0.09,
              highlightColor: 'text-teal-800 dark:text-teal-400',
            },
          ],
        },
        {
          id: 'DIFFERENT_STATE',
          label: 'Different State (Inter-State)',
          sublabel: 'IGST (18%)',
          rateDesc: '18% Full',
          taxLines: (subtotal) => [
            {
              label: 'Integrated Tax (IGST 18%):',
              amount: subtotal * 0.18,
              highlightColor: 'text-purple-800 dark:text-purple-400',
            },
          ],
        },
      ],
    },
  },

  // Slide 2: EUR VAT Model
  {
    id: 'vat',
    tabLabel: 'VAT Engine (EU)',
    regimeCode: 'VAT',
    countryBadge: 'Automated Tax Engine · VAT Model (European Union)',
    headline: 'Automated EU VAT Invoicing: Destination Principles & Reverse Charge Ready',
    description:
      'Effortless compliance across European tax jurisdictions. Invenza dynamically determines destination VAT principles and applies exact standard vs reduced rate classifications.',
    keyBenefits: [
      'Automated rate classification: 19% Standard Rate vs 7% Reduced Rate for qualifying goods',
      'Cross-border EU B2B reverse charge validation with VIES-ready VAT ID logging',
      'EU Directive 2006/112/EC compliant bilingual invoice output with EUR tax breakdowns',
    ],
    ruleMatrix: {
      title: 'Tax Rule Matrix',
      rules: [
        {
          id: 'STANDARD_RATE',
          title: 'Standard-Rated Goods',
          subtitle: 'Electronics, Clothing, Machinery',
          taxEffect: 'Applies: 19% Standard VAT (DE/EU)',
          colorScheme: 'teal',
        },
        {
          id: 'REDUCED_RATE',
          title: 'Reduced-Rated Goods',
          subtitle: 'Books, Groceries & Medical Supplies',
          taxEffect: 'Applies: 7% Reduced VAT (DE/EU)',
          colorScheme: 'purple',
        },
      ],
    },
    simulator: {
      title: 'Live Invoice Tax Preview',
      itemName: 'Precision Servo Drives @ EUR 120.00/unit',
      unitPrice: 120,
      currencyCode: 'EUR',
      currencySymbol: '€',
      formatAmount: (amt) =>
        `EUR ${amt.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      options: [
        {
          id: 'STANDARD_RATE',
          label: 'Standard Rate (DE / EU)',
          sublabel: 'Standard Rate (19% VAT)',
          rateDesc: '19% Standard',
          taxLines: (subtotal) => [
            {
              label: 'Value Added Tax (VAT 19%):',
              amount: subtotal * 0.19,
              highlightColor: 'text-teal-800 dark:text-teal-400',
            },
          ],
        },
        {
          id: 'REDUCED_RATE',
          label: 'Reduced Rate (Qualifying)',
          sublabel: 'Reduced Rate (7% VAT)',
          rateDesc: '7% Reduced',
          taxLines: (subtotal) => [
            {
              label: 'Reduced Value Added Tax (VAT 7%):',
              amount: subtotal * 0.07,
              highlightColor: 'text-purple-800 dark:text-purple-400',
            },
          ],
        },
      ],
    },
  },

  // Slide 3: USD Sales Tax Model
  {
    id: 'sales_tax',
    tabLabel: 'Sales Tax Engine (USA)',
    regimeCode: 'SALES_TAX',
    countryBadge: 'Automated Tax Engine · Sales Tax Model (United States)',
    headline: 'Automated US Sales Tax: Nexus-Aware State & Local Rates',
    description:
      'Zero guesswork across nexus jurisdictions. Invenza evaluates origin and destination addresses, automatically calculating single-stage state sales tax or zero-rate exemptions.',
    keyBenefits: [
      'Dynamic state rate evaluation: California (7.25%) vs zero-rate states (Delaware, Oregon 0%)',
      'Single-stage retail sales tax calculation without cumbersome intermediate tax cascading',
      'Audit-ready transaction records with exemption certificate logging and state-level reporting',
    ],
    ruleMatrix: {
      title: 'Tax Rule Matrix',
      rules: [
        {
          id: 'STANDARD_STATE',
          title: 'Standard Sales Tax State',
          subtitle: 'California (7.25%), Texas, New York',
          taxEffect: 'Applies: Single-Stage Destination Sales Tax',
          colorScheme: 'teal',
        },
        {
          id: 'ZERO_STATE',
          title: 'Zero-Tax State',
          subtitle: 'Delaware (0%), Oregon (0%), NH',
          taxEffect: 'Applies: 0% Tax Exempt (Full Relief)',
          colorScheme: 'purple',
        },
      ],
    },
    simulator: {
      title: 'Live Invoice Tax Preview',
      itemName: 'Commercial Network Switches @ USD 150.00/unit',
      unitPrice: 150,
      currencyCode: 'USD',
      currencySymbol: '$',
      formatAmount: (amt) =>
        `USD ${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      options: [
        {
          id: 'STANDARD_STATE',
          label: 'Standard Tax State (e.g. CA)',
          sublabel: 'Destination Sales Tax (~7.25%)',
          rateDesc: '7.25% Destination Rate',
          taxLines: (subtotal) => [
            {
              label: 'State Sales Tax (CA 7.25%):',
              amount: subtotal * 0.0725,
              highlightColor: 'text-teal-800 dark:text-teal-400',
            },
          ],
        },
        {
          id: 'ZERO_STATE',
          label: 'Zero-Tax State (e.g. DE / OR)',
          sublabel: 'Exempt / Zero Rate (0%)',
          rateDesc: '0% Non-Taxable',
          taxLines: () => [
            {
              label: 'State Sales Tax (0% Exempt):',
              amount: 0,
              highlightColor: 'text-purple-800 dark:text-purple-400',
            },
          ],
        },
      ],
    },
  },
];

interface TaxEngineCarouselProps {
  slides?: TaxSlideConfig[];
  autoAdvanceInterval?: number; // default 3000ms
  currentSlideIndex?: number;
  onSlideChange?: (index: number) => void;
}

export const TaxEngineCarousel: React.FC<TaxEngineCarouselProps> = ({
  slides = DEFAULT_TAX_SLIDES,
  autoAdvanceInterval = 3000,
  currentSlideIndex: controlledIndex,
  onSlideChange,
}) => {
  const [internalSlideIndex, setInternalSlideIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const currentSlideIndex = controlledIndex !== undefined ? controlledIndex : internalSlideIndex;

  const updateSlideIndex = useCallback(
    (updater: number | ((prev: number) => number)) => {
      if (typeof updater === 'function') {
        if (controlledIndex !== undefined) {
          const next = updater(controlledIndex);
          onSlideChange?.(next);
        } else {
          setInternalSlideIndex((prev) => {
            const next = updater(prev);
            onSlideChange?.(next);
            return next;
          });
        }
      } else {
        if (controlledIndex === undefined) {
          setInternalSlideIndex(updater);
        }
        onSlideChange?.(updater);
      }
    },
    [controlledIndex, onSlideChange]
  );

  // Per-slide interactive state (selected option ID & quantity)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({
    gst: 'SAME_STATE',
    vat: 'STANDARD_RATE',
    sales_tax: 'STANDARD_STATE',
  });

  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({
    gst: 20,
    vat: 20,
    sales_tax: 20,
  });

  const activeSlide = slides[currentSlideIndex] || slides[0];
  const activeOptionId =
    selectedOptions[activeSlide.id] || activeSlide.simulator.options[0].id;
  const activeQuantity = selectedQuantities[activeSlide.id] || 20;

  // Auto-advance timer (every 3 seconds, loops back to slide 1 after slide 3)
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      updateSlideIndex((prev) => (prev + 1) % slides.length);
    }, autoAdvanceInterval);

    return () => clearInterval(timer);
  }, [isPaused, slides.length, autoAdvanceInterval, updateSlideIndex]);

  const goToSlide = useCallback((index: number) => {
    updateSlideIndex(index);
  }, [updateSlideIndex]);

  const handlePrev = () => {
    updateSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    updateSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleSelectOption = (slideId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [slideId]: optionId }));
  };

  const handleSelectQuantity = (slideId: string, qty: number) => {
    setSelectedQuantities((prev) => ({ ...prev, [slideId]: qty }));
  };

  // Compute live calculations for the active slide
  const activeSimulatorOption =
    activeSlide.simulator.options.find((opt) => opt.id === activeOptionId) ||
    activeSlide.simulator.options[0];

  const subtotal = activeQuantity * activeSlide.simulator.unitPrice;
  const taxBreakdown = activeSimulatorOption.taxLines(subtotal);
  const totalTax = taxBreakdown.reduce((sum, line) => sum + line.amount, 0);
  const grandTotal = subtotal + totalTax;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative"
    >
      {/* Top Carousel Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Dynamic Slide Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-[#101520] border border-slate-300/80 dark:border-[#1E2636] overflow-x-auto">
          {slides.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-white dark:bg-[#1E2636] text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive
                      ? 'bg-teal-500 ring-2 ring-teal-500/30 shadow-[0_0_6px_rgba(20,184,166,0.8)]'
                      : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                />
                <span>{slide.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Manual Arrow Controls & Auto-advance Status */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline-block">
            {isPaused ? 'Paused on interaction' : 'Auto-advancing 3s'}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous tax regime slide"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1E2636] bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-500/30 transition-colors"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next tax regime slide"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1E2636] bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-500/30 transition-colors"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Slide Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center transition-all duration-300">
        {/* Left Column: Headline, Description, Benefits, and Interactive Matrix */}
        <div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 mb-2.5">
            <IconFileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
            {activeSlide.countryBadge}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5 transition-colors">
            {activeSlide.headline}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {activeSlide.description}
          </p>

          <div className="mt-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {activeSlide.keyBenefits.map((benefit, bIdx) => (
              <div key={bIdx} className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Tax Rule Matrix — Interactive Quick Guide */}
          <div className="mt-4 sm:mt-5 p-3.5 rounded-xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                {activeSlide.ruleMatrix.title}
              </span>
              <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400">
                Click Either Rule to Test
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {activeSlide.ruleMatrix.rules.map((rule) => {
                const isSelected = activeOptionId === rule.id;
                const isTeal = rule.colorScheme === 'teal';

                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleSelectOption(activeSlide.id, rule.id)}
                    className={`p-3 rounded-lg text-left transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? isTeal
                          ? 'bg-teal-50 dark:bg-[#0f2922] border-teal-500/60 ring-1 ring-teal-500/40 shadow-sm'
                          : 'bg-purple-50 dark:bg-[#2e1065] border-purple-500/60 ring-1 ring-purple-500/40 shadow-sm'
                        : isTeal
                        ? 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] hover:border-teal-500/30'
                        : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] hover:border-purple-500/30'
                    }`}
                  >
                    <div
                      className={`font-semibold flex items-center justify-between ${
                        isTeal
                          ? 'text-teal-800 dark:text-teal-400'
                          : 'text-purple-800 dark:text-purple-400'
                      }`}
                    >
                      <span>{rule.title}</span>
                      {isSelected && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isTeal ? 'bg-teal-500 dark:bg-teal-400' : 'bg-purple-500 dark:bg-purple-400'
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      {rule.subtitle}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 font-mono font-medium ${
                        isTeal
                          ? 'text-teal-800 dark:text-teal-300/80'
                          : 'text-purple-800 dark:text-purple-300/80'
                      }`}
                    >
                      {rule.taxEffect}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Invoice Preview Simulator */}
        <div className="p-5 sm:p-5.5 rounded-2xl bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1E2636] mb-3.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">
              {activeSlide.simulator.title}
            </span>
            <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
              Interactive Simulator
            </span>
          </div>

          {/* Simulator Option Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3.5">
            {activeSlide.simulator.options.map((opt, oIdx) => {
              const isSelected = activeOptionId === opt.id;
              const isFirst = oIdx === 0;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(activeSlide.id, opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? isFirst
                        ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-teal-300 font-bold shadow-sm'
                        : 'bg-purple-50 dark:bg-purple-500/15 border-purple-600 dark:border-purple-500 text-purple-900 dark:text-purple-300 font-bold shadow-sm'
                      : 'bg-[#F6F8FA] dark:bg-[#0C1017] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {opt.sublabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quantity Picker */}
          <div className="p-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] mb-3 text-xs">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-600 dark:text-slate-400 font-medium truncate pr-2">
                Item: {activeSlide.simulator.itemName}
              </span>
              <span className="font-bold text-teal-800 dark:text-teal-400 font-mono shrink-0">
                {activeQuantity} units
              </span>
            </div>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSelectQuantity(activeSlide.id, q)}
                  className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                    activeQuantity === q
                      ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-white font-bold shadow-sm'
                      : 'bg-white dark:bg-[#131924] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {q} pcs
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Invoice Breakdown */}
          <div className="p-3.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Taxable Goods Value:
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">
                {activeSlide.simulator.formatAmount(subtotal)}
              </span>
            </div>

            {taxBreakdown.map((line, lIdx) => (
              <div
                key={lIdx}
                className="flex justify-between py-1 border-b border-slate-200 dark:border-[#1E2636]/60"
              >
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  {line.label}
                </span>
                <span className={`font-mono font-semibold ${line.highlightColor}`}>
                  + {activeSlide.simulator.formatAmount(line.amount)}
                </span>
              </div>
            ))}

            <div className="flex justify-between py-1.5 border-t border-slate-200 dark:border-[#1E2636] font-bold text-sm">
              <span className="text-slate-900 dark:text-white">Total Invoice Amount:</span>
              <span className="font-mono text-emerald-800 dark:text-emerald-400 font-bold">
                {activeSlide.simulator.formatAmount(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Slide Indicator Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {slides.map((_, dotIdx) => (
          <button
            key={dotIdx}
            type="button"
            onClick={() => goToSlide(dotIdx)}
            aria-label={`Jump to slide ${dotIdx + 1}`}
            className={`transition-all duration-300 rounded-full ${
              dotIdx === currentSlideIndex
                ? 'w-6 h-2 bg-teal-500'
                : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
