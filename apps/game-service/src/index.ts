import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { logger } from '@shared/utils/logger';

import { gameRouter } from './routes/game.routes';
import { teamRouter } from './routes/team.routes';
import { teamApplicationRouter } from './routes/team-application.routes';

import { setupWebSocket } from './ws';
import { gameManager } from './services/game-manager';
import { gameRepo } from './db/repositories/game.repo';
import { errorHandler } from './middleware/error-handler';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.GAME_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

// Логирование
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Роуты
app.use('/api/applications', teamApplicationRouter);
app.use('/api/games', gameRouter);
app.use('/api/teams', teamRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    service: 'game-service',
    status: 'ok',
    activeGames: gameManager.getActiveGameCount(),
    timestamp: new Date().toISOString(),
  });
});

// WebSocket
setupWebSocket(wss, JWT_SECRET);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Не найдено' });
});

// Глобальный обработчик ошибок
app.use(errorHandler);

// Восстановление активных игр при старте
async function restoreActiveGames() {
  try {
    const activeGames = await gameRepo.getActiveGames();

    console.log(`Найдено ${activeGames.length} активных игр для восстановления`);

    for (const game of activeGames) {
      await gameManager.restoreGame(game.id);
    }

    console.log('Восстановление завершено');
  } catch (error) {
    console.error('Ошибка восстановления игр:', error);
  }
}

server.listen(PORT, async () => {
  console.log(`🎮 Game Service запущен на http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/game`);
  console.log(`   POST /api/games`);
  console.log(`   POST /api/games/:id/start`);

  await restoreActiveGames();
});
