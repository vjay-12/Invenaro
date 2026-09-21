import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { updateCompanySettingsSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: 'default_settings' },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: 'default_settings',
          company_name: 'My Business',
          enable_gst: false,
        },
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assigned_godown_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    res.json({
      settings,
      users,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res): Promise<void> => {
  try {
    const parse = updateCompanySettingsSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid settings data' });
      return;
    }

    const data = parse.data;
    // GST is enabled if user explicitly enabled it AND entered a GSTIN
    const hasGSTIN = Boolean(data.gstin && data.gstin.trim().length > 0);
    const enable_gst = Boolean(data.enable_gst && hasGSTIN);

    const updated = await prisma.companySettings.upsert({
      where: { id: 'default_settings' },
      create: {
        id: 'default_settings',
        ...data,
        enable_gst,
      },
      update: {
        ...data,
        enable_gst,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

router.post('/users', async (req, res): Promise<void> => {
  try {
    const { name, email, password, role, assigned_godown_id } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: role || 'STAFF',
        assigned_godown_id: assigned_godown_id || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assigned_godown_id: true,
        created_at: true,
      },
    });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
