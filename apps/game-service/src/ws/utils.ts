import type { ServerEvent } from '@shared/contracts';
import { GameState } from '../engine/types';

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

export function mapTeamsToState(teams: GameState['teams']) {
  return Array.from(teams.values()).map((team) => ({
    id: team.id,
    name: team.name,
    score: team.score,
  }));
}
