import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  assigned_godown_id?: string | null;
  must_change_password: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies?.['invenaro_session'];

  if (!sessionToken) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token_hash: sessionToken },
      include: { user: true },
    });

    if (!session || new Date(session.expires_at) < new Date()) {
      res.clearCookie('invenaro_session');
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as any,
      assigned_godown_id: session.user.assigned_godown_id,
      must_change_password: Boolean(session.user.must_change_password),
    };
    req.sessionId = session.id;

    // Step 11: Server-side enforcement of must_change_password
    if (req.user.must_change_password) {
      const urlPath = (req.originalUrl || req.baseUrl + req.path || req.path).split('?')[0].toLowerCase();
      const isAllowedEndpoint =
        urlPath.endsWith('/auth/change-password') ||
        urlPath.endsWith('/change-password') ||
        urlPath.endsWith('/auth/logout') ||
        urlPath.endsWith('/logout') ||
        urlPath.endsWith('/auth/me') ||
        urlPath.endsWith('/me');

      if (!isAllowedEndpoint) {
        res.status(403).json({
          error: 'Password change required before accessing other resources',
          must_change_password: true,
        });
        return;
      }
    }

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
}
