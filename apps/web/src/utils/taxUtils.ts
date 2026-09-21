/**
 * Centralized Multi-Regime Tax & Currency Metadata Utility
 * Mirrors backend `app.services.tax_service` for seamless tenant UI adaptation.
 * Supports GST (India), VAT (EU), and Sales Tax (US).
 */

export type TaxRegime = 'GST' | 'VAT' | 'SALES_TAX' | 'NONE';

export interface TaxConfig {
  taxType: TaxRegime;
  taxLabel: string;
  countryCode: string;
  countryName: string;
  stateCode?: string;
  stateName?: string;
  currencyCode: 'INR' | 'EUR' | 'USD' | string;
  currencySymbol: string;
  standardRate: number;
  isZeroRate: boolean;
  defaultClassificationCode: string;
  sectionTitle: string;
  classificationLabel: string;
  classificationPlaceholder: string;
  classificationHelper: string;
  rateFieldLabel: string;
  rateHelper: string;
  taxIdLabel: string;
  invoiceTitle: string;
  invoicePageTitle: string;
  invoiceDescription: string;
  taxCollectedSubtitle: string;
  complianceBadge: string;
  legalProfileTitle: string;
  legalProfileSubtitle: string;
  legalSectionTitle: string;
  legalComplianceHelper: string;
  primaryTaxIdLabel: string;
  primaryTaxIdPlaceholder: string;
  secondaryTaxIdLabel: string;
  secondaryTaxIdPlaceholder: string;
  bankAccountLabel: string;
  bankAccountPlaceholder: string;
  bankRoutingLabel: string;
  bankRoutingPlaceholder: string;
  bankBranchLabel: string;
  legalFooterText: string;
  saveSettingsButtonText: string;
}

export const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  IE: 'Ireland',
  ES: 'Spain',
  IT: 'Italy',
  BE: 'Belgium',
  PL: 'Poland',
  SE: 'Sweden',
  LU: 'Luxembourg',
};

