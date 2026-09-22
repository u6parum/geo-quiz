import { createEvent, sample } from 'effector';
import { interval } from 'patronum';
import { $accessToken, refreshAccessTokenFx } from './access-token';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 минут

export const scheduleRefresh = createEvent();
export const stopRefresh = createEvent();

const { tick } = interval({
  timeout: REFRESH_INTERVAL,
  start: scheduleRefresh,
  stop: stopRefresh,
});

// Обновляем токен только если он уже есть
sample({
  clock: tick,
  source: $accessToken,
  filter: (token) => !!token,
  target: refreshAccessTokenFx,
});

// Если refresh вернул null — останавливаем scheduler
sample({
  clock: refreshAccessTokenFx.doneData,
  filter: (token) => token === null,
  target: stopRefresh,
});
