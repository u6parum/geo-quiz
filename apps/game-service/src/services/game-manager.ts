import { logger } from '@shared/utils/logger';

import { GameEngine } from '../engine/game-engine';
import { gameRepo } from '../db/repositories/game.repo';
import { setupEngineEvents } from '../ws/engine-events';
import { mapTeamsToState } from '../ws/utils';
import { sendTo } from '../ws/connections';

import type { FinalScores } from '../engine/types';

class GameManager {
  private games = new Map<string, GameEngine>();

  async createGame(gameId: string): Promise<GameEngine> {
    const gameData = await gameRepo.getGameWithTeams(gameId);

    if (!gameData) {
      throw new Error('Игра не найдена');
    }

    const engine = new GameEngine(gameId, {
      durationSeconds: gameData.durationSeconds,
      hintsSchedule: gameData.hintsSchedule,
      questionWindows: gameData.questionWindows,
    });

    // Добавляем команды с их загадками
    for (const gt of gameData.teams) {
      engine.addTeam(gt.teamId, gt.team.name);

      const landmark = gt.team.landmarks[0];

      if (landmark && landmark.status === 'APPROVED') {
        engine.loadLandmark(gt.teamId, {
          name: landmark.name,
          hints: landmark.hints as any,
          description: landmark.description,
        });
      }
    }

    // Подписываемся на события движка
    setupEngineEvents(engine, (...args) => this.endGame(...args));

    this.games.set(gameId, engine);

    // Оповещаем всех подключённых, что игра стартовала
    const state = engine.getState();

    state.teams.forEach((team) => {
      sendTo(team.id, {
        type: 'GAME_STATE',
        payload: {
          phase: 'ACTIVE',
          subPhase: 'before_hints_1',
          elapsedSeconds: 0,
          serverTime: Date.now(),
          teams: mapTeamsToState(state.teams),
          yourTeamId: team.id,
          config: {
            durationSeconds: state.durationSeconds,
            hintsSchedule: state.hintsSchedule,
            questionWindows: state.questionWindows,
          },
        },
      });
    });

    logger.info(`Игра ${gameId} создана, все команды оповещены`);

    return engine;
  }

  async restoreGame(gameId: string): Promise<GameEngine | null> {
    try {
      const engine = await GameEngine.restore(gameId);

      setupEngineEvents(engine, (...args) => this.endGame(...args));

      this.games.set(gameId, engine);

      console.log(`Игра ${gameId} восстановлена`);

      return engine;
    } catch (error) {
      console.error(`Ошибка восстановления игры ${gameId}:`, error);
      return null;
    }
  }

  async endGame(gameId: string, finalScores: FinalScores): Promise<void> {
    try {
      // 1. Сохраняем финальные очки
      await gameRepo.saveFinalScores(
        gameId,
        finalScores.map(({ teamId, score }) => ({ teamId, score })),
      );

      // 2. Обновляем статус игры
      await gameRepo.updateStatus(gameId, 'FINISHED');

      // 3. Удаляем движок из памяти
      this.games.delete(gameId);

      logger.info(`Результаты игры ${gameId} сохранены, движок удалён`);
    } catch (error) {
      logger.error(`Не удалось сохранить результаты игры ${gameId}`, error);
      throw error;
    }
  }

  getGame(gameId: string): GameEngine | undefined {
    return this.games.get(gameId);
  }

  getActiveGameCount(): number {
    return this.games.size;
  }
}

export const gameManager = new GameManager();
