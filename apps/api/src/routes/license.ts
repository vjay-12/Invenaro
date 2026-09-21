import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { LicenseService } from '../license/index.js';

const router = Router();

/**
 * GET /api/license/status
 * Returns current license entitlements and operational state.
 * Authenticated; strictly never reveals license key or raw signed JWT.
 */
router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await LicenseService.getStatus();
    res.json(status);
  } catch (err) {
    console.error('Failed to get license status');
    res.status(500).json({ error: 'Failed to retrieve license status' });
  }
});

export default router;
