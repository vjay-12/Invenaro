import { PlanModules, PlanType } from '@invenaro/types';

export * from './license-schema.js';

export const DEFAULT_PLAN_MODULES: Record<PlanType, PlanModules> = {
  basic: {
    multi_godown: false,
    transfers: false,
    invoices_returns: false,
    payments_dues: false,
    stock_control: false,
    gst: false,
    ledger_ui: false,
    reports_advanced: false,
    import_export: false,
    batch_expiry: false,
    barcode: false,
    ai_data_assistant: false,
    ai_knowledge_assistant: false,
  },
  business: {
    multi_godown: true,
    transfers: true,
    invoices_returns: true,
    payments_dues: true,
    stock_control: true,
    gst: true,
    ledger_ui: true,
    reports_advanced: true,
    import_export: true,
    batch_expiry: false,
    barcode: false,
    ai_data_assistant: false,
    ai_knowledge_assistant: false,
  },
  enterprise: {
    multi_godown: true,
    transfers: true,
    invoices_returns: true,
    payments_dues: true,
    stock_control: true,
    gst: true,
    ledger_ui: true,
    reports_advanced: true,
    import_export: true,
    batch_expiry: true,
    barcode: true,
    ai_data_assistant: true,
    ai_knowledge_assistant: true,
  },
};

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export interface GSTBreakdown {
  isInterState: boolean;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateGST(
  amount: number,
  taxRate: number,
  supplierStateCode?: string | null,
  customerStateCode?: string | null,
  enableGST = true
): GSTBreakdown {
  if (!enableGST || taxRate <= 0) {
    return {
      isInterState: false,
      taxableAmount: amount,
      taxRate: 0,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: amount,
    };
  }

  const isInterState =
    Boolean(supplierStateCode && customerStateCode && supplierStateCode !== customerStateCode);

  const totalTax = (amount * taxRate) / 100;

  if (isInterState) {
    return {
      isInterState: true,
      taxableAmount: amount,
      taxRate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: taxRate,
      igstAmount: totalTax,
      totalTax,
      totalAmount: amount + totalTax,
    };
  } else {
    const halfRate = taxRate / 2;
    const halfTax = totalTax / 2;
    return {
      isInterState: false,
      taxableAmount: amount,
      taxRate,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: halfTax,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalAmount: amount + totalTax,
    };
  }
}
