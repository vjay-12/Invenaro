import { Router, Request, Response } from 'express';
import { LicenseService } from '../license/index.js';

const router = Router();

/**
 * GET /api/cron/license-refresh
 * Invoked daily by Vercel Cron or manual scheduled worker.
 * Protected by CRON_SECRET (Authorization: Bearer <CRON_SECRET>).
 */
router.get('/license-refresh', async (req: Request, res: Response): Promise<void> => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (!cronSecret || cronSecret.trim() === '') {
    res.status(500).json({ error: 'CRON_SECRET is not configured on server' });
    return;
  }

  const expectedHeader = `Bearer ${cronSecret.trim()}`;
  if (!authHeader || authHeader !== expectedHeader) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing cron secret' });
    return;
  }

  try {
    const updatedStatus = await LicenseService.forceRefresh();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      plan: updatedStatus.plan,
      state: updatedStatus.state,
      message: updatedStatus.message,
    });
  } catch (err: any) {
    console.error('Cron license refresh failed:', err.message);
    res.status(500).json({
      error: 'license_refresh_failed',
      message: err.message,
    });
  }
});

export default router;
