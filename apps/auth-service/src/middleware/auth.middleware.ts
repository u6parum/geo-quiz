import { Request, Response, NextFunction } from 'express';

import { authService } from '../services/auth.service';

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
  // 1. Пытаемся достать токен из httpOnly cookie
  const tokenFromCookie = authService.getTokenFromCookie(req.headers.cookie);

  // 2. Если куки нет — пробуем заголовок Authorization (запасной вариант)
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (tokenFromCookie) {
    token = tokenFromCookie;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Неверный или истёкший токен' });
  }

  req.user = payload;
  next();
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
