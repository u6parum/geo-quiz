import { not } from 'patronum';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { gameApi, type Game } from './api';

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
