import { useMemo } from 'react';
import { createEffect, createEvent, sample, type EventCallable } from 'effector';

import type { ClientEvent } from '@shared/contracts/websocket/client';

import { createGameRoom } from '../../game-room';
import { createSocketConnection } from './socket.factory';
import { mapEventsToSocket } from './socket-events-mapper';

interface UseGameSyncParams {
  teamId: string;
  gameId: string;
}

function buildSocketUrl(): string {
  // В dev — через Vite proxy на /api/ws
  // В prod — тот же origin, что и приложение
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
}

function createGameSync(params: UseGameSyncParams) {
  const { teamId, gameId } = params;

  // 1. Создаём сокет
  const socket = createSocketConnection({
    url: buildSocketUrl(),
    gameId,
    teamId,
  });

  const serverEvents = mapEventsToSocket(socket);

  // 2. Событие старта игры (придёт из админки)
  const startGameEvent = createEvent<unknown>();

  // 3. Создаём комнату, подключённую к сокету
  const room = createGameRoom({
    startGameEvent,
    serverEvents,
    localTeamId: teamId,
  });

  sample({
    clock: room.sendMessage,
    target: socket.messageSent,
  });

  // 🔥 Подписываем sendToServer из текущей команды
  const subscribeTeamToSocket = createEffect((send: EventCallable<ClientEvent>) => {
    sample({
      clock: send,
      target: socket.messageSent,
    });
  });

  sample({
    clock: room.$currentTeam,
    filter: (team) => !!team,
    fn: (team) => team!.sendToServer,
    target: subscribeTeamToSocket,
  });

  return {
    room,
    socket,
    startGameEvent,
  };
}

// React-хук
export function useGameSync(params: UseGameSyncParams) {
  return useMemo(() => createGameSync(params), [params.teamId, params.gameId]);
}
