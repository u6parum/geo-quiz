import { Router } from 'express';
import { logger } from '@shared/utils/logger';
import { gameRepo } from '../db/repositories/game.repo';
import { teamRepo } from '../db/repositories/team.repo';
import { gameManager } from '../services/game-manager';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export const gameRouter = Router();

// Создать игру (админ)
gameRouter.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { durationSeconds, hintsSchedule, questionWindows, teamIds } = req.body;

    if (!durationSeconds || typeof durationSeconds !== 'number' || durationSeconds <= 0) {
      return res.status(400).json({ message: 'Некорректная длительность игры' });
    }

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      return res.status(400).json({ message: 'Нужно выбрать минимум 2 команды' });
    }

    // Проверяем, что все команды существуют
    const teams = await Promise.all(teamIds.map((id: string) => teamRepo.findById(id)));

    const missingTeams = teamIds.filter((_: string, i: number) => !teams[i]);

    if (missingTeams.length > 0) {
      return res.status(400).json({
        message: `Команды не найдены: ${missingTeams.join(', ')}`,
      });
    }

    const game = await gameRepo.create({
      durationSeconds,
      hintsSchedule: hintsSchedule ?? [0, Math.floor(durationSeconds / 3), Math.floor((durationSeconds * 2) / 3)],
      questionWindows: questionWindows ?? [0, Math.floor(durationSeconds / 2), Math.floor((durationSeconds * 4) / 5)],
      createdById: req.user!.id,
      teamIds,
    });

    logger.info(`Игра ${game.id} создана с ${teamIds.length} командами`);

    res.status(201).json(game);
  } catch (error: any) {
    logger.error('Ошибка создания игры:', error);
    res.status(500).json({ message: error.message || 'Ошибка создания игры' });
  }
});

// СПИСОК ИГР (ADMIN)
gameRouter.get('/', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const games = await gameRepo.findAll();

    res.json(games);
  } catch (error) {
    logger.error('Ошибка загрузки игр', error);
    res.status(500).json({ message: 'Ошибка загрузки игр' });
  }
});

// Получить игру по ID
gameRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const game = await gameRepo.getGameWithTeams(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }

    // Если игра активна — отдаём состояние из движка
    if (game.status === 'ACTIVE') {
      const engine = gameManager.getGame(req.params.id);

      if (engine) {
        return res.json({
          ...game,
          engineState: {
            phase: engine.getPhase(),
            subPhase: engine.getSubPhase(),
            elapsedSeconds: engine.getState().elapsedSeconds,
            leaderboard: engine.getLeaderboard(),
          },
        });
      }
    }

    res.json(game);
  } catch (error) {
    logger.error('Ошибка загрузки игры', error);
    res.status(500).json({ message: 'Ошибка загрузки игры' });
  }
});

// Запустить игру (админ)
gameRouter.post('/:id/start', authMiddleware, adminMiddleware, async (req, res) => {
  const gameId = req.params.id;

  try {
    const game = await gameRepo.findById(gameId);

    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }

    if (game.status !== 'MODERATION' && game.status !== 'LOBBY') {
      return res.status(400).json({
        message: 'Игру можно запустить только из статуса LOBBY или MODERATION',
      });
    }

    if (gameManager.getGame(gameId)) {
      return res.status(400).json({ message: 'Игра уже запущена' });
    }

    // Создаём движок из данных БД
    const engine = await gameManager.createGame(gameId);

    // Запускаем игру
    engine.startGame();

    // Обновляем статус в БД
    await gameRepo.updateStatus(gameId, 'ACTIVE');

    logger.info(`Игра ${gameId} запущена`);

    res.json({ success: true, gameId });
  } catch (error: any) {
    logger.error(`Ошибка запуска игры ${gameId}`, error);
    res.status(500).json({ message: error.message || 'Ошибка запуска игры' });
  }
});

// Получить игры команды
gameRouter.get('/team/:teamId', authMiddleware, async (req, res) => {
  try {
    const games = await gameRepo.getGamesForTeam(req.params.teamId);

    res.json(games);
  } catch (error) {
    logger.error('Ошибка загрузки игр команды', error);
    res.status(500).json({ message: 'Ошибка загрузки игр команды' });
  }
});
