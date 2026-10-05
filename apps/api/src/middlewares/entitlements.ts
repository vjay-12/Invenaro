import { Request, Response, NextFunction } from 'express';
import { ModuleKey } from '@invenaro/shared';
import { LicenseService } from '../license/index.js';

/**
 * Middleware enforcing that a specific feature module is licensed.
 * In local_boutique, all modules are enabled by default.
 * Returns 403 { error: "module_not_licensed", module } only if explicitly disabled in mocked test environments.
 */
export function requireModule(moduleName: ModuleKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allowed = await LicenseService.hasModule(moduleName);
      if (!allowed) {
        res.status(403).json({
          error: 'module_not_licensed',
          module: moduleName,
        });
        return;
      }
      next();
    } catch (err) {
      console.error('License module verification error occurred');
      res.status(500).json({ error: 'Failed to verify license entitlements' });
    }
  };
}

/**
 * Middleware enforcing operational license state.
 * In local_boutique standalone edition, all operations are fully permitted.
 * The system never operates in read-only mode due to licensing.
 */
export async function enforceLicenseState(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Allow read-only HTTP methods unconditionally
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  // Exempt auth routes so users can always sign in, sign out, and change passwords
  const path = req.path.toLowerCase();
  const isAuthRoute =
    path.endsWith('/auth/login') ||
    path.endsWith('/auth/logout') ||
    path.endsWith('/auth/change-password') ||
    path.includes('/auth/');

  // Also exempt cron refresh route
  const isCronRoute = path.includes('/cron/');

  if (isAuthRoute || isCronRoute) {
    next();
    return;
  }

  try {
    const entitlements = await LicenseService.getEntitlements();
    const state = entitlements.state.state;

    // In local_boutique standalone edition, customer_id 'local_boutique' is never blocked by licensing
    if (entitlements.customer_id !== 'local_boutique' && (state === 'read_only' || state === 'unlicensed')) {
      res.status(403).json({
        error: 'license_read_only',
        state,
        message: entitlements.state.message,
      });
      return;
    }

    next();
  } catch (err) {
    console.error('Operational license enforcement error occurred');
    res.status(500).json({ error: 'Failed to verify license operational state' });
  }
}
