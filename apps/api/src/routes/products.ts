import { Router } from 'express';
import { productSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        category: true,
        stock_balances: {
          include: {
            godown: true,
          },
        },
      },
    });

    // Compute aggregated stock across godowns
    const result = products.map((p) => {
      const totalStock = p.stock_balances.reduce(
        (sum, b) => sum + Number(b.current_quantity),
        0
      );
      return {
        ...p,
        sale_price: Number(p.sale_price),
        purchase_price: Number(p.purchase_price),
        tax_rate: Number(p.tax_rate),
        min_stock_level: Number(p.min_stock_level),
        total_stock: totalStock,
        stock_by_godown: p.stock_balances.map((b) => ({
          godown_id: b.godown_id,
          godown_name: b.godown.name,
          quantity: Number(b.current_quantity),
          avg_cost: Number(b.avg_cost),
        })),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid product data' });
      return;
    }

    const {
      sku,
      name,
      description,
      category_id,
      unit,
      sale_price,
      purchase_price,
      hsn_code,
      tax_rate,
      min_stock_level,
      initial_stock,
      godown_id,
    } = parse.data;

    // Determine godown for initial stock
    let targetGodownId = godown_id;
    if (!targetGodownId) {
      const defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
      targetGodownId = defaultGodown?.id;
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category_id,
        unit,
        sale_price,
        purchase_price,
        hsn_code,
        tax_rate,
        min_stock_level,
      },
    });

    // If initial stock provided, record it in ledger
    if (initial_stock && initial_stock > 0 && targetGodownId) {
      await LedgerService.recordMovement({
        product_id: product.id,
        godown_id: targetGodownId,
        movement_type: 'ADJUSTMENT_ADD',
        quantity: initial_stock,
        unit_cost: purchase_price,
        reference_type: 'OPENING_STOCK',
        reference_id: product.id,
        notes: 'Initial stock recorded on product creation',
        created_by: req.user?.id,
      });
    }

    res.status(201).json(product);
  } catch (err: any) {
    console.error('Create product error:', err);
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Product SKU must be unique' });
      return;
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.get('/:id', async (req, res): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stock_balances: { include: { godown: true } },
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product' });
  }
});

export default router;
