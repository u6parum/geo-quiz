import { refreshAccessTokenFx } from './access-token';

let pendingRefresh: Promise<string | null> | null = null;

export function tryRefresh(): Promise<string | null> {
  // Если уже идёт — возвращаем тот же промис
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = refreshAccessTokenFx().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}
