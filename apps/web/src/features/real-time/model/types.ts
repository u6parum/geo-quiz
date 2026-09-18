export interface SocketConfig {
  url: string;
  gameId: string;
  teamId: string;
  pingInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}
