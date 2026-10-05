import {
  DEFAULT_PLAN_MODULES,
  LicenseClaims,
  LicensePlan,
  LicenseStatusDTO,
  ModuleKey,
  PlanModulesMap,
} from '@invenaro/shared';
import { fetchLicenseVerification } from './client.js';
import { verifyLicenseToken } from './verifier.js';
import { getLicenseCache, recordLicenseError, saveLicenseCache } from './cache.js';
import { getLicenseState, OperationalLicenseState } from './state.js';

export const STANDALONE_BOUTIQUE_MODULES: PlanModulesMap = {
  multi_godown: false,
  transfers: false,
  invoices_returns: false,
  payments_dues: false,
  stock_control: false,
  gst: true,
  ledger_ui: false,
  reports_advanced: false,
  import_export: false,
  batch_expiry: false,
  barcode: false,
  ai_data_assistant: false,
  ai_knowledge_assistant: false,
};

export class LicenseService {
  private static inMemoryCache: {
    claims: LicenseClaims | null;
    state: OperationalLicenseState;
    fetchedAt: number;
  } | null = null;

  static async getEntitlements(): Promise<{
    customer_id: string;
    plan: LicensePlan;
    modules: PlanModulesMap;
    state: OperationalLicenseState;
    expires_at: string;
  }> {
    // In local_boutique standalone edition: operates in Basic view
    // with local PostgreSQL, boutique tailoring measurements, and vendors.
    return {
      customer_id: 'local_boutique',
      plan: 'basic',
      modules: STANDALONE_BOUTIQUE_MODULES,
      state: {
        state: 'active',
        message: 'Invenaro Local Boutique Edition - Standalone Basic',
        isReadOnly: false,
        isFullAccess: true,
        graceEndsAt: null,
      },
      expires_at: '9999-12-31T23:59:59.999Z',
    };
  }

  static async hasModule(_moduleName: ModuleKey): Promise<boolean> {
    return true;
  }

  static async getStatus(): Promise<LicenseStatusDTO> {
    return {
      plan: 'basic',
      modules: STANDALONE_BOUTIQUE_MODULES,
      state: 'active',
      licenseExpiresAt: null,
      graceEndsAt: null,
      message: 'Invenaro Local Boutique Edition - Standalone Basic',
    };
  }

  static async forceRefresh(): Promise<LicenseStatusDTO> {
    return this.getStatus();
  }

  static async getVerifiedClaims(): Promise<LicenseClaims | null> {
    return null;
  }

  static async getVerifiedAdminEmail(): Promise<string | null> {
    return null;
  }
}

export * from './client.js';
export * from './verifier.js';
export * from './state.js';
export * from './cache.js';
