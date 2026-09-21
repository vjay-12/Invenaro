import { Router } from 'express';
import { godownSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const godowns = await prisma.godown.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        _count: {
          select: {
            stock_balances: true,
          },
        },
      },
    });
    res.json(godowns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch godowns' });
  }
});

// Creating additional godowns requires multi_godown module (Business plan)
router.post('/', requireModule('multi_godown'), async (req, res): Promise<void> => {
  try {
    const parse = godownSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid input' });
      return;
    }

    const { name, code, address, state_code, gstin, is_default } = parse.data;

    if (is_default) {
      await prisma.godown.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }

    const godown = await prisma.godown.create({
      data: {
        name,
        code,
        address,
        state_code,
        gstin,
        is_default,
      },
    });

    res.status(201).json(godown);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Godown code must be unique' });
      return;
    }
    res.status(500).json({ error: 'Failed to create godown' });
  }
});

export default router;
