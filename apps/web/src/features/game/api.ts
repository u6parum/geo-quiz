import { http } from '@api/http';

export type GameStatus = 'LOBBY' | 'MODERATION' | 'ACTIVE' | 'FINISHED';

export interface GameTeamInfo {
  teamId: string;
  team: { id: string; name: string };
}

export interface Game {
  id: string;
  status: GameStatus;
  durationSeconds: number;
  hintsSchedule: number[];
  questionWindows: number[];
  teams: GameTeamInfo[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export const gameApi = {
  async list(): Promise<Game[]> {
    return http('/games');
  },

  async getOne(id: string): Promise<Game> {
    return http(`/games/${id}`);
  },

  async create(payload: {
    durationSeconds: number;
    hintsSchedule: number[];
    questionWindows: number[];
    teamIds: string[];
  }): Promise<Game> {
    return http('/games', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async start(id: string): Promise<void> {
    return http(`/games/${id}/start`, { method: 'POST' });
  },
};
