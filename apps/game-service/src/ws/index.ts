import jwt from 'jsonwebtoken';
import type { WebSocketServer, WebSocket } from 'ws';
import type { ClientEvent, JoinGameEvent } from '@shared/contracts';
import { logger } from '@shared/utils/logger';
import { gameManager } from '../services/game-manager';
import { gameRepo } from '../db/repositories/game.repo';
import { addConnection, removeConnection, sendTo } from './connections';
import { getTokenFromCookie, socketMessage } from './utils';
import { JwtPayload } from './types';

export function setupWebSocket(wss: WebSocketServer, jwtSecret: string) {
  wss.on('connection', (ws: WebSocket, req) => {
    let currentTeamId: string | null = null;
    let currentGameId: string | null = null;

    logger.info('Новое WebSocket подключение');

    ws.on('message', async (data: string) => {
      try {
        const message: ClientEvent = JSON.parse(data);

        logger.event(message.type, message);

        switch (message.type) {
          case 'JOIN_GAME': {
            const { gameId, teamId } = message.payload as JoinGameEvent['payload'];

            // === АУТЕНТИФИКАЦИЯ ===
            const token = getTokenFromCookie(req.headers.cookie);

            if (!token) {
              ws.send(
                socketMessage({
                  type: 'ERROR',
                  payload: { message: 'Требуется авторизация', code: 'UNAUTHORIZED' },
                }),
              );

              return ws.close(4001, 'Unauthorized');
            }

            let user: JwtPayload;

            try {
              user = jwt.verify(token, jwtSecret) as JwtPayload;
            } catch {
              ws.send(
                socketMessage({
                  type: 'ERROR',
                  payload: { message: 'Неверный токен', code: 'UNAUTHORIZED' },
                }),
              );

              return ws.close(4001, 'Invalid token');
            }

            // === ПРОВЕРКА УЧАСТИЯ КОМАНДЫ В ИГРЕ ===
            const isParticipant = await gameRepo.isTeamParticipant(gameId, teamId);

            if (!isParticipant) {
              ws.send(
                socketMessage({
                  type: 'ERROR',
                  payload: {
                    message: 'Команда не участвует в этой игре',
                    code: 'NOT_PARTICIPANT',
                  },
                }),
              );

              return ws.close(4003, 'Not participant');
            }

            currentTeamId = teamId;
            currentGameId = gameId;

            addConnection(teamId, gameId, ws);

            logger.info(`Команда ${teamId} подключилась к игре ${gameId}`);

            // Проверяем, запущена ли игра
            const game = await gameRepo.findById(gameId);
            const engine = gameManager.getGame(gameId);

            if (!engine || game?.status !== 'ACTIVE') {
              // Игра завершена — отправляем финальные результаты
              if (game?.status === 'FINISHED') {
                logger.info(`Команда ${teamId} подключилась к завершённой игре ${gameId}`);

                const finalScores = await gameRepo.getGameResults(gameId);

                sendTo(teamId, {
                  type: 'GAME_STATE',
                  payload: {
                    phase: 'FINISHED',
                    subPhase: 'final_guessing',
                    elapsedSeconds: game.durationSeconds,
                    serverTime: Date.now(),
                    teams: finalScores.map((s) => ({
                      id: s.teamId,
                      name: s.teamName,
                      score: s.score,
                    })),
                    yourTeamId: teamId,
                    config: {
                      durationSeconds: game.durationSeconds,
                      hintsSchedule: game.hintsSchedule,
                      questionWindows: game.questionWindows,
                    },
                  },
                });

                sendTo(teamId, {
                  type: 'GAME_ENDED',
                  payload: { finalScores },
                });

                break;
              }

              // Игра ещё не запущена — отправляем состояние ожидания
              logger.info(`Команда ${teamId} ждёт старта игры ${gameId} (фаза: ${game?.status})`);

              sendTo(teamId, {
                type: 'GAME_STATE',
                payload: {
                  phase: game?.status ?? 'LOBBY',
                  subPhase: 'before_hints_1',
                  elapsedSeconds: 0,
                  serverTime: Date.now(),
                  teams: [],
                  yourTeamId: teamId,
                  config: {
                    durationSeconds: game?.durationSeconds ?? 0,
                    hintsSchedule: game?.hintsSchedule ?? [],
                    questionWindows: game?.questionWindows ?? [],
                  },
                },
              });

              break;
            }

            // === ИГРА АКТИВНА — ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ===
            const reconnectState = engine.getReconnectState(teamId);

            if (reconnectState) {
              sendTo(teamId, { type: 'GAME_STATE', payload: reconnectState.gameState });
              sendTo(teamId, { type: 'LANDMARKS_ASSIGNED', payload: { landmarks: reconnectState.landmarks } });

              reconnectState.revealedHints.forEach((hintGroup) => {
                sendTo(teamId, { type: 'HINTS_REVEALED', payload: hintGroup });
              });

              sendTo(teamId, { type: 'GUESSES_RESTORE', payload: { guesses: reconnectState.guesses } });
              sendTo(teamId, { type: 'QUESTION_HISTORY_RESTORE', payload: { questions: reconnectState.questions } });
              sendTo(teamId, { type: 'LEADERBOARD_UPDATE', payload: engine.getLeaderboard() });
            }

            break;
          }

          case 'PING': {
            if (!currentTeamId || !currentGameId) {
              return;
            }

            const engine = gameManager.getGame(currentGameId);

            if (!engine) {
              return;
            }

            const state = engine.getState();

            sendTo(currentTeamId, {
              type: 'TIME_SYNC',
              payload: {
                serverTime: Date.now(),
                clientTime: message.payload.clientTime,
                elapsedSeconds: state.elapsedSeconds,
              },
            });

            break;
          }

          case 'SUBMIT_GUESS': {
            if (!currentTeamId || !currentGameId) {
              return;
            }

            const engine = gameManager.getGame(currentGameId);

            if (!engine) {
              return;
            }

            try {
              engine.submitGuess(currentTeamId, message.payload.targetTeamId, message.payload.text);
            } catch (error: any) {
              sendTo(currentTeamId, {
                type: 'ERROR',
                payload: { message: error.message, code: 'GUESS_ERROR' },
              });
            }

            break;
          }

          case 'ASK_QUESTION': {
            if (!currentTeamId || !currentGameId) {
              return;
            }

            const engine = gameManager.getGame(currentGameId);

            if (!engine) {
              return;
            }

            try {
              await engine.askQuestion(
                currentTeamId,
                message.payload.toTeamId,
                message.payload.text,
                message.payload.questionId,
              );
            } catch (error: any) {
              sendTo(currentTeamId, {
                type: 'ERROR',
                payload: { message: error.message, code: 'QUESTION_ERROR' },
              });
            }

            break;
          }

          case 'ANSWER_QUESTION': {
            if (!currentTeamId || !currentGameId) {
              return;
            }

            const engine = gameManager.getGame(currentGameId);

            if (!engine) {
              return;
            }

            try {
              engine.answerQuestion(currentTeamId, message.payload.questionId, message.payload.answer);
            } catch (error: any) {
              sendTo(currentTeamId, {
                type: 'ERROR',
                payload: { message: error.message, code: 'ANSWER_ERROR' },
              });
            }

            break;
          }

          default:
            logger.info(`Неизвестный тип сообщения: ${message.type}`);
        }
      } catch (error) {
        logger.error('Ошибка обработки сообщения', error);

        ws.send(
          socketMessage({
            type: 'ERROR',
            payload: { message: 'Неверный формат сообщения', code: 'PARSE_ERROR' },
          }),
        );
      }
    });

    ws.on('close', () => {
      logger.info(`Отключение команды: ${currentTeamId}`);

      if (currentTeamId) {
        removeConnection(currentTeamId, ws);
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket ошибка', error);
    });
  });

  logger.info('WebSocket обработчики установлены');
}
