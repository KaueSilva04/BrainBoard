import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import type { JwtPayload, AuthUser } from './auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'brainboard-jwt-secret-key-2026-production';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

let cachedAdminUser: AuthUser | null = null;

async function getFallbackAdminUser(): Promise<AuthUser | null> {
  if (cachedAdminUser) return cachedAdminUser;

  const defaultEmail = (process.env.DEFAULT_OWNER_EMAIL || 'admin@brainboard.local').toLowerCase().trim();
  const admin = await prisma.user.findFirst({
    where: { email: defaultEmail },
    select: { id: true, name: true, email: true, avatarColor: true },
  });

  if (admin) {
    cachedAdminUser = admin;
    return admin;
  }

  // If admin not seeded yet, fallback to any first user
  const firstUser = await prisma.user.findFirst({
    select: { id: true, name: true, email: true, avatarColor: true },
  });
  if (firstUser) {
    cachedAdminUser = firstUser;
    return firstUser;
  }

  return null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, name: true, email: true, avatarColor: true },
        });

        if (user) {
          req.user = user;
          return next();
        }
      } catch (tokenErr) {
        // If an explicit token was provided and is invalid/expired, reject with 401
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
    }

    // Check dev/anonymous fallback
    const allowAnonymous = process.env.ALLOW_ANONYMOUS_DEV === 'true';
    const isMcpRoute = req.path.startsWith('/mcp') || req.baseUrl.startsWith('/mcp');

    if (allowAnonymous && !isMcpRoute) {
      const fallbackUser = await getFallbackAdminUser();
      if (fallbackUser) {
        req.user = fallbackUser;
        return next();
      }
    }

    return res.status(401).json({ error: 'Autenticação necessária' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro interno na autenticação' });
  }
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const mcpTokenHeader = typeof req.headers['x-mcp-token'] === 'string' ? req.headers['x-mcp-token'].trim() : '';
    const queryToken =
      typeof req.query.token === 'string'
        ? req.query.token.trim()
        : typeof req.query.apiKey === 'string'
        ? req.query.apiKey.trim()
        : '';

    const rawToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : mcpTokenHeader || queryToken;

    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET) as JwtPayload;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, name: true, email: true, avatarColor: true },
        });

        if (user) {
          req.user = user;
          return next();
        }
        return res.status(401).json({ error: 'Usuário não encontrado' });
      } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
    }

    const isMcpRoute = req.path.startsWith('/mcp') || req.baseUrl.startsWith('/mcp');
    if (!isMcpRoute && !req.user && process.env.ALLOW_ANONYMOUS_DEV === 'true') {
      const fallbackUser = await getFallbackAdminUser();
      if (fallbackUser) {
        req.user = fallbackUser;
      }
    }

    next();
  } catch {
    next();
  }
}

export async function resolveMcpUser(req: Request): Promise<AuthUser | null> {
  if (req.user) {
    return req.user;
  }
  return null;
}
