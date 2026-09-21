import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { loginSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LicenseService } from '../services/license.js';

const router = Router();

router.post('/login', async (req, res): Promise<void> => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid input' });
      return;
    }

    const { email, password } = parse.data;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    // For bootstrapping initial owner if database is freshly seeded
    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        // Create initial default owner and default godown
        let defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
        if (!defaultGodown) {
          defaultGodown = await prisma.godown.create({
            data: {
              name: 'Main Godown',
              code: 'MAIN-01',
              is_default: true,
              is_active: true,
            },
          });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
          data: {
            email,
            password_hash: passwordHash,
            name: 'Business Owner',
            role: 'OWNER',
            assigned_godown_id: defaultGodown.id,
          },
        });
      } else {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
    } else {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
    }

    // Generate random secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.session.create({
      data: {
        token_hash: token,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'] || null,
      },
    });

    res.cookie('invenaro_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    const entitlements = await LicenseService.getEntitlements();

    res.json({
      access_token: token,
      user_role: user.role === 'OWNER' ? 'admin' : user.role.toLowerCase(),
      full_name: user.name,
      company_name: 'Invenaro Operations',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_godown_id: user.assigned_godown_id,
      },
      entitlements,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.get('/me', authMiddleware, async (req, res): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assigned_godown_id: true,
        created_at: true,
      },
    });

    const entitlements = await LicenseService.getEntitlements();
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default_settings' },
    });

    res.json({
      user,
      entitlements,
      settings,
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/logout', async (req, res): Promise<void> => {
  try {
    const sessionToken = req.cookies?.['invenaro_session'];
    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token_hash: sessionToken },
      });
    }
    res.clearCookie('invenaro_session');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.clearCookie('invenaro_session');
    res.json({ success: true });
  }
});

export default router;
