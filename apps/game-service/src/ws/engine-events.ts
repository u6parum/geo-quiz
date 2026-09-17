import { logger } from '@shared/utils/logger';
import { EngineEvent } from '../engine/events';
import { GameEngine } from '../engine/game-engine';
import { broadcastToGame, sendTo } from './connections';
import { gameRepo } from '../db/repositories/game.repo';

import type { FinalScores } from '../engine/types';

export function setupEngineEvents(
  engine: GameEngine,
  onEnd: (gameId: string, finalScore: FinalScores) => Promise<void>,
): void {
  const gameId = engine.getState().id;

  engine.on(EngineEvent.TimeSync, (payload) => {
    broadcastToGame(gameId, {
      type: 'TIME_SYNC',
      payload,
    });
  });

  engine.on(EngineEvent.SubPhaseChanged, (payload) => {
    broadcastToGame(gameId, {
      type: 'SUB_PHASE_CHANGED',
      payload,
    });
  });

  engine.on(EngineEvent.HintsRevealed, ({ forTeamId, targetTeamId, hints, group }) => {
    sendTo(forTeamId, {
      type: 'HINTS_REVEALED',
      payload: { targetTeamId, hints, group },
    });
  });

  engine.on(EngineEvent.GuessResult, ({ teamId, targetTeamId, isCorrect, earnedScore, elapsedSeconds, teamScore }) => {
    sendTo(teamId, {
      type: 'GUESS_RESULT',
      payload: {
        targetTeamId,
        isCorrect,
        earnedScore,
        elapsedSeconds,
        teamScore,
      },
    });

    broadcastToGame(gameId, {
      type: 'LEADERBOARD_UPDATE',
      payload: engine.getLeaderboard(),
    });
  });

  engine.on(EngineEvent.QuestionAsked, async (question) => {
    const { fromTeamId, toTeamId, text, askedAt = 0 } = question;

    try {
      await gameRepo.saveQuestion({ gameId, fromTeamId, toTeamId, text, askedAt });
    } catch (error) {
      logger.error(`Не удалось обновить статус игры ${gameId}`, error);
    }

    sendTo(toTeamId, {
      type: 'QUESTION_RECEIVED',
      payload: question,
    });

    sendTo(fromTeamId, {
      type: 'QUESTION_SENT_CONFIRMATION',
      payload: question,
    });
  });

  engine.on(EngineEvent.QuestionAnswered, (answer) => {
    const question = engine.getState().questions.find((q) => q.id === answer.questionId);

    if (question) {
      sendTo(question.fromTeamId, {
        type: 'ANSWER_RECEIVED',
        payload: answer,
      });
    }
  });

  engine.on(EngineEvent.GameStarted, (payload) => {
    broadcastToGame(gameId, {
      type: 'PHASE_CHANGED',
      payload,
    });

    // Отправляем начальный лидерборд всем командам
    broadcastToGame(gameId, {
      type: 'LEADERBOARD_UPDATE',
      payload: engine.getLeaderboard(),
    });
  });

  engine.on(EngineEvent.GameEnded, async ({ finalScores }) => {
    logger.info(`Игра ${gameId} завершена`);

    broadcastToGame(gameId, {
      type: 'GAME_ENDED',
      payload: { finalScores },
    });

    try {
      await onEnd(gameId, finalScores);
    } catch (error) {
      logger.error(`Ошибка обработки завершения игры ${gameId}`, error);
    }
  });

  engine.on(EngineEvent.LandmarksAssigned, ({ forTeamId, landmarks }) => {
    sendTo(forTeamId, {
      type: 'LANDMARKS_ASSIGNED',
      payload: { landmarks },
    });
  });

  engine.on(EngineEvent.QuestionCountersReset, ({ questionsRemaining }) => {
    broadcastToGame(gameId, {
      type: 'QUESTION_COUNTERS_RESET',
      payload: { questionsRemaining },
    });
  });

  logger.info(`Подписки на события игры ${gameId} настроены`);
}
