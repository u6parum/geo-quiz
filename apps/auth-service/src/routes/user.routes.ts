import { Router } from 'express';

import { prisma } from '../db/prisma';
import { userRepo } from '../db/repositories/user.repo';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export const userRouter = Router();

// Получить всех пользователей (только админ)
userRouter.get('/', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const users = await userRepo.findAll();
    const formatted = users.map((user) => ({ ...user }));

    res.json(formatted);
  } catch {
    res.status(500).json({ message: 'Ошибка загрузки пользователей' });
  }
});

// Batch-запрос пользователей по id (для внутренних сервисов)
// TODO: Роут /batch не защищён authMiddleware. Это внутренний эндпоинт для связи между сервисами. В production его стоит защитить внутренним токеном или ограничить доступ по IP.
userRouter.post('/batch', async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  res.json(users);
});
