import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);
router.use(requireModule('stock_control'));

router.get('/', async (req, res): Promise<void> => {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        godown: true,
        items: { include: { product: true } },
      },
    });
    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch adjustments' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const { godown_id, reason, notes, items } = req.body;
    if (!godown_id || !items || !items.length) {
      res.status(400).json({ error: 'Godown and items are required' });
      return;
    }

    const count = await prisma.stockAdjustment.count();
    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.stockAdjustment.create({
        data: {
          adjustment_number: adjustmentNumber,
          godown_id,
          reason: reason || 'Inventory Count',
          notes,
          created_by: req.user?.id,
          items: {
            create: items.map((it: any) => ({
              product_id: it.product_id,
              system_qty: it.system_qty || 0,
              counted_qty: it.counted_qty,
              diff_qty: (it.counted_qty || 0) - (it.system_qty || 0),
              unit_cost: it.unit_cost || 0,
            })),
          },
        },
        include: { items: true },
      });

      // For each item, record adjustment in ledger
      for (const item of items) {
        const diff = (item.counted_qty || 0) - (item.system_qty || 0);
        if (diff !== 0) {
          const movementType = diff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REDUCE';
          await LedgerService.recordMovement(
            {
              product_id: item.product_id,
              godown_id,
              movement_type: movementType,
              quantity: diff,
              unit_cost: item.unit_cost || 0,
              reference_type: 'STOCK_ADJUSTMENT',
              reference_id: adj.id,
              notes: `Adjustment ${adjustmentNumber}: ${reason || 'Physical Count'}`,
              created_by: req.user?.id,
            },
            tx
          );
        }
      }

      return adj;
    });

    res.status(201).json(adjustment);
  } catch (err) {
    console.error('Create adjustment error:', err);
    res.status(500).json({ error: 'Failed to create adjustment' });
  }
});

export default router;
