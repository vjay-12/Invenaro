import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import { loginSchema, changePasswordSchema, firstLoginChangePasswordSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LicenseService } from '../services/license.js';

const router = Router();

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const email = parse.data.email.trim().toLowerCase();
    const { password } = parse.data;
    const clientIp = getClientIp(req);
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);

    // Check database-backed lockout for serverless safety (per email and per IP)
    const [failedByEmail, failedByIp] = await Promise.all([
      prisma.loginAttempt.count({
        where: {
          email,
          successful: false,
          attempted_at: { gte: windowStart },
        },
      }),
      prisma.loginAttempt.count({
        where: {
          ip_address: clientIp,
          successful: false,
          attempted_at: { gte: windowStart },
        },
      }),
    ]);

    if (failedByEmail >= MAX_FAILED_ATTEMPTS || failedByIp >= MAX_FAILED_ATTEMPTS) {
      res.status(429).json({
        error: 'Too many failed login attempts. Account temporarily locked. Please try again later.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Record failed attempt
      await prisma.loginAttempt.create({
        data: {
          email,
          ip_address: clientIp,
          successful: false,
        },
      });
      // Generic response - never reveal whether the email exists
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Record failed attempt
      await prisma.loginAttempt.create({
        data: {
          email,
          ip_address: clientIp,
          successful: false,
        },
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Record successful login attempt
    await prisma.loginAttempt.create({
      data: {
        email,
        ip_address: clientIp,
        successful: true,
      },
    });

    // Generate random secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.session.create({
      data: {
        token_hash: token,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: clientIp,
        user_agent: (req.headers['user-agent'] as string) || null,
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
      must_change_password: Boolean(user.must_change_password),
      user_role: user.role === 'OWNER' ? 'admin' : user.role.toLowerCase(),
      full_name: user.name,
      company_name: 'Invenaro Operations',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_godown_id: user.assigned_godown_id,
        must_change_password: Boolean(user.must_change_password),
      },
      entitlements,
    });
  } catch (err) {
    console.error('Login error occurred');
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let newPassword = '';

    if (user.must_change_password && req.body.currentPassword === undefined) {
      // First login forced password change without requiring old temp password again
      const parse = firstLoginChangePasswordSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid password format' });
        return;
      }
      newPassword = parse.data.newPassword;
    } else {
      const parse = changePasswordSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid password format' });
        return;
      }

      const isMatch = await bcrypt.compare(parse.data.currentPassword, user.password_hash);
      if (!isMatch) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }
      newPassword = parse.data.newPassword;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        must_change_password: false,
      },
    });

    // Invalidate other sessions except current session
    if (req.sessionId) {
      await prisma.session.deleteMany({
        where: {
          user_id: user.id,
          id: { not: req.sessionId },
        },
      });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error occurred');
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        must_change_password: true,
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
    console.error('Me endpoint error occurred');
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = req.cookies?.['invenaro_session'];
    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token_hash: sessionToken },
      });
    }
    res.clearCookie('invenaro_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.clearCookie('invenaro_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ success: true });
  }
});

export default router;
