import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';

const router = Router();

router.use(authMiddleware);

// Basic Dashboard Metrics (available to all plans)
router.get('/dashboard', async (req, res): Promise<void> => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      balances,
      recentOrders,
      recentMovements,
    ] = await Promise.all([
      prisma.product.count({ where: { is_active: true } }),
      prisma.salesOrder.count(),
      prisma.customer.count(),
      prisma.stockBalance.findMany({
        include: { product: true, godown: true },
      }),
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { order_date: 'desc' },
        include: { customer: true },
      }),
      prisma.stockMovement.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: { product: true, godown: true },
      }),
    ]);

    // Valuation & low stock
    let totalStockUnits = 0;
    let totalStockValue = 0;
    const lowStockItems: any[] = [];

    balances.forEach((b) => {
      const qty = Number(b.current_quantity);
      const cost = Number(b.avg_cost);
      totalStockUnits += qty;
      totalStockValue += qty * cost;

      if (qty <= Number(b.product.min_stock_level)) {
        lowStockItems.push({
          product_id: b.product.id,
          name: b.product.name,
          sku: b.product.sku,
          godown: b.godown.name,
          current_stock: qty,
          min_stock_level: Number(b.product.min_stock_level),
        });
      }
    });

    res.json({
      summary: {
        totalProducts,
        totalOrders,
        totalCustomers,
        totalStockUnits,
        totalStockValue,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems: lowStockItems.slice(0, 10),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        grand_total: Number(o.grand_total),
        status: o.status,
        order_date: o.order_date,
      })),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        movement_type: m.movement_type,
        product_name: m.product.name,
        godown_name: m.godown.name,
        quantity: Number(m.quantity),
        created_at: m.created_at,
      })),
    });
  } catch (err) {
    console.error('Dashboard reports error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Advanced Reports (Business plan)
router.get('/advanced', requireModule('reports_advanced'), async (req, res): Promise<void> => {
  try {

    // Godown distribution
    const godowns = await prisma.godown.findMany({
      include: {
        stock_balances: {
          include: { product: true },
        },
      },
    });

    const godownValuation = godowns.map((g) => {
      const totalUnits = g.stock_balances.reduce((acc, b) => acc + Number(b.current_quantity), 0);
      const totalVal = g.stock_balances.reduce(
        (acc, b) => acc + Number(b.current_quantity) * Number(b.avg_cost),
        0
      );
      return {
        godown_id: g.id,
        name: g.name,
        code: g.code,
        units: totalUnits,
        valuation: totalVal,
      };
    });

    res.json({
      godownValuation,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advanced reports' });
  }
});

export default router;
