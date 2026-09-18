import { useMemo } from 'react';
import { createAdminRoom } from '@features/game-room';
import { createSocketConnection } from './socket.factory';
import { buildSocketUrl } from './helpers';

interface UseAdminSyncParams {
  gameId: string;
}

export function createAdminSync(params: UseAdminSyncParams) {
  const { gameId } = params;

  const socket = createSocketConnection({
    url: buildSocketUrl(),
    gameId,
    // teamId не передаём — это админ
  });

  const room = createAdminRoom({
    serverEvents: {
      gameStateReceived: socket.gameStateReceived,
      timeSyncReceived: socket.timeSyncReceived,
      leaderboardReceived: socket.leaderboardReceived,
      subPhaseChangeReceived: socket.subPhaseChangeReceived,
    },
  });

  return { room, socket };
}

export function useAdminSync(params: UseAdminSyncParams) {
  return useMemo(() => createAdminSync(params), [params.gameId]);
}
