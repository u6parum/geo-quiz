import { useMemo } from 'react';
import { createEffect, sample, type EventCallable } from 'effector';

import type { ClientEvent } from '@shared/contracts/websocket/client';

import { createGameRoom } from '../../game-room';
import { createSocketConnection } from './socket.factory';
import { mapEventsToSocket } from './socket-events-mapper';
import { buildSocketUrl } from './helpers';

interface UseGameSyncParams {
  teamId: string;
  gameId: string;
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

  // 3. Создаём комнату, подключённую к сокету
  const room = createGameRoom({
    serverEvents,
    localTeamId: teamId,
  });

  sample({
    clock: room.sendMessage,
    target: socket.messageSent,
  });

  // Подписываем sendToServer из текущей команды
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
  };
}

export function useGameSync(params: UseGameSyncParams) {
  return useMemo(() => createGameSync(params), [params.teamId, params.gameId]);
}
