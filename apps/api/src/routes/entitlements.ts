import { Router } from 'express';
import { LicenseService } from '../services/license.js';

const router = Router();

router.get('/', async (req, res): Promise<void> => {
  try {
    const entitlements = await LicenseService.getEntitlements();
    res.json(entitlements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve license entitlements' });
  }
});

export default router;