export const COUNTRY_CURRENCY_MAP: Record<string, 'INR' | 'EUR' | 'USD' | string> = {
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

export const EU_VAT_RATES: Record<string, number> = {
  DE: 19.0,
  FR: 20.0,
  NL: 21.0,
  IE: 23.0,
  ES: 21.0,
  IT: 22.0,
  BE: 21.0,
  PL: 23.0,
  SE: 25.0,
  LU: 17.0,
};

export const US_STATE_SALES_TAX_RATES: Record<string, number> = {
  CA: 7.25,
  TX: 6.25,
  NY: 4.0,
  FL: 6.0,
  IL: 6.25,
  WA: 6.5,
  GA: 4.0,
  OH: 5.75,
  DE: 0.0, // Delaware: 0% zero rate
  OR: 0.0, // Oregon: 0% zero rate
};

export const US_STATE_NAMES: Record<string, string> = {
  CA: 'California',
  TX: 'Texas',
  NY: 'New York',
  FL: 'Florida',
  IL: 'Illinois',
  WA: 'Washington',
  GA: 'Georgia',
  OH: 'Ohio',
  DE: 'Delaware',
  OR: 'Oregon',
};

export const INDIA_GST_SLABS = [
  { value: '0', label: '0% — GST Exempt Goods' },
  { value: '5', label: '5% — Essential Commodities' },
  { value: '18', label: '18% — Standard Goods & Services' },
  { value: '40', label: '40% — Demerit / Sin Goods (GST 2.0)' },
];

/**
 * Derives the Tax Regime from country code.
 */
export function getTaxRegimeForCountry(countryCode?: string): TaxRegime {
  const cc = (countryCode || 'IN').toUpperCase();
  if (cc === 'IN') return 'GST';
  if (cc === 'US') return 'SALES_TAX';
  return 'VAT';
}

/**
 * Normalizes US state name or 2-letter code -> (stateCode, stateName).
 */
export function resolveUsState(stateInput?: string): { code?: string; name?: string } {
  if (!stateInput) return {};
  const clean = stateInput.trim();
  const upper = clean.toUpperCase();
  if (US_STATE_NAMES[upper]) {
    return { code: upper, name: US_STATE_NAMES[upper] };
  }
  for (const [code, name] of Object.entries(US_STATE_NAMES)) {
    if (name.toLowerCase() === clean.toLowerCase()) {
      return { code, name };
    }
  }
  return { code: upper, name: clean };
}

/**
 * Builds the comprehensive tax configuration for an organization.
 */
export function getTaxConfig(
  countryCode?: string,
  stateInput?: string,
  overrideRate?: number,
  currencyCode?: string,
  taxEngine?: string
): TaxConfig {
  let cc = (countryCode || '').trim().toUpperCase();

  // If country code is missing or defaulted to 'IN', but currency indicates EU or US, infer correct country
  if (!cc || cc === 'IN') {
    if (currencyCode === 'EUR') {
      cc = 'DE';
    } else if (currencyCode === 'USD') {
      cc = 'US';
    } else {
      cc = 'IN';
    }
  }

  const taxType = taxEngine === 'NONE' ? 'NONE' : getTaxRegimeForCountry(cc);
  const countryName = COUNTRY_NAMES[cc] || cc;
  const resolvedCurrencyCode = COUNTRY_CURRENCY_MAP[cc] || (taxType === 'VAT' ? 'EUR' : taxType === 'SALES_TAX' ? 'USD' : 'INR');
  const currencySymbol = CURRENCY_SYMBOLS[resolvedCurrencyCode] || (taxType === 'VAT' ? '€' : taxType === 'SALES_TAX' ? '$' : '₹');

  if (taxType === 'NONE') {
    return {
      taxType: 'NONE',
      taxLabel: 'None',
      countryCode: cc,
      countryName,
      currencyCode: resolvedCurrencyCode,
      currencySymbol,
      standardRate: 0,
      isZeroRate: true,
      defaultClassificationCode: 'N/A',
      sectionTitle: 'Tax Exemption / Plain Receipts',
      classificationLabel: 'Product / SKU Code',
      classificationPlaceholder: 'N/A',
      classificationHelper: 'No tax classification required for this organization',
      rateFieldLabel: 'Tax Rate (Disabled)',
      rateHelper: 'Tax calculation is disabled at the organization level',
      taxIdLabel: 'Customer Reference ID (Optional)',
      invoiceTitle: 'Sales Receipts',
      invoicePageTitle: 'Sales Receipts',
      invoiceDescription: 'Plain Sales Receipts generated without tax line items or statutory claims.',
      taxCollectedSubtitle: 'No Tax Applicable',
      complianceBadge: 'Non-Tax / Plain Receipt',
      legalProfileTitle: 'Company Legal Profile & Commercial Receipts',
      legalProfileSubtitle: 'Legal parameters, company name, address, and bank remittance for sales receipts.',
      legalSectionTitle: 'Enterprise Commercial Profile (No Tax Engine)',
      legalComplianceHelper: 'Commercial identification for sales receipts',
      primaryTaxIdLabel: 'Commercial / Trade Registration # (Optional)',
      primaryTaxIdPlaceholder: 'Optional registration #',
      secondaryTaxIdLabel: 'National Business Identifier (Optional)',
      secondaryTaxIdPlaceholder: 'Optional identification #',
      bankAccountLabel: 'Bank Account Number / IBAN',
      bankAccountPlaceholder: 'Enter remittance account number',
      bankRoutingLabel: 'Routing / Sort / IFSC Code',
      bankRoutingPlaceholder: 'Enter bank routing identifier',
      bankBranchLabel: 'Bank Branch / City (Optional)',
      legalFooterText: 'Parameters are bound automatically to all commercial Sales Receipts and Delivery Notes.',
      saveSettingsButtonText: 'Save Commercial Profile',
    };
  }

  if (taxType === 'VAT') {
    const standardRate = overrideRate !== undefined ? overrideRate : (EU_VAT_RATES[cc] ?? 19.0);
    return {
      taxType: 'VAT',
      taxLabel: 'VAT',
      countryCode: cc,
      countryName,
      currencyCode: resolvedCurrencyCode,
      currencySymbol,
      standardRate,
      isZeroRate: standardRate === 0,
      defaultClassificationCode: '8471.30',
      sectionTitle: 'VAT Classification',
      classificationLabel: 'Taric / Commodity Code',
      classificationPlaceholder: 'e.g. 8471.30',
      classificationHelper: 'EU TARIC / Commodity classification code for VAT compliance',
      rateFieldLabel: 'Applicable VAT Rate *',
      rateHelper: `Statutory standard VAT rate for ${countryName} (${standardRate}%)`,
      taxIdLabel: 'Customer VAT ID',
      invoiceTitle: 'Invoices',
      invoicePageTitle: 'VAT Tax Invoices',
      invoiceDescription: `Sequential, unbroken tax invoices automatically generated upon Sales Order fulfillment with ${countryName} VAT (${standardRate}%) and PDF generation.`,
      taxCollectedSubtitle: `${countryName} Standard VAT`,
      complianceBadge: 'VAT Compliant',
      legalProfileTitle: 'Company Legal Profile & VAT Invoicing',
      legalProfileSubtitle: 'Mandatory legal parameters, VAT registration ID (USt-IdNr.), Steuernummer, and SEPA/wire remittance for tax-compliant invoices.',
      legalSectionTitle: 'Enterprise Legal Identity & Tax Registration (EU / VAT)',
      legalComplianceHelper: 'Required for EU VAT Invoicing compliance',
      primaryTaxIdLabel: 'USt-IdNr. (VAT ID) *',
      primaryTaxIdPlaceholder: 'DE123456789',
      secondaryTaxIdLabel: 'Steuernummer (Tax Number) *',
      secondaryTaxIdPlaceholder: 'e.g. 12/345/67890',
      bankAccountLabel: 'IBAN (Account Number) *',
      bankAccountPlaceholder: 'e.g. DE89 3704 0044 0532 0130 00',
      bankRoutingLabel: 'BIC / SWIFT Code *',
      bankRoutingPlaceholder: 'e.g. DEUTDEDDFXX',
      bankBranchLabel: 'Bank Branch / City (Optional)',
      legalFooterText: 'Parameters are bound automatically to all computer-generated Tax Invoices and Delivery Notes.',
      saveSettingsButtonText: 'Save VAT Settings',
    };
  }

  if (taxType === 'SALES_TAX') {
    const { code: stCode, name: stName } = resolveUsState(stateInput || 'CA');
    const rateFromState = stCode ? (US_STATE_SALES_TAX_RATES[stCode] ?? 7.25) : 7.25;
    const standardRate = overrideRate !== undefined ? overrideRate : rateFromState;
    const isZeroRate = standardRate === 0;

    return {
      taxType: 'SALES_TAX',
      taxLabel: 'Sales Tax',
      countryCode: 'US',
      countryName: 'United States',
      stateCode: stCode || 'CA',
      stateName: stName || 'California',
      currencyCode: resolvedCurrencyCode,
      currencySymbol,
      standardRate,
      isZeroRate,
      defaultClassificationCode: 'T-1000',
      sectionTitle: 'Sales Tax Classification',
      classificationLabel: 'Product Tax Category / Code',
      classificationPlaceholder: 'e.g. T-1000 (Taxable Goods)',
      classificationHelper: 'Product taxability category code for statutory sales tax compliance',
      rateFieldLabel: 'State Sales Tax Rate *',
      rateHelper: isZeroRate
        ? `0% rate auto-applied for ${stName || 'State'} (No state sales tax)`
        : `Statutory rate for ${stName || 'State'} (${standardRate}%)`,
      taxIdLabel: 'Customer Tax ID / Resale #',
      invoiceTitle: 'Invoices',
      invoicePageTitle: 'Sales Tax Invoices',
      invoiceDescription: `Sequential, unbroken tax invoices automatically generated upon Sales Order fulfillment with ${stName || 'State'} Sales Tax (${standardRate}%) and PDF generation.`,
      taxCollectedSubtitle: isZeroRate ? '0% State Sales Tax' : `${stName || 'State'} Sales Tax`,
      complianceBadge: isZeroRate ? '0% State Tax Exempt' : 'Sales Tax Compliant',
      legalProfileTitle: 'Company Legal Profile & Sales Tax Invoicing',
      legalProfileSubtitle: 'Mandatory legal parameters, Federal EIN, State Sales Tax registration, and ACH/wire remittance for tax-compliant invoices.',
      legalSectionTitle: 'Enterprise Legal Identity & Tax Registration (US / Sales Tax)',
      legalComplianceHelper: 'Required for US Sales Tax compliance',
      primaryTaxIdLabel: 'State Sales Tax Permit / Registration # *',
      primaryTaxIdPlaceholder: 'e.g. SR AC 12-345678',
      secondaryTaxIdLabel: 'Employer Identification Number (EIN) *',
      secondaryTaxIdPlaceholder: 'e.g. 12-3456789',
      bankAccountLabel: 'Account Number *',
      bankAccountPlaceholder: 'e.g. 1234567890',
      bankRoutingLabel: 'Routing Number (ABA) *',
      bankRoutingPlaceholder: 'e.g. 021000021',
      bankBranchLabel: 'Bank Branch / City (Optional)',
      legalFooterText: 'Parameters are bound automatically to all computer-generated Sales Invoices and Packing Slips.',
      saveSettingsButtonText: 'Save Sales Tax Settings',
    };
  }

  // Default: Indian GST
  const standardRate = overrideRate !== undefined ? overrideRate : 18.0;
  return {
    taxType: 'GST',
    taxLabel: 'GST',
    countryCode: 'IN',
    countryName: 'India',
    stateCode: '29',
    stateName: stateInput || 'Karnataka',
    currencyCode: 'INR',
    currencySymbol: '₹',
    standardRate,
    isZeroRate: false,
    defaultClassificationCode: '8471',
    sectionTitle: 'GST 2.0 Statutory Classification',
    classificationLabel: 'HSN / SAC Code',
    classificationPlaceholder: 'e.g. 8471',
    classificationHelper: 'Harmonized System Nomenclature code printed on invoices',
    rateFieldLabel: 'GST Rate Slab *',
    rateHelper: 'Valid GST 2.0 standard rates',
    taxIdLabel: 'Customer GSTIN',
    invoiceTitle: 'Invoices',
    invoicePageTitle: 'GST Tax Invoices',
    invoiceDescription: 'Sequential, unbroken tax invoices automatically generated upon Sales Order fulfillment with CGST, SGST, IGST tax breakdown and PDF generation.',
    taxCollectedSubtitle: 'CGST + SGST + IGST',
    complianceBadge: 'GST Compliant',
    legalProfileTitle: 'Company Legal Profile & GST Invoicing',
    legalProfileSubtitle: 'Mandatory legal parameters, 15-digit GSTIN, state code, and bank remittance for tax-compliant invoices.',
    legalSectionTitle: 'Enterprise Legal Identity & Tax Registration',
    legalComplianceHelper: 'Required for GST e-Invoicing compliance',
    primaryTaxIdLabel: 'Company GSTIN (15 Digits) *',
    primaryTaxIdPlaceholder: '29AABCI1234F1Z5',
    secondaryTaxIdLabel: 'Permanent Account Number (PAN) *',
    secondaryTaxIdPlaceholder: 'AABCI1234F',
    bankAccountLabel: 'Bank Account Number *',
    bankAccountPlaceholder: '50200012345678',
    bankRoutingLabel: 'IFSC Code *',
    bankRoutingPlaceholder: 'HDFC0001234',
    bankBranchLabel: 'Bank Branch Name & City',
    legalFooterText: 'Parameters are bound automatically to all computer-generated Tax Invoices, Delivery Challans, and E-Way bills.',
    saveSettingsButtonText: 'Save GST Settings',
  };
}
