import { Request, Response, NextFunction } from 'express';
import { PlanModules, PlanType } from '@invenaro/types';
import { LicenseService } from '../services/license.js';

export function requireModule(moduleName: keyof PlanModules) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allowed = await LicenseService.hasModule(moduleName);
      if (!allowed) {
        res.status(403).json({
          error: `Module '${moduleName}' is not enabled for your plan. Please upgrade your subscription.`,
          module: moduleName,
        });
        return;
      }
      next();
    } catch (err) {
      console.error('Entitlement check error:', err);
      res.status(500).json({ error: 'Failed to verify license entitlements' });
    }
  };
}

export function requirePlan(...allowedPlans: PlanType[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entitlements = await LicenseService.getEntitlements();
      if (!allowedPlans.includes(entitlements.plan)) {
        res.status(403).json({
          error: `Feature requires one of the following plans: ${allowedPlans.join(', ')}. Your current plan is ${entitlements.plan}.`,
          currentPlan: entitlements.plan,
        });
        return;
      }
      next();
    } catch (err) {
      console.error('Plan check error:', err);
      res.status(500).json({ error: 'Failed to verify plan status' });
    }
  };
}
