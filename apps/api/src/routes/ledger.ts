import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';

const router = Router();

router.use(authMiddleware);
router.use(requireModule('ledger_ui'));

router.get('/', async (req, res): Promise<void> => {
  try {
    const { godown_id, product_id, movement_type, limit = '100', offset = '0' } = req.query;

    const where: any = {};
    if (godown_id) where.godown_id = String(godown_id);
    if (product_id) where.product_id = String(product_id);
    if (movement_type) where.movement_type = String(movement_type);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
        include: {
          product: true,
          godown: true,
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const formatted = movements.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
      unit_cost: Number(m.unit_cost),
      balance_after: Number(m.balance_after),
    }));

    res.json({
      data: formatted,
      total,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock ledger' });
  }
});

export default router;
