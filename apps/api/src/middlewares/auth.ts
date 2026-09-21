import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  assigned_godown_id?: string | null;
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
    };
    req.sessionId = session.id;

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
}
