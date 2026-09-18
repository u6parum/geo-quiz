import type { FatalErrorCode } from '@shared/contracts';

export const FATAL_ERROR_CODES: FatalErrorCode[] = [
  'DUPLICATE_CONNECTION',
  'CONNECTION_REPLACED',
  'NOT_PARTICIPANT',
  'GAME_NOT_FOUND',
  'UNAUTHORIZED',
] as const;
