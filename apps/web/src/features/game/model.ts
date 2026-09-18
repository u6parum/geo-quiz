import { interval, not } from 'patronum';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { gameApi, type Game } from './api';
import { createGate } from 'effector-react';

export const AdminGamesGate = createGate();

export const $games = createStore<Game[]>([]);
export const $gamesLoading = createStore(false);

export const loadGames = createEvent();
export const startGame = createEvent<string>();

export const loadFx = createEffect(gameApi.list);
export const startFx = createEffect(gameApi.start);
export const createFx = createEffect(gameApi.create);

$games.on(loadFx.doneData, (_, games) => games);
$gamesLoading.on(loadFx.pending, (_, pending) => pending);

sample({
  clock: loadGames,
  filter: not(loadFx.pending),
  target: loadFx,
});

sample({ clock: startGame, target: startFx });

sample({
  clock: [createFx.done, startFx.done],
  target: loadGames,
});

const { tick: gamesPollingTick } = interval({
  timeout: 5000,
  start: AdminGamesGate.open,
  stop: AdminGamesGate.close,
});

// 🔥 И на открытии, и на тике — через loadGames (защищён от двойного запуска)
sample({
  clock: [AdminGamesGate.open, gamesPollingTick],
  target: loadGames,
});
