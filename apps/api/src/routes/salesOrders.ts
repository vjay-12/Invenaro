import { Router } from 'express';
import { salesOrderSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);

const formatOrder = (o: any) => {
  const firstInvoice = o.invoices?.[0];
  const isPaid = (o.invoices || []).some(
    (inv: any) => inv.status === 'PAID' || Number(inv.balance_amount) <= 0
  );

  return {
    ...o,
    so_number: o.order_number,
    source_location_id: o.godown_id,
    source_location_name: o.godown?.name || 'Main Central Godown',
    subtotal: Number(o.subtotal),
    tax_total: Number(o.tax_total),
    discount_total: Number(o.discount_total),
    grand_total: Number(o.grand_total),
    total_amount: Number(o.grand_total),
    invoice_id: firstInvoice?.id || null,
    invoice_number: firstInvoice?.invoice_number || null,
    is_paid: isPaid,
    payment_status: isPaid ? 'PAID' : 'UNPAID',
    invoices: (o.invoices || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      subtotal: Number(inv.subtotal),
      tax_total: Number(inv.tax_total),
      grand_total: Number(inv.grand_total),
      grandTotal: Number(inv.grand_total),
      paid_amount: Number(inv.paid_amount),
      paidAmount: Number(inv.paid_amount),
      balance_amount: Number(inv.balance_amount),
      balanceAmount: Number(inv.balance_amount),
      invoice_date: inv.invoice_date,
      created_at: inv.created_at,
    })),
    items: (o.items || []).map((it: any) => ({
      ...it,
      sku: it.product?.sku || it.sku || 'SKU',
      product_name: it.product?.name || it.name || 'Item',
      ordered_qty: Number(it.quantity),
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount: Number(it.discount),
      tax_rate: Number(it.tax_rate),
      tax_amount: Number(it.tax_amount),
      total: Number(it.total),
    })),
  };
};

