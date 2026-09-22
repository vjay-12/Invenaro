import { Router } from 'express';
import { customerSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

const mapCustomer = (c: any) => ({
  ...c,
  legal_name: c.name,
  billing_address: c.address,
  shipping_address: c.address,
  state: c.state_code,
  billing_state_code: c.state_code,
});

router.get('/', async (req, res): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sales_orders: true },
        },
      },
    });
    res.json(customers.map(mapCustomer));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const payload = {
      ...req.body,
      name: req.body.name || req.body.legal_name,
      address: req.body.address || req.body.billing_address || req.body.shipping_address,
      state_code: req.body.state_code || req.body.billing_state_code,
    };
    const parse = customerSchema.safeParse(payload);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid customer data' });
      return;
    }

    const customer = await prisma.customer.create({
      data: parse.data,
    });
    res.status(201).json(mapCustomer(customer));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', async (req, res): Promise<void> => {
  try {
    const payload = {
      ...req.body,
      name: req.body.name || req.body.legal_name,
      address: req.body.address || req.body.billing_address || req.body.shipping_address,
      state_code: req.body.state_code || req.body.billing_state_code,
    };
    const parse = customerSchema.partial().safeParse(payload);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid customer data' });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: parse.data,
    });
    res.json(mapCustomer(customer));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.post('/:id/archive', async (req, res): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ message: 'Customer archived', customer: mapCustomer(customer) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive customer' });
  }
});

router.get('/:id', async (req, res): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        sales_orders: {
          take: 10,
          orderBy: { order_date: 'desc' },
        },
      },
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(mapCustomer(customer));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

export default router;
