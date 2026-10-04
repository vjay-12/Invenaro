import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { supplierSchema } from '@invenaro/validation';

const router = Router();
router.use(authMiddleware);

// GET / - List suppliers/vendors
router.get('/', async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(status === 'archived' ? { is_active: false } : status === 'all' ? {} : { is_active: true }),
        ...(category && category !== 'all' ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { contact_person: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { gstin: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchase_orders: true },
        },
      },
    });

    const mapped = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contact_person: s.contact_person,
      category: s.category || 'General',
      notes: s.notes,
      phone: s.phone,
      email: s.email,
      address: s.address,
      state_code: s.state_code,
      gstin: s.gstin,
      opening_balance: Number(s.opening_balance),
      is_active: s.is_active,
      purchase_orders_count: s._count.purchase_orders,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString(),
    }));

    res.json(mapped);
  } catch (err: any) {
    console.error('Fetch suppliers error:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /:id - Supplier details with recent POs
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchase_orders: {
          take: 10,
          orderBy: { order_date: 'desc' },
          include: {
            items: true,
          },
        },
        _count: {
          select: { purchase_orders: true },
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    res.json({
      ...supplier,
      opening_balance: Number(supplier.opening_balance),
      purchase_orders_count: supplier._count.purchase_orders,
      purchase_orders: supplier.purchase_orders.map((po) => ({
        ...po,
        subtotal: Number(po.subtotal),
        tax_total: Number(po.tax_total),
        grand_total: Number(po.grand_total),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendor details' });
  }
});

// POST / - Create vendor
router.post('/', async (req, res): Promise<void> => {
  try {
    const parse = supplierSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid vendor data' });
      return;
    }

    const {
      name,
      contact_person,
      category,
      notes,
      phone,
      email,
      address,
      state_code,
      gstin,
      opening_balance,
      is_active,
    } = parse.data;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact_person: contact_person || null,
        category: category || 'Fabrics & Textiles',
        notes: notes || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        state_code: state_code || '33',
        gstin: gstin || null,
        opening_balance: opening_balance || 0,
        is_active: is_active ?? true,
      },
    });

    res.status(201).json({
      ...supplier,
      opening_balance: Number(supplier.opening_balance),
    });
  } catch (err: any) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: err.message || 'Failed to create vendor' });
  }
});

// PUT /:id - Update vendor
router.put('/:id', async (req, res): Promise<void> => {
  try {
    const parse = supplierSchema.partial().safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid vendor data' });
      return;
    }

    const updated = await prisma.supplier.update({
      where: { id: req.params.id },
      data: parse.data,
    });

    res.json({
      ...updated,
      opening_balance: Number(updated.opening_balance),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// POST /:id/archive - Archive / soft-delete vendor
router.post('/:id/archive', async (req, res): Promise<void> => {
  try {
    const updated = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { is_active: false },
    });
    res.json({ message: 'Vendor archived successfully', supplier: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive vendor' });
  }
});

// POST /:id/restore - Restore archived vendor
router.post('/:id/restore', async (req, res): Promise<void> => {
  try {
    const updated = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { is_active: true },
    });
    res.json({ message: 'Vendor reactivated successfully', supplier: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore vendor' });
  }
});

export default router;
