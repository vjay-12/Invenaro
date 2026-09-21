import React from 'react';
import { Modal } from '../common/Modal';
import {
  IconBookOpen,
  IconSearch,
  IconPackage,
  IconFileDown,
  IconFileUp,
  IconLayers,
  IconBot,
  IconArrowRight,
} from '../icons';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
  onNavigate?: (tab: string) => void;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenChat,
  onNavigate,
}) => {
  const guides = [
    {
      title: 'Master SKU & Catalog Schema',
      desc: 'Configuring custom JSONB attributes, barcode generation, unit of measures, and safety reorder points.',
      tab: 'products',
      icon: IconPackage,
    },
    {
      title: 'Goods Receipt Notes (GRN)',
      desc: 'Issuing purchase orders to suppliers, recording verified inbound deliveries, and automated ledger IN postings.',
      tab: 'purchase_orders',
      icon: IconFileDown,
    },
    {
      title: 'Customer Dispatches & Invoicing',
      desc: 'Fulfilling sales orders, automated ledger OUT depletion, and generating tax-compliant PDF invoices in MinIO.',
      tab: 'sales_orders',
      icon: IconFileUp,
    },
    {
      title: 'Double-Entry Movement Ledger',
      desc: 'Cryptographically consistent audit trails, cycle count shrinkage reason codes, and stock valuation models.',
      tab: 'ledger',
      icon: IconLayers,
    },
  ];

  const handleGuideClick = (tab: string) => {
    onClose();
    if (onNavigate) onNavigate(tab);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invenza Help Center & Knowledge Base"
      subtitle="Operational guides, accounting workflows, and enterprise inventory best practices"
      maxWidth="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Ctrl + K
            </span>
            <span>Quick search across records</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenChat) onOpenChat();
            }}
            className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
          >
            <IconBot className="h-4 w-4" />
            <span>Launch Invenza Copilot AI</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-xs text-teal-900 dark:text-teal-200">
          <div className="flex items-start gap-3">
            <IconBookOpen className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-teal-800 dark:text-teal-300">
                Enterprise Inventory Architecture Documentation
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                Invenza follows an append-only double-entry ledger design. Physical stock cannot be edited directly — it is derived from immutable IN, OUT, and ADJUST transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guides.map((g, idx) => {
            const Icon = g.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleGuideClick(g.tab)}
                className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F4F5F8]/70 dark:bg-[#0C1017]/70 hover:border-teal-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group focus:outline-none"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <IconArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white mt-2.5">
                  {g.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {g.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
