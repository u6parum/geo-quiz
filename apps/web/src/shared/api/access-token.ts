import { createEffect, createStore, sample } from 'effector';

export const $accessToken = createStore<string | null>(null);

export const refreshAccessTokenFx = createEffect(async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // важно для refresh cookie
    });

    if (!response.ok) {
      return null;
    }

    const data: { accessToken: string } = await response.json();

    return data.accessToken;
  } catch {
    return null;
  }
});

sample({
  clock: refreshAccessTokenFx.doneData,
  target: $accessToken,
});
