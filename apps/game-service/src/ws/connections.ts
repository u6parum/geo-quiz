import { WebSocket } from 'ws';
import type { ServerEvent } from '@shared/contracts';

import { socketMessage } from './utils';

const teamConnections = new Map<string, WebSocket>();
const gameTeams = new Map<string, Set<string>>();

export function addConnection(teamId: string, gameId: string, ws: WebSocket): void {
  const existing = teamConnections.get(teamId);

  if (existing && existing.readyState === WebSocket.OPEN) {
    existing.close(4001, 'Новое подключение');
  }

  teamConnections.set(teamId, ws);

  if (!gameTeams.has(gameId)) {
    gameTeams.set(gameId, new Set());
  }

  gameTeams.get(gameId)!.add(teamId);
}

export function removeConnection(teamId: string, ws: WebSocket): void {
  const current = teamConnections.get(teamId);

  if (current === ws) {
    teamConnections.delete(teamId);
  }
}

export function sendTo(teamId: string, event: ServerEvent): void {
  const ws = teamConnections.get(teamId);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(socketMessage(event));
  }
}

export function broadcastToGame(gameId: string, event: ServerEvent): void {
  const teams = gameTeams.get(gameId);
  if (!teams) return;

  teams.forEach((teamId) => {
    sendTo(teamId, event);
  });
}

export function getConnectionCount(): number {
  return teamConnections.size;
}
