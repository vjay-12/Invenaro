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
      const exists = await prisma.godown.findUnique({ where: { id: targetGodownId } }).catch(() => null);
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
    let poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { po_number: poNumber } });
    if (existingPO) {
      poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // Performance Optimization: Batch resolve all products in a single database query
    const productIds: string[] = [];
    const skus: string[] = [];
    const names: string[] = [];

    for (const it of items) {
      const itemAny = it as any;
      if (it.product_id) productIds.push(it.product_id);
      if (itemAny.sku) skus.push(itemAny.sku);
      if (itemAny.name) names.push(itemAny.name);
    }

    const orConditions: any[] = [];
    if (productIds.length > 0) orConditions.push({ id: { in: productIds } });
    if (skus.length > 0) orConditions.push({ sku: { in: skus } });
    if (names.length > 0) orConditions.push({ name: { in: names } });

    const matchedProducts = orConditions.length > 0
      ? await prisma.product.findMany({ where: { OR: orConditions } })
      : [];

    const prodById = new Map<string, any>();
    const prodBySku = new Map<string, any>();
    const prodByName = new Map<string, any>();
    for (const p of matchedProducts) {
      prodById.set(p.id, p);
      prodBySku.set(p.sku.toLowerCase(), p);
      prodByName.set(p.name.toLowerCase(), p);
    }

    let defaultFallbackProduct: any = null;

    let subtotal = 0;
    let taxTotal = 0;

    const computedItems: any[] = [];
    for (const it of items) {
      let resolvedProdId = it.product_id;
      const itemAny = it as any;

      let prod = prodById.get(resolvedProdId)
        || (itemAny.sku ? prodBySku.get(String(itemAny.sku).toLowerCase()) : null)
        || (resolvedProdId ? prodBySku.get(String(resolvedProdId).toLowerCase()) : null)
        || (itemAny.name ? prodByName.get(String(itemAny.name).toLowerCase()) : null);

      if (!prod) {
        if (!defaultFallbackProduct) {
          defaultFallbackProduct = await prisma.product.findFirst({ where: { is_active: true } });
        }
        prod = defaultFallbackProduct;
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
  } catch (err: any) {
    console.error('Create PO error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create purchase order' });
  }
});

router.post('/:id/receive', async (req, res): Promise<void> => {
  const poId = req.params.id;
  const { notes, items: receivedItems } = req.body;

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Fetch fresh PO inside transaction to prevent race conditions & double-receiving
        const po = await tx.purchaseOrder.findUnique({
          where: { id: poId },
          include: { items: true },
        });

        if (!po) {
          throw new Error('Purchase order not found');
        }

        if (po.status === 'RECEIVED') {
          throw new Error('Purchase order has already been received');
        }

        // Prevent duplicate ledger entries
        const existingReceipt = await tx.stockMovement.findFirst({
          where: {
            reference_id: po.id,
            movement_type: 'PURCHASE_RECEIPT',
          },
        });
        if (existingReceipt) {
          throw new Error('Goods receipt already recorded in ledger for this purchase order');
        }

        // 2. Mark PO received atomically
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'RECEIVED' },
        });

        // 3. Build received quantities map if custom quantities were provided
        const qtyMap: Record<string, number> = {};
        if (Array.isArray(receivedItems)) {
          for (const item of receivedItems) {
            if (item.product_id && typeof item.quantity === 'number') {
              qtyMap[item.product_id] = item.quantity;
            }
          }
        }

        // 4. Record stock movements in ledger and update stock balances atomically
        for (const item of po.items) {
          const qtyToReceive = qtyMap[item.product_id] !== undefined
            ? Math.max(0, qtyMap[item.product_id])
            : Number(item.quantity);

          if (qtyToReceive <= 0) continue;

          await LedgerService.recordMovement(
            {
              product_id: item.product_id,
              godown_id: po.godown_id,
              movement_type: 'PURCHASE_RECEIPT',
              quantity: qtyToReceive,
              unit_cost: Number(item.unit_cost),
              reference_type: 'PURCHASE_ORDER',
              reference_id: po.id,
              notes: notes ? `Goods receipt for PO ${po.po_number}: ${notes}` : `Goods receipt for PO ${po.po_number}`,
              created_by: req.user?.id,
            },
            tx
          );
        }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    res.json({ success: true, message: 'Stock received and ledger recorded successfully' });
  } catch (err: any) {
    console.error('Receive PO error:', err);
    const msg = err?.message || 'Failed to receive purchase order';
    const status = msg.includes('not found') ? 404 : msg.includes('already') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
