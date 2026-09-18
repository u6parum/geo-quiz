import { createStore, sample } from 'effector';
import type { GamePhase, ActiveGameSubPhase, LeaderboardEntry, GameStatePayload } from '@shared/contracts';
import type { ServerEvents } from './types';

interface AdminRoomParams {
  serverEvents: Pick<
    ServerEvents,
    'gameStateReceived' | 'timeSyncReceived' | 'leaderboardReceived' | 'subPhaseChangeReceived'
  >;
}

export function createAdminRoom(params: AdminRoomParams) {
  const { serverEvents } = params;

  const $phase = createStore<GamePhase>('LOBBY');
  const $subPhase = createStore<ActiveGameSubPhase>('before_hints_1');
  const $elapsedSeconds = createStore(0);
  const $leaderboard = createStore<LeaderboardEntry[]>([]);
  const $config = createStore<GameStatePayload['config'] | null>(null);

  sample({
    clock: serverEvents.gameStateReceived,
    fn: (state) => state.phase,
    target: $phase,
  });

  sample({
    clock: serverEvents.gameStateReceived,
    fn: (state) => state.subPhase,
    target: $subPhase,
  });

  sample({
    clock: serverEvents.gameStateReceived,
    fn: (state) => state.config,
    target: $config,
  });

  sample({
    clock: serverEvents.timeSyncReceived,
    fn: ({ elapsedSeconds }) => elapsedSeconds,
    target: $elapsedSeconds,
  });

  sample({
    clock: serverEvents.leaderboardReceived,
    target: $leaderboard,
  });

  sample({
    clock: serverEvents.subPhaseChangeReceived,
    fn: (payload) => payload.subPhase,
    target: $subPhase,
  });

  return {
    $phase,
    $subPhase,
    $elapsedSeconds,
    $leaderboard,
    $config,
  };
}
