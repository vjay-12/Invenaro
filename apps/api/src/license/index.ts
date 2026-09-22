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
    const now = Date.now();

    // Fast in-memory cache for serverless invocation lifecycle (30 seconds)
    if (this.inMemoryCache && now - this.inMemoryCache.fetchedAt < 30000) {
      const { claims, state } = this.inMemoryCache;
      const plan = claims?.plan || 'basic';
      const modules = claims?.modules || DEFAULT_PLAN_MODULES[plan];
      return {
        customer_id: claims?.sub || 'unlicensed',
        plan,
        modules,
        state,
        expires_at: claims ? new Date(claims.exp * 1000).toISOString() : new Date().toISOString(),
      };
    }

    // 1. Read persistent cache from Postgres
    let cached = await getLicenseCache();
    let verifiedClaims: LicenseClaims | null = null;
    let isControlReachable = true;

    if (cached) {
      try {
        verifiedClaims = await verifyLicenseToken(cached.token);
      } catch (err: any) {
        console.warn('⚠️ Cached license token failed verification:', err.message);
        verifiedClaims = null;
      }
    }

    // 2. Lazy refresh if no valid cache or token expired
    const shouldRefresh =
      !cached ||
      !verifiedClaims ||
      now > (verifiedClaims?.exp ?? 0) * 1000;

    const licenseKey = process.env.LICENSE_KEY;

    if (shouldRefresh && licenseKey) {
      try {
        const verifyResp = await fetchLicenseVerification({ licenseKey });
        const freshClaims = await verifyLicenseToken(verifyResp.token);

        await saveLicenseCache({
          token: verifyResp.token,
          tokenExp: new Date(freshClaims.exp * 1000),
          status: freshClaims.status,
          plan: freshClaims.plan,
          modules: freshClaims.modules,
        });

        verifiedClaims = freshClaims;
        isControlReachable = true;
      } catch (err: any) {
        isControlReachable = false;
        console.warn('⚠️ Lazy license refresh failed:', err.message);
        await recordLicenseError(err.message);
      }
    }

    // 3. Compute operational state using pure state machine
    const offlineGraceDays = Number(process.env.LICENSE_OFFLINE_GRACE_DAYS || 7);
    const operationalState = getLicenseState({
      claims: verifiedClaims,
      now,
      isControlReachable,
      offlineGraceDays,
    });

    this.inMemoryCache = {
      claims: verifiedClaims,
      state: operationalState,
      fetchedAt: now,
    };

    const plan: LicensePlan = verifiedClaims?.plan || 'basic';
    const modules: PlanModulesMap = verifiedClaims?.modules || DEFAULT_PLAN_MODULES[plan];

    return {
      customer_id: verifiedClaims?.sub || 'unlicensed',
      plan,
      modules,
      state: operationalState,
      expires_at: verifiedClaims ? new Date(verifiedClaims.exp * 1000).toISOString() : new Date().toISOString(),
    };
  }

  static async hasModule(moduleName: ModuleKey): Promise<boolean> {
    const entitlements = await this.getEntitlements();
    return Boolean(entitlements.modules[moduleName]);
  }

  static async getStatus(): Promise<LicenseStatusDTO> {
    const entitlements = await this.getEntitlements();
    const claims = this.inMemoryCache?.claims;

    return {
      plan: entitlements.plan,
      modules: entitlements.modules,
      state: entitlements.state.state,
      licenseExpiresAt: claims?.licenseExpiresAt ?? null,
      graceEndsAt: entitlements.state.graceEndsAt,
      message: entitlements.state.message,
    };
  }

  static async forceRefresh(): Promise<LicenseStatusDTO> {
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      throw new Error('LICENSE_KEY is not configured');
    }

    const verifyResp = await fetchLicenseVerification({ licenseKey });
    const freshClaims = await verifyLicenseToken(verifyResp.token);

    await saveLicenseCache({
      token: verifyResp.token,
      tokenExp: new Date(freshClaims.exp * 1000),
      status: freshClaims.status,
      plan: freshClaims.plan,
      modules: freshClaims.modules,
    });

    this.inMemoryCache = null;
    return this.getStatus();
  }

  static async getVerifiedClaims(): Promise<LicenseClaims | null> {
    await this.getEntitlements();
    return this.inMemoryCache?.claims ?? null;
  }

  static async getVerifiedAdminEmail(): Promise<string | null> {
    const claims = await this.getVerifiedClaims();
    return claims?.adminEmail ? claims.adminEmail.trim().toLowerCase() : null;
  }
}

export * from './client.js';
export * from './verifier.js';
export * from './state.js';
export * from './cache.js';
