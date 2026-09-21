import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';

const router = Router();

router.use(authMiddleware);
router.use(requireModule('invoices_returns'));

router.get('/', async (req, res): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { invoice_date: 'desc' },
      include: {
        customer: true,
        godown: true,
        sales_order: true,
      },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const { reference_order_id, customer_id, godown_id, due_date, subtotal, tax_total, grand_total } = req.body;

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        reference_order_id: reference_order_id || null,
        customer_id: customer_id || null,
        godown_id,
        due_date: due_date ? new Date(due_date) : null,
        subtotal: subtotal || 0,
        tax_total: tax_total || 0,
        grand_total: grand_total || 0,
        balance_amount: grand_total || 0,
      },
      include: { customer: true, godown: true },
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

export default router;