router.get('/', async (req, res): Promise<void> => {
  try {
    const orders = await prisma.salesOrder.findMany({
      orderBy: { order_date: 'desc' },
      include: {
        customer: true,
        godown: true,
        invoices: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(orders.map(formatOrder));
  } catch (err) {
    console.error('Fetch sales orders error:', err);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const rawItems = Array.isArray(req.body.items)
      ? req.body.items.map((it: any) => ({
          ...it,
          sku: it.sku || it.product_sku || it.productId || it.product_id,
          name: it.name || it.product_name,
          quantity: typeof it.quantity === 'number' ? it.quantity : Number(it.ordered_qty || it.qty || 0),
          unit_price: typeof it.unit_price === 'number' ? it.unit_price : Number(it.price || it.rate || 0),
          discount: typeof it.discount === 'number' ? it.discount : Number(it.discount_percent || 0),
        }))
      : req.body.items;

    const normalizedBody = {
      ...req.body,
      customer_name: (req.body.customer_name || req.body.customerName || '').trim(),
      customer_address: req.body.customer_address || req.body.billing_address || req.body.shipping_address || req.body.billingAddress || req.body.shippingAddress,
      customer_gstin: req.body.customer_gstin || req.body.customerGstin,
      godown_id: req.body.godown_id || req.body.source_location_id,
      items: rawItems,
    };

    const parse = salesOrderSchema.safeParse(normalizedBody);
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

    // Pick target godown
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

    // Generate unique order number (e.g. SO-2026-0001)
    const count = await prisma.salesOrder.count();
    let orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const existingSO = await prisma.salesOrder.findUnique({ where: { order_number: orderNumber } });
    if (existingSO) {
      orderNumber = `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // Batch resolve products in a single database round-trip
    const rawProdIds = items.map((it) => it.product_id).filter(Boolean);
    const rawSkus = items.map((it: any) => it.sku || it.product_sku).filter(Boolean);
    const matchedProducts = await prisma.product.findMany({
      where: {
        OR: [
          ...(rawProdIds.length ? [{ id: { in: rawProdIds } }] : []),
          ...(rawSkus.length ? [{ sku: { in: rawSkus } }] : []),
        ],
      },
    });

    const fallbackProduct = matchedProducts[0] || (await prisma.product.findFirst({ where: { is_active: true } }));

    // Compute order valuation and line items
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const computedItems: any[] = [];
    for (const it of items) {
      const itemAny = it as any;
      const prod =
        matchedProducts.find(
          (p) =>
            p.id === it.product_id ||
            p.sku === itemAny.sku ||
            p.sku === it.product_id ||
            (itemAny.name && p.name.toLowerCase() === itemAny.name.toLowerCase())
        ) || fallbackProduct;

      const resolvedProdId = prod ? prod.id : it.product_id;
      const itemSubtotal = it.quantity * it.unit_price;
      const itemDiscount = it.discount || 0;
      const taxable = Math.max(0, itemSubtotal - itemDiscount);
      const taxRate = it.tax_rate || (prod ? Number(prod.tax_rate) : 0);
      const itemTax = (taxable * taxRate) / 100;
      const itemTotal = taxable + itemTax;

      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      taxTotal += itemTax;

      computedItems.push({
        product_id: resolvedProdId,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: itemDiscount,
        tax_rate: taxRate,
        tax_amount: itemTax,
        total: itemTotal,
      });
    }

    const grandTotal = subtotal - discountTotal + taxTotal;

    // Create sales order in CONFIRMED status (ready for warehouse dispatch)
    const order = await prisma.salesOrder.create({
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
        customer: true,
        invoices: true,
      },
    });

    res.status(201).json(formatOrder(order));
  } catch (err: any) {
    console.error('Create sales order error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create sales order' });
  }
});

// Dispatch / Fulfill Sales Order: validates stock, issues TAX INVOICE, and decrements stock in Ledger
const handleDispatchOrder = async (req: any, res: any): Promise<void> => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        godown: true,
        customer: true,
        invoices: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Sales order not found' });
      return;
    }

    if (order.status === 'DELIVERED') {
      res.status(400).json({ error: 'Sales order has already been dispatched' });
      return;
    }

    // Check stock availability in target godown for all line items
    for (const item of order.items) {
      const balance = await prisma.stockBalance.findUnique({
        where: {
          product_id_godown_id: {
            product_id: item.product_id,
            godown_id: order.godown_id,
          },
        },
      });

      const currentQty = balance ? Number(balance.current_quantity) : 0;
      const requiredQty = Number(item.quantity);
      if (currentQty < requiredQty) {
        res.status(400).json({
          error: `Insufficient stock for ${item.product?.name || 'Item'} (${item.product?.sku || 'SKU'}) in ${order.godown?.name || 'Godown'}. Available: ${currentQty}, Required: ${requiredQty}`,
        });
        return;
      }
    }

    // Execute atomic dispatch in transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Guard against race conditions and double-dispatching
        const freshOrder = await tx.salesOrder.findUnique({
          where: { id: order.id },
        });

        if (!freshOrder || freshOrder.status === 'DELIVERED') {
          throw new Error('Sales order has already been dispatched');
        }

        // 1. Update order status to DELIVERED
        const updatedOrder = await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: 'DELIVERED' },
        });

        // 2. Record stock movements in ledger (with idempotency guard)
        const existingMovements = await tx.stockMovement.findMany({
          where: {
            reference_type: 'SALES_ORDER',
            reference_id: order.id,
            movement_type: 'SALES_DELIVERY',
          },
        });

        if (existingMovements.length === 0) {
          for (const item of order.items) {
            await LedgerService.recordMovement(
              {
                product_id: item.product_id,
                godown_id: order.godown_id,
                movement_type: 'SALES_DELIVERY',
                quantity: -Number(item.quantity),
                unit_cost: Number(item.unit_price),
                reference_type: 'SALES_ORDER',
                reference_id: order.id,
                notes: `Delivery for order ${order.order_number}`,
                created_by: req.user?.id,
              },
              tx
            );
          }
        }

        // 3. Issue legal Invoice if one does not already exist
        let invoice = order.invoices?.[0];
        if (!invoice) {
          const invCount = await tx.invoice.count();
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
          invoice = await tx.invoice.create({
            data: {
              invoice_number: invoiceNumber,
              reference_order_id: order.id,
              customer_id: order.customer_id,
              godown_id: order.godown_id,
              subtotal: order.subtotal,
              tax_total: order.tax_total,
              grand_total: order.grand_total,
              balance_amount: order.grand_total,
            },
          });
        }

        return { order: updatedOrder, invoice };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      message: 'Sales order dispatched and document issued successfully',
      invoice_id: result.invoice.id,
      invoice_number: result.invoice.invoice_number,
    });
  } catch (err: any) {
    console.error('Dispatch sales order error:', err);
    res.status(500).json({ error: err?.message || 'Failed to dispatch sales order' });
  }
};

router.post('/:id/dispatch', handleDispatchOrder);
router.post('/:id/fulfill', handleDispatchOrder);

router.post('/:id/pay', async (req, res): Promise<void> => {
  const orderId = req.params.id;
  const { payment_method = 'CASH', payment_reference, notes, paid_at } = req.body;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const order = await tx.salesOrder.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            invoices: {
              include: { payments: true },
            },
          },
        });

        if (!order) {
          throw new Error('Sales order not found');
        }

        // 1. Get or create invoice for this order
        let invoice = order.invoices?.[0];
        if (!invoice) {
          const invCount = await tx.invoice.count();
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
          invoice = await tx.invoice.create({
            data: {
              invoice_number: invoiceNumber,
              reference_order_id: order.id,
              customer_id: order.customer_id,
              godown_id: order.godown_id,
              subtotal: order.subtotal,
              tax_total: order.tax_total,
              grand_total: order.grand_total,
              paid_amount: 0,
              balance_amount: order.grand_total,
            },
            include: { payments: true },
          });
        }

        // 2. Prevent duplicate full payment if already settled
        if (invoice.status === 'PAID' && Number(invoice.balance_amount) <= 0) {
          return { order, invoice, payment: invoice.payments?.[0] };
        }

        // 3. Generate unique payment number
        const payCount = await tx.payment.count();
        const paymentNumber = `PAY-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

        // 4. Create Payment record
        const payment = await tx.payment.create({
          data: {
            payment_number: paymentNumber,
            invoice_id: invoice.id,
            customer_id: order.customer_id || null,
            payment_date: paid_at ? new Date(paid_at) : new Date(),
            amount: invoice.grand_total,
            payment_mode: String(payment_method || 'CASH').toUpperCase(),
            reference_number: payment_reference || null,
            notes: notes || `Payment for order ${order.order_number}`,
          },
        });

        // 5. Update Invoice status & balance
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paid_amount: invoice.grand_total,
            balance_amount: 0,
          },
        });

        return { order, invoice: updatedInvoice, payment };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      message: `Payment recorded successfully for order ${result.order.order_number}`,
      order_id: result.order.id,
      invoice_id: result.invoice.id,
      payment_id: result.payment?.id,
      payment_number: result.payment?.payment_number,
      status: 'PAID',
    });
  } catch (err: any) {
    console.error('Pay sales order error:', err);
    res.status(500).json({ error: err?.message || 'Failed to record payment' });
  }
});

router.get('/:id', async (req, res): Promise<void> => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        godown: true,
        invoices: true,
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

    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'DELIVERED') {
      res.status(400).json({ error: 'Cannot delete fulfilled/delivered sales orders' });
      return;
    }

    await prisma.salesOrder.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Sales order deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete sales order' });
  }
});

export default router;
