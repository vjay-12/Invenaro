import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { updateCompanySettingsSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { generateTemporaryPassword } from '../utils/password.js';

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
    // Step 8: Only OWNER can call POST /settings/users
    if (req.user?.role !== 'OWNER') {
      res.status(403).json({ error: 'Forbidden: Only an OWNER can create users' });
      return;
    }

    const { name, email, role, assigned_godown_id } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const validRoles = ['OWNER', 'MANAGER', 'STAFF'];
    const assignedRole = role && validRoles.includes(role) ? role : 'STAFF';

    // Step 9: Server generates a strong random temporary password
    // Caller cannot supply the user's password
    const tempPassword = generateTemporaryPassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password_hash,
        role: assignedRole as any,
        must_change_password: true,
        assigned_godown_id: assigned_godown_id || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assigned_godown_id: true,
        must_change_password: true,
        created_at: true,
      },
    });

    res.status(201).json({
      ...newUser,
      temporaryPassword: tempPassword,
      temporary_password: tempPassword,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
