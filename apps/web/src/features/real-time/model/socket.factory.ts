import { attach, combine, createEffect, createEvent, createStore, sample, type Event } from 'effector';

import type {
  ErrorEvent,
  ServerEvent,
  TimeSyncEvent,
  GameStateEvent,
  GameEndedEvent,
  GuessResultEvent,
  HintsRevealedEvent,
  AnswerReceivedEvent,
  QuestionReceivedEvent,
  LeaderboardUpdateEvent,
  PhaseChangedEvent,
  SubPhaseChangedEvent,
  LandmarksAssignedEvent,
  GuessesRestoreEvent,
  QuestionHistoryRestoreEvent,
  QuestionCountersResetEvent,
  TeamJoinedEvent,
} from '@shared/contracts/websocket/server';
import type { ClientEvent } from '@shared/contracts/websocket/client';
import { isFatalError, serializeEvent } from './helpers';
import type { SocketConfig } from './types';
import { $accessToken } from '@api/access-token';
import { tryRefresh } from '@api/refresh';

const DEFAULT_PING_INTERVAL_MS = 5000;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export const createSocketConnection = (config: SocketConfig) => {
  const {
    url,
    gameId,
    teamId = '',
    pingInterval = DEFAULT_PING_INTERVAL_MS,
    reconnectDelay = DEFAULT_RECONNECT_DELAY_MS,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = config;

  // === СОБЫТИЯ ===
  const connectRequested = createEvent();
  const disconnectRequested = createEvent();
  const messageSent = createEvent<ClientEvent>();
  const socketClose = createEvent();

  // === СТОРЫ ===
  const $isConnected = createStore(false);
  const $reconnectAttempts = createStore(0);
  const $ws = createStore<WebSocket | null>(null);
  const $error = createStore<string | null>(null);

  // === ВХОДЯЩИЕ СОБЫТИЯ ===
  const rawMessageReceived = createEvent<ServerEvent>();

  /* Типизированные серверные события */
  const errorReceived = registerServerEvent<ErrorEvent>('ERROR');
  const timeSyncReceived = registerServerEvent<TimeSyncEvent>('TIME_SYNC');
  const gameStateReceived = registerServerEvent<GameStateEvent>('GAME_STATE');
  const gameEndedReceived = registerServerEvent<GameEndedEvent>('GAME_ENDED');
  const teamJoinedReceived = registerServerEvent<TeamJoinedEvent>('TEAM_JOINED');
  const guessResultReceived = registerServerEvent<GuessResultEvent>('GUESS_RESULT');
  const answerReceived = registerServerEvent<AnswerReceivedEvent>('ANSWER_RECEIVED');
  const phaseChangeReceived = registerServerEvent<PhaseChangedEvent>('PHASE_CHANGED');
  const hintsRevealedReceived = registerServerEvent<HintsRevealedEvent>('HINTS_REVEALED');
  const questionReceived = registerServerEvent<QuestionReceivedEvent>('QUESTION_RECEIVED');
  const subPhaseChangeReceived = registerServerEvent<SubPhaseChangedEvent>('SUB_PHASE_CHANGED');
  const leaderboardReceived = registerServerEvent<LeaderboardUpdateEvent>('LEADERBOARD_UPDATE');
  const landmarksAssigned = registerServerEvent<LandmarksAssignedEvent>('LANDMARKS_ASSIGNED');
  const guessesRestore = registerServerEvent<GuessesRestoreEvent>('GUESSES_RESTORE');
  const questionHistoryRestore = registerServerEvent<QuestionHistoryRestoreEvent>('QUESTION_HISTORY_RESTORE');
  const questionCountersReset = registerServerEvent<QuestionCountersResetEvent>('QUESTION_COUNTERS_RESET');

  /* Функция регистрации серверных событий */
  function registerServerEvent<E extends ServerEvent>(msgType: E['type']): Event<E['payload']> {
    return rawMessageReceived.filterMap((msg) => (msg.type === msgType ? msg.payload : undefined));
  }

  /* */

  // === ЛОГИКА ПОДКЛЮЧЕНИЯ ===
  const connectFx = attach({
    source: $accessToken,
    effect: async (token): Promise<WebSocket> => {
      if (!token) {
        token = await tryRefresh();
      }

      if (!token) {
        throw new Error('Нет access-токена');
      }

      return new Promise((resolve, reject) => {
        try {
          const wsUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            // После подключения отправляем JOIN_GAME
            ws.send(
              serializeEvent({
                type: 'JOIN_GAME',
                payload: { gameId, teamId },
              }),
            );

            resolve(ws);
          };

          ws.onmessage = (event) => {
            rawMessageReceived(JSON.parse(event.data) as ServerEvent);
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
          };

          ws.onclose = () => socketClose();
        } catch (error) {
          reject(error);
        }
      });
    },
  });

  // === PING ДЛЯ СИНХРОНИЗАЦИИ ВРЕМЕНИ ===
  const startPingFx = createEffect(() => {
    return setInterval(() => {
      messageSent({
        type: 'PING',
        payload: { clientTime: Date.now() },
      });
    }, pingInterval);
  });

  const stopPingFx = createEffect((timer: ReturnType<typeof setInterval>) => {
    clearInterval(timer);
  });

  const $isConnectionAvailable = combine(
    { pending: connectFx.pending, connected: $isConnected },
    ({ connected, pending }) => !connected && !pending,
  );

  sample({
    clock: connectRequested,
    filter: $isConnectionAvailable,
    target: connectFx,
  });

  sample({
    clock: connectFx.doneData,
    target: $ws,
  });

  // Запускаем пинг после подключения
  sample({
    clock: connectFx.done,
    target: startPingFx,
  });

  // === ОБРАБОТКА ОШИБОК ===

  // Эмитится только при фатальных ошибках, после которых не будем реконнектиться
  const fatalErrorReceived = errorReceived.filter({
    fn: (error) => isFatalError(error.code),
  });

  const $fatalError = createStore<string | null>(null)
    .on(fatalErrorReceived, (_, error) => error.message)
    .on(connectRequested, () => null);

  $error.on(errorReceived, (_, { message }) => message);
  $error.on(connectFx.fail, (_, { error: { message } }) => message);

  // === ПЕРЕПОДКЛЮЧЕНИЕ ===
  const $shouldReconnect = createStore(true)
    .on(connectRequested, () => true)
    .on([gameEndedReceived, disconnectRequested, fatalErrorReceived], () => false);

  // Сброс счётчика реконнектов при успешном подключении
  $reconnectAttempts.reset(connectFx.done);

  const reconnectFx = createEffect((nextAttempt: number) => {
    setTimeout(() => connectRequested(), reconnectDelay * Math.pow(2, nextAttempt - 1)); // exponential backoff
  });

  sample({
    clock: socketClose,
    source: { attempts: $reconnectAttempts, shouldReconnect: $shouldReconnect },
    filter: ({ attempts, shouldReconnect }) => shouldReconnect && attempts < maxReconnectAttempts,
    fn: ({ attempts }) => attempts + 1,
    target: [$reconnectAttempts, reconnectFx],
  });

  // === ОТПРАВКА СООБЩЕНИЙ ===
  const sendMessageFx = attach({
    source: $ws,
    effect: (ws: WebSocket | null, event: ClientEvent) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket не подключен');
      }

      ws.send(serializeEvent(event));
    },
  });

  sample({
    clock: messageSent,
    filter: $isConnected,
    target: sendMessageFx,
  });

  // === ДИСКОННЕКТ ===
  const disconnectFx = attach({ source: $ws, effect: (ws) => ws?.close() });

  sample({
    clock: disconnectRequested,
    filter: $isConnected,
    target: disconnectFx,
  });

  sample({
    clock: disconnectRequested,
    source: startPingFx.doneData,
    target: stopPingFx,
  });

  // Дисконнект через 2 сек. после GAME_ENDED
  const disconnectAfterEndFx = createEffect(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      }),
  );

  sample({
    clock: gameEndedReceived,
    target: disconnectAfterEndFx,
  });

  sample({
    clock: disconnectAfterEndFx.done,
    target: disconnectRequested,
  });

  $isConnected.on(socketClose, () => false);
  $isConnected.on(connectFx.done, () => true);

  return {
    // Сторы
    $isConnected,
    $error,
    $fatalError,
    $reconnectAttempts,

    // События управления
    connectRequested,
    disconnectRequested,
    messageSent,

    // Входящие события (для подписки в gameRoom)
    gameStateReceived,
    gameEndedReceived,
    timeSyncReceived,
    hintsRevealedReceived,
    guessResultReceived,
    questionReceived,
    answerReceived,
    leaderboardReceived,
    errorReceived,
    phaseChangeReceived,
    subPhaseChangeReceived,
    landmarksAssigned,
    guessesRestore,
    questionHistoryRestore,
    questionCountersReset,
    teamJoinedReceived,
  };
};

export type CreateSocketConnection = ReturnType<typeof createSocketConnection>;
