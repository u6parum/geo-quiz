import type { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/utils/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  // Ошибки бизнес-логики
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
  }

  // Prisma: нарушение уникальности
  if ((error as any).code === 'P2002') {
    return res.status(409).json({
      message: 'Запись с такими данными уже существует',
    });
  }

  // Prisma: запись не найдена
  if ((error as any).code === 'P2025') {
    return res.status(404).json({
      message: 'Запись не найдена',
    });
  }

  // Всё остальное — 500
  logger.error('Необработанная ошибка', error);
  res.status(500).json({
    message: 'Внутренняя ошибка сервера',
  });
}
