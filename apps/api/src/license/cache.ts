import { prisma } from '../db.js';
import { PlanModulesMap } from '@invenaro/shared';

export interface LicenseCacheRecord {
  id: string;
  token: string;
  fetchedAt: Date;
  tokenExp: Date;
  status: string;
  plan: string;
  modules: PlanModulesMap;
  lastError: string | null;
  lastAttemptAt: Date;
}

export async function getLicenseCache(): Promise<LicenseCacheRecord | null> {
  try {
    const cached = await prisma.licenseCache.findUnique({
      where: { id: 'active_license' },
    });

    if (!cached) return null;

    return {
      id: cached.id,
      token: cached.token,
      fetchedAt: cached.fetchedAt,
      tokenExp: cached.tokenExp,
      status: cached.status,
      plan: cached.plan,
      modules: cached.modules as unknown as PlanModulesMap,
      lastError: cached.lastError,
      lastAttemptAt: cached.lastAttemptAt,
    };
  } catch (err) {
    console.warn('⚠️ Could not read LicenseCache from database:', err);
    return null;
  }
}

export async function saveLicenseCache(data: {
  token: string;
  tokenExp: Date;
  status: string;
  plan: string;
  modules: PlanModulesMap;
  lastError?: string | null;
}): Promise<void> {
  try {
    await prisma.licenseCache.upsert({
      where: { id: 'active_license' },
      update: {
        token: data.token,
        fetchedAt: new Date(),
        tokenExp: data.tokenExp,
        status: data.status,
        plan: data.plan,
        modules: data.modules as any,
        lastError: data.lastError ?? null,
        lastAttemptAt: new Date(),
      },
      create: {
        id: 'active_license',
        token: data.token,
        fetchedAt: new Date(),
        tokenExp: data.tokenExp,
        status: data.status,
        plan: data.plan,
        modules: data.modules as any,
        lastError: data.lastError ?? null,
        lastAttemptAt: new Date(),
      },
    });
  } catch (err) {
    console.error('❌ Failed to persist LicenseCache to database:', err);
  }
}

export async function recordLicenseError(errorMessage: string): Promise<void> {
  try {
    const existing = await prisma.licenseCache.findUnique({
      where: { id: 'active_license' },
    });

    if (existing) {
      await prisma.licenseCache.update({
        where: { id: 'active_license' },
        data: {
          lastError: errorMessage,
          lastAttemptAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.warn('Could not record license error to database:', err);
  }
}
