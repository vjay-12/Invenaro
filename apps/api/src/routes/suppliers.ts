import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchase_orders: true },
        },
      },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const { name, phone, email, address, state_code, gstin, opening_balance } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Supplier name is required' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone,
        email,
        address,
        state_code,
        gstin,
        opening_balance: opening_balance || 0,
      },
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

export default router;
