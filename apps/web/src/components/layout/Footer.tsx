import React from 'react';

export interface FooterProps {
  currentTab?: string;
  onNavigate: (tab: string) => void;
  onOpenHelp?: () => void;
  onOpenContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentTab,
  onNavigate,
  onOpenHelp,
  onOpenContact,
}) => {
  return (
    <footer className="h-9 sm:h-10 shrink-0 w-full border-t border-slate-200 dark:border-[#16202E] bg-white dark:bg-[#070B12] px-4 sm:px-6 flex items-center justify-between z-30 select-none text-[11px] sm:text-xs transition-colors">
      {/* Left side: Powered by branding */}
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.8)] shrink-0" />
        <span className="truncate">
          Powered by <span className="font-semibold text-slate-900 dark:text-slate-200">Invenza</span> Platform © 2026
        </span>
      </div>

      {/* Right side: Inline links separated by dividers */}
      <nav aria-label="Footer Navigation" className="flex items-center gap-0.5 sm:gap-1 text-slate-600 dark:text-slate-400 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('privacy')}
          className={`px-1.5 py-0.5 rounded transition-colors focus:outline-none ${
            currentTab === 'privacy'
              ? 'text-teal-700 dark:text-teal-400 font-semibold'
              : 'hover:text-teal-700 dark:hover:text-teal-400'
          }`}
        >
          Privacy
        </button>

        <span className="text-slate-300 dark:text-slate-700 select-none text-[11px] px-1 font-light" aria-hidden="true">
          |
        </span>

        <button
          type="button"
          onClick={() => onNavigate('terms')}
          className={`px-1.5 py-0.5 rounded transition-colors focus:outline-none ${
            currentTab === 'terms'
              ? 'text-teal-700 dark:text-teal-400 font-semibold'
              : 'hover:text-teal-700 dark:hover:text-teal-400'
          }`}
        >
          Terms
        </button>

        <span className="text-slate-300 dark:text-slate-700 select-none text-[11px] px-1 font-light" aria-hidden="true">
          |
        </span>

        <button
          type="button"
          onClick={onOpenHelp}
          className="px-1.5 py-0.5 rounded hover:text-teal-700 dark:hover:text-teal-400 transition-colors focus:outline-none"
        >
          Help Center
        </button>

        <span className="text-slate-300 dark:text-slate-700 select-none text-[11px] px-1 font-light" aria-hidden="true">
          |
        </span>

        <button
          type="button"
          onClick={onOpenContact}
          className="px-1.5 py-0.5 rounded hover:text-teal-700 dark:hover:text-teal-400 transition-colors focus:outline-none"
        >
          Contact
        </button>
      </nav>
    </footer>
  );
};
