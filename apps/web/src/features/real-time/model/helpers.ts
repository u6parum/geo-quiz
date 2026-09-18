import type { ClientEvent, ServerEvent } from '@shared/contracts';

export function serializeEvent<E extends ClientEvent | ServerEvent>(event: E) {
  return JSON.stringify(event);
}
