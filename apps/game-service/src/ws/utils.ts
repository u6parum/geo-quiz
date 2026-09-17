import type { ServerEvent } from '@shared';

export function getTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.trim().split('=');

    if (key && value) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return cookies['auth_token'] || null;
}

export function socketMessage<T extends ServerEvent>(event: T) {
  return JSON.stringify(event);
}
