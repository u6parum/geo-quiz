import type { ClientEvent, FatalErrorCode, GameErrorCode, ServerEvent } from '@shared/contracts';
import { FATAL_ERROR_CODES } from './constants';

export function serializeEvent<E extends ClientEvent | ServerEvent>(event: E) {
  return JSON.stringify(event);
}

export function isFatalError(code: GameErrorCode | FatalErrorCode): code is FatalErrorCode {
  return FATAL_ERROR_CODES.includes(code as FatalErrorCode);
}

export function buildSocketUrl(): string {
  // В dev — через Vite proxy на /api/ws
  // В prod — тот же origin, что и приложение
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
}
