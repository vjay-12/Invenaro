import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';

const router = Router();

router.use(authMiddleware);

// Payment settlement endpoint - accessible to all licensed plans for settling issued order invoices
router.post('/:id/pay', async (req, res): Promise<void> => {
  const invoiceId = req.params.id;
  const { payment_method = 'CASH', payment_reference, notes, paid_at } = req.body;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { sales_order: true, payments: true },
        });

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.status === 'PAID' && Number(invoice.balance_amount) <= 0) {
          return { invoice, payment: invoice.payments?.[0] };
        }

        const payCount = await tx.payment.count();
        const paymentNumber = `PAY-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

        const payment = await tx.payment.create({
          data: {
            payment_number: paymentNumber,
            invoice_id: invoice.id,
            customer_id: invoice.customer_id || null,
            payment_date: paid_at ? new Date(paid_at) : new Date(),
            amount: invoice.grand_total,
            payment_mode: String(payment_method || 'CASH').toUpperCase(),
            reference_number: payment_reference || null,
            notes: notes || `Payment for invoice ${invoice.invoice_number}`,
          },
        });

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paid_amount: invoice.grand_total,
            balance_amount: 0,
          },
        });

        return { invoice: updatedInvoice, payment };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      message: `Payment recorded successfully for invoice ${result.invoice.invoice_number}`,
      invoice_id: result.invoice.id,
      payment_id: result.payment?.id,
      payment_number: result.payment?.payment_number,
      status: 'PAID',
    });
  } catch (err: any) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: err?.message || 'Failed to record payment' });
  }
});

// Invoice PDF download/preview endpoint - accessible on all plans for order receipts and tax invoices
router.get('/:id/pdf', async (req, res): Promise<void> => {
  const invoiceId = req.params.id;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        godown: true,
        payments: {
          orderBy: { payment_date: 'desc' },
        },
        sales_order: {
          include: {
            customer: true,
            godown: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const settings = await prisma.companySettings.findFirst();
    const { generateInvoicePdf } = await import('../services/pdf.js');
    const pdfBuffer = await generateInvoicePdf(invoice, settings);

    const safeNumber = (invoice.invoice_number || 'invoice').replace(/[\/\\]/g, '_');
    const isDownload = req.query.download === 'true';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="Tax_Invoice_${safeNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Invoice PDF generation error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate invoice PDF' });
  }
});

// Single invoice lookup endpoint
router.get('/:id', async (req, res): Promise<void> => {
  const invoiceId = req.params.id;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        godown: true,
        payments: {
          orderBy: { payment_date: 'desc' },
        },
        sales_order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// Guard advanced invoice list and manual creation behind invoices_returns module
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
