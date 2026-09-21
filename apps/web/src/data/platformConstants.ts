export const INDUSTRIES_LIST = [
  'Retail & E-commerce',
  'Pharmaceuticals & Healthcare',
  'Manufacturing & Assembly',
  'Food & Beverage',
  'Electronics & High-Tech',
  'Logistics & Warehousing',
  'Chemicals & Energy',
  'Fashion & Apparel',
  'Construction & Materials',
  'Automotive & Aerospace',
  'General Merchandise',
];

export const AVAILABLE_MODULES = [
  { id: 'products', label: 'Products & SKUs', desc: 'Item catalog, categories, pricing, variants' },
  { id: 'locations', label: 'Warehouses & Locations', desc: 'Storage bins, facilities, capacities' },
  { id: 'orders', label: 'Purchase & Sales Orders', desc: 'PO receipt (GRN) and SO fulfillment' },
  { id: 'transfers', label: 'Stock Transfers', desc: 'Inter-warehouse movement logs' },
  { id: 'adjustments', label: 'Manual Adjustments', desc: 'Cycle counting and shrinkage reason codes' },
  { id: 'ledger', label: 'Immutable Audit Ledger', desc: 'Cryptographic append-only movement stream' },
  { id: 'reports', label: 'Valuation & Reports', desc: 'FIFO and Weighted Average costing analytics' },
  { id: 'storage', label: 'MinIO Document Storage', desc: 'Compliance certificates & file uploads' },
  { id: 'team', label: 'Teams & Roles', desc: 'Team member invitations, role management, and access controls' },
];

export interface IndianState {
  code: string;
  name: string;
}

export interface SupportedCountry {
  code: string;
  name: string;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IE', name: 'Ireland' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'US', name: 'United States' },
];

export interface UsState {
  code: string;
  name: string;
}

export const US_STATES_LIST: UsState[] = [
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'NY', name: 'New York' },
  { code: 'FL', name: 'Florida' },
  { code: 'IL', name: 'Illinois' },
  { code: 'WA', name: 'Washington' },
  { code: 'GA', name: 'Georgia' },
  { code: 'OH', name: 'Ohio' },
  { code: 'DE', name: 'Delaware' },
  { code: 'OR', name: 'Oregon' },
];

// Currency is always derived server-side from the country of registration.
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  BE: 'EUR',
  PL: 'EUR',
  SE: 'EUR',
  LU: 'EUR',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  EUR: '€',
  USD: '$',
};

export function currencySymbolFor(countryCode: string): string {
  return CURRENCY_SYMBOLS[COUNTRY_CURRENCY_MAP[countryCode] || 'INR'] || '₹';
}

export function formatMoney(amount: number | null | undefined, currencyCode: string = 'INR'): string {
  const num = Number(amount);
  const safeAmount = isNaN(num) ? 0 : num;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || CURRENCY_SYMBOLS.INR;
  return `${symbol}${safeAmount.toLocaleString(currencyCode === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const INDIAN_STATES_LIST: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export {
  getTaxRegimeForCountry,
  getTaxConfig,
  EU_VAT_RATES,
  US_STATE_SALES_TAX_RATES,
  INDIA_GST_SLABS,
} from '../utils/taxUtils';
export type { TaxRegime, TaxConfig } from '../utils/taxUtils';
