import { Router } from 'express';
import { salesOrderSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const orders = await prisma.salesOrder.findMany({
      orderBy: { order_date: 'desc' },
      include: {
        customer: true,
        godown: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const formatted = orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      tax_total: Number(o.tax_total),
      discount_total: Number(o.discount_total),
      grand_total: Number(o.grand_total),
      items: o.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount: Number(it.discount),
        tax_rate: Number(it.tax_rate),
        tax_amount: Number(it.tax_amount),
        total: Number(it.total),
      })),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch sales orders error:', err);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const parse = salesOrderSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid sales order data' });
      return;
    }

    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_gstin,
      godown_id,
      order_date,
      notes,
      items,
    } = parse.data;

    // Pick godown
    let targetGodownId = godown_id;
    if (!targetGodownId) {
      const defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
      targetGodownId = defaultGodown?.id;
      if (!targetGodownId) {
        res.status(400).json({ error: 'No default godown found' });
        return;
      }
    }

    // Generate unique order number (e.g. SO-2026-0001)
    const count = await prisma.salesOrder.count();
    const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Compute totals
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const computedItems = items.map((it) => {
      const itemSubtotal = it.quantity * it.unit_price;
      const itemDiscount = it.discount || 0;
      const taxable = Math.max(0, itemSubtotal - itemDiscount);
      const itemTax = (taxable * (it.tax_rate || 0)) / 100;
      const itemTotal = taxable + itemTax;

      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      taxTotal += itemTax;

      return {
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: itemDiscount,
        tax_rate: it.tax_rate || 0,
        tax_amount: itemTax,
        total: itemTotal,
      };
    });

    const grandTotal = subtotal - discountTotal + taxTotal;

    // Create sales order and deduct stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.salesOrder.create({
        data: {
          order_number: orderNumber,
          customer_id: customer_id || null,
          customer_name,
          customer_phone,
          customer_address,
          customer_gstin,
          godown_id: targetGodownId!,
          order_date: new Date(order_date),
          status: 'CONFIRMED',
          subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          grand_total: grandTotal,
          notes,
          created_by: req.user?.id,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: { include: { product: true } },
          godown: true,
        },
      });

      // Automatically record stock movements (SALES_DELIVERY)
      for (const item of computedItems) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: targetGodownId!,
            movement_type: 'SALES_DELIVERY',
            quantity: -item.quantity, // deduction
            unit_cost: item.unit_price,
            reference_type: 'SALES_ORDER',
            reference_id: createdOrder.id,
            notes: `Delivery for order ${orderNumber}`,
            created_by: req.user?.id,
          },
          tx
        );
      }

      return createdOrder;
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Create sales order error:', err);
    res.status(500).json({ error: 'Failed to create sales order' });
  }
});

router.get('/:id', async (req, res): Promise<void> => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        godown: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

export default router;
