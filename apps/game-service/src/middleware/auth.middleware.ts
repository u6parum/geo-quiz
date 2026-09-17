import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const COOKIE_NAME = 'auth_token';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromCookie(req.headers.cookie);

  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Неверный или истёкший токен' });
  }
}
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Только для администраторов' });
  }

  next();
}

function getTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  return cookies[COOKIE_NAME] || null;
}
