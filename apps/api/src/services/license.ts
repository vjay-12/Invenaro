import { DEFAULT_PLAN_MODULES } from '@invenaro/shared';
import { LicensePayload, PlanModules, PlanType } from '@invenaro/types';
import { prisma } from '../db.js';

export class LicenseService {
  private static cachedPayload: LicensePayload | null = null;
  private static lastCheck: number = 0;

  static async getEntitlements(): Promise<LicensePayload> {
    const now = Date.now();
    // Cache in-memory for 60 seconds
    if (this.cachedPayload && now - this.lastCheck < 60000) {
      return this.cachedPayload;
    }

    try {
      const cached = await prisma.licenseCache.findUnique({
        where: { id: 'active_license' },
      });

      if (cached) {
        let modules: PlanModules;
        try {
          modules = JSON.parse(cached.modules_json);
        } catch {
          modules = DEFAULT_PLAN_MODULES[cached.plan as PlanType] || DEFAULT_PLAN_MODULES.basic;
        }

        this.cachedPayload = {
          customer_id: cached.customer_id,
          plan: cached.plan as PlanType,
          expires_at: cached.expires_at.toISOString(),
          modules,
          domain: cached.domain || undefined,
        };
        this.lastCheck = now;
        return this.cachedPayload;
      }
    } catch (e) {
      console.warn('Could not read license_cache from DB, using fallback defaults:', e);
    }

    // Default fallback based on env or basic plan
    const plan: PlanType = (process.env.DEFAULT_PLAN as PlanType) || 'basic';
    const fallback: LicensePayload = {
      customer_id: process.env.CUSTOMER_ID || 'cust_local_dev',
      plan,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      modules: DEFAULT_PLAN_MODULES[plan],
      domain: process.env.CUSTOMER_DOMAIN || 'localhost',
    };

    this.cachedPayload = fallback;
    this.lastCheck = now;
    return fallback;
  }

  static async hasModule(moduleName: keyof PlanModules): Promise<boolean> {
    const entitlements = await this.getEntitlements();
    return Boolean(entitlements.modules[moduleName]);
  }
}
