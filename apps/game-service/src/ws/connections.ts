import { WebSocket } from 'ws';
import type { ServerEvent } from '@shared/contracts';

import { socketMessage } from './utils';

const adminConnections = new Map<string, Set<WebSocket>>();
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

export function addAdminConnection(gameId: string, ws: WebSocket): void {
  if (!adminConnections.has(gameId)) {
    adminConnections.set(gameId, new Set());
  }
  adminConnections.get(gameId)!.add(ws);
}

export function removeAdminConnection(gameId: string, ws: WebSocket): void {
  const admins = adminConnections.get(gameId);

  if (!admins) {
    return;
  }

  admins.delete(ws);

  if (admins.size === 0) {
    adminConnections.delete(gameId);
  }
}

export function sendToAdmins(gameId: string, event: ServerEvent): void {
  const admins = adminConnections.get(gameId);

  if (!admins) {
    return;
  }

  admins.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });
}

export function broadcastToGameAndAdmins(gameId: string, event: ServerEvent): void {
  broadcastToGame(gameId, event);
  sendToAdmins(gameId, event);
}

export function closeGameConnections(gameId: string): void {
  // Закрываем соединения команд
  const teams = gameTeams.get(gameId);

  if (teams) {
    teams.forEach((teamId) => {
      const ws = teamConnections.get(teamId);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(4000, 'Game finished');
      }

      teamConnections.delete(teamId);
    });

    gameTeams.delete(gameId);
  }

  // Закрываем соединения админов
  const admins = adminConnections.get(gameId);

  if (admins) {
    admins.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(4000, 'Game finished');
      }
    });

    adminConnections.delete(gameId);
  }
}
