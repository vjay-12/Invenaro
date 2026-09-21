import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireModule } from '../middlewares/entitlements.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);
router.use(requireModule('transfers'));

router.get('/', async (req, res): Promise<void> => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        source_godown: true,
        destination_godown: true,
        items: {
          include: { product: true },
        },
      },
    });

    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const {
      source_godown_id,
      destination_godown_id,
      items,
      notes,
      eway_bill_number,
      vehicle_number,
      transporter_name,
      distance_km,
    } = req.body;

    if (!source_godown_id || !destination_godown_id || !items || !items.length) {
      res.status(400).json({ error: 'Source, destination, and items are required' });
      return;
    }

    if (source_godown_id === destination_godown_id) {
      res.status(400).json({ error: 'Source and destination godowns must be different' });
      return;
    }

    // Determine document type (Delivery Challan vs Tax Invoice)
    const [srcGodown, dstGodown, settings] = await Promise.all([
      prisma.godown.findUnique({ where: { id: source_godown_id } }),
      prisma.godown.findUnique({ where: { id: destination_godown_id } }),
      prisma.companySettings.findUnique({ where: { id: 'default_settings' } }),
    ]);

    let docType = 'CHALLAN';
    if (settings?.enable_gst) {
      const srcGstin = srcGodown?.gstin || settings.gstin;
      const dstGstin = dstGodown?.gstin || settings.gstin;
      if (srcGstin && dstGstin && srcGstin !== dstGstin) {
        docType = 'TAX_INVOICE';
      }
    }

    const count = await prisma.stockTransfer.count();
    const transferNumber = `TR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        transfer_number: transferNumber,
        source_godown_id,
        destination_godown_id,
        status: 'DRAFT',
        doc_type: docType,
        eway_bill_number: eway_bill_number || null,
        vehicle_number: vehicle_number || null,
        transporter_name: transporter_name || null,
        distance_km: distance_km || null,
        notes: notes || null,
        created_by: req.user?.id,
        items: {
          create: items.map((it: any) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_cost: it.unit_cost || 0,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        source_godown: true,
        destination_godown: true,
      },
    });

    res.status(201).json(transfer);
  } catch (err) {
    console.error('Create transfer error:', err);
    res.status(500).json({ error: 'Failed to create stock transfer' });
  }
});

// Dispatch transfer: Moves status to IN_TRANSIT and deducts stock from source godown
router.post('/:id/dispatch', async (req, res): Promise<void> => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }

    if (transfer.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT transfers can be dispatched' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: 'IN_TRANSIT' },
      });

      for (const item of transfer.items) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: transfer.source_godown_id,
            movement_type: 'TRANSFER_OUT',
            quantity: -Number(item.quantity),
            unit_cost: Number(item.unit_cost),
            reference_type: 'STOCK_TRANSFER',
            reference_id: transfer.id,
            notes: `Dispatch transfer ${transfer.transfer_number}`,
            created_by: req.user?.id,
          },
          tx
        );
      }
    });

    res.json({ success: true, message: 'Transfer dispatched into transit' });
  } catch (err) {
    console.error('Dispatch error:', err);
    res.status(500).json({ error: 'Failed to dispatch transfer' });
  }
});

// Receive transfer: Moves status to RECEIVED and adds stock to destination godown
router.post('/:id/receive', async (req, res): Promise<void> => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }

    if (transfer.status !== 'IN_TRANSIT') {
      res.status(400).json({ error: 'Only IN_TRANSIT transfers can be received' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: 'RECEIVED' },
      });

      for (const item of transfer.items) {
        await LedgerService.recordMovement(
          {
            product_id: item.product_id,
            godown_id: transfer.destination_godown_id,
            movement_type: 'TRANSFER_IN',
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
            reference_type: 'STOCK_TRANSFER',
            reference_id: transfer.id,
            notes: `Receipt from transfer ${transfer.transfer_number}`,
            created_by: req.user?.id,
          },
          tx
        );
      }
    });

    res.json({ success: true, message: 'Transfer successfully received at destination' });
  } catch (err) {
    console.error('Receive transfer error:', err);
    res.status(500).json({ error: 'Failed to receive transfer' });
  }
});

export default router;
