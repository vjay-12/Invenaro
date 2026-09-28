import { Router } from 'express';
import { purchaseOrderSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      orderBy: { order_date: 'desc' },
      include: {
        supplier: true,
        godown: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const formatted = pos.map((p) => ({
      ...p,
      subtotal: Number(p.subtotal),
      tax_total: Number(p.tax_total),
      grand_total: Number(p.grand_total),
      items: p.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost),
        tax_rate: Number(it.tax_rate),
        tax_amount: Number(it.tax_amount),
        total: Number(it.total),
      })),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch POs error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    // Normalize aliases from frontend if present
    const rawItems = Array.isArray(req.body.items)
      ? req.body.items.map((it: any) => ({
          ...it,
          quantity: typeof it.quantity === 'number' ? it.quantity : Number(it.ordered_qty || it.qty || 0),
          unit_cost: typeof it.unit_cost === 'number' ? it.unit_cost : Number(it.cost || it.price || 0),
        }))
      : req.body.items;

    const normalizedBody = {
      ...req.body,
      godown_id: req.body.godown_id || req.body.target_location_id,
      items: rawItems,
    };

    const parse = purchaseOrderSchema.safeParse(normalizedBody);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid PO data' });
      return;
    }

    const {
      supplier_id,
      supplier_name,
      supplier_phone,
      supplier_address,
      supplier_gstin,
      godown_id,
      order_date,
      expected_date,
      notes,
      items,
    } = parse.data;

    let targetGodownId = godown_id;
    if (targetGodownId) {
      const exists = await prisma.godown.findUnique({ where: { id: targetGodownId } });
      if (!exists) targetGodownId = undefined;
    }

    if (!targetGodownId) {
      let defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
      if (!defaultGodown) {
        defaultGodown = await prisma.godown.findFirst();
      }
      if (!defaultGodown) {
        defaultGodown = await prisma.godown.create({
          data: {
            name: 'Main Central Godown',
            code: 'MAIN-01',
            is_default: true,
            is_active: true,
          },
        });
      }
      targetGodownId = defaultGodown.id;
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let taxTotal = 0;

    const computedItems: any[] = [];
    for (const it of items) {
      let resolvedProdId = it.product_id;
      let prod = await prisma.product.findUnique({ where: { id: resolvedProdId } });
      const itemAny = it as any;
      if (!prod && (itemAny.sku || resolvedProdId)) {
        prod = await prisma.product.findFirst({
          where: {
            OR: [
              { sku: itemAny.sku || resolvedProdId },
              ...(itemAny.name ? [{ name: itemAny.name }] : []),
            ],
          },
        });
      }
      if (prod) {
        resolvedProdId = prod.id;
      }
      const itemSubtotal = it.quantity * it.unit_cost;
      const taxRate = it.tax_rate || (prod ? Number(prod.tax_rate) : 0);
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      computedItems.push({
        product_id: resolvedProdId,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
        tax_rate: taxRate,
        tax_amount: itemTax,
        total: itemTotal,
      });
    }

    const grandTotal = subtotal + taxTotal;

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        supplier_id: supplier_id || null,
        supplier_name,
        supplier_phone,
        supplier_address,
        supplier_gstin,
        godown_id: targetGodownId!,
        order_date: new Date(order_date),
        expected_date: expected_date ? new Date(expected_date) : null,
        status: 'ORDERED',
        subtotal,
        tax_total: taxTotal,
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

    res.status(201).json(po);
  } catch (err) {
    console.error('Create PO error:', err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

router.post('/:id/receive', async (req, res): Promise<void> => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (po.status === 'RECEIVED') {
      res.status(400).json({ error: 'Purchase order has already been received' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark PO received
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'RECEIVED' },
      });

      // 2. Record stock movements in ledger
      for (const item of po.items) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: po.godown_id,
            movement_type: 'PURCHASE_RECEIPT',
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
            reference_type: 'PURCHASE_ORDER',
            reference_id: po.id,
            notes: `Goods receipt for PO ${po.po_number}`,
            created_by: req.user?.id,
          },
          tx
        );
      }
    });

    res.json({ success: true, message: 'Stock received and ledger recorded successfully' });
  } catch (err) {
    console.error('Receive PO error:', err);
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
});

export default router;
