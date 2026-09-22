import { z } from 'zod';

export const MODULE_KEYS = [
  'multi_godown',
  'transfers',
  'invoices_returns',
  'payments_dues',
  'stock_control',
  'gst',
  'ledger_ui',
  'reports_advanced',
  'import_export',
  'batch_expiry',
  'barcode',
  'ai_data_assistant',
  'ai_knowledge_assistant',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const PlanModulesSchema = z.object({
  multi_godown: z.boolean(),
  transfers: z.boolean(),
  invoices_returns: z.boolean(),
  payments_dues: z.boolean(),
  stock_control: z.boolean(),
  gst: z.boolean(),
  ledger_ui: z.boolean(),
  reports_advanced: z.boolean(),
  import_export: z.boolean(),
  batch_expiry: z.boolean(),
  barcode: z.boolean(),
  ai_data_assistant: z.boolean(),
  ai_knowledge_assistant: z.boolean(),
});

export type PlanModulesMap = z.infer<typeof PlanModulesSchema>;

export const LicensePlanSchema = z.enum(['basic', 'business', 'enterprise']);
export type LicensePlan = z.infer<typeof LicensePlanSchema>;

export const LicenseStatusSchema = z.enum(['active', 'grace', 'expired', 'suspended']);
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>;

export const LicenseClaimsSchema = z.object({
  iss: z.literal('invenaro-control'),
  sub: z.string().min(1, 'Customer ID is required'),
  licenseId: z.string().min(1, 'License ID is required'),
  plan: LicensePlanSchema,
  modules: PlanModulesSchema,
  status: LicenseStatusSchema,
  licenseExpiresAt: z.string(),
  graceDays: z.number().nonnegative().default(7),
  domain: z.string(),
  adminEmail: z.string().optional(),
  iat: z.number(),
  exp: z.number(),
});

export type LicenseClaims = z.infer<typeof LicenseClaimsSchema>;

export const LicenseVerifyResponseSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string(),
  status: LicenseStatusSchema,
});

export type LicenseVerifyResponse = z.infer<typeof LicenseVerifyResponseSchema>;

export type LicenseOperationalState =
  | 'active'
  | 'grace'
  | 'read_only'
  | 'unlicensed';

export interface LicenseStatusDTO {
  plan: LicensePlan;
  modules: PlanModulesMap;
  state: LicenseOperationalState;
  licenseExpiresAt: string | null;
  graceEndsAt: string | null;
  message: string;
}
