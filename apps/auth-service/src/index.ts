import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';

import { logger } from '@shared/utils/logger';

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

// Логирование запросов
app.use((req, _res, next) => {
  logger.info(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Роуты
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    service: 'auth-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Не найдено' });
});

// Обработка ошибок
app.use((err: Error, _req: express.Request, res: express.Response) => {
  logger.error('Ошибка:', err);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service запущен на http://localhost:${PORT}`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/users/me`);
});
