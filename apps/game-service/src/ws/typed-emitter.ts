/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';

export class TypedEventEmitter<T> extends EventEmitter {
  // Переопределение методов on/emit для типизации
  override on<K extends keyof T>(
    event: K & (string | symbol),
    listener: T[K] extends (...args: any[]) => any ? T[K] : never,
  ): this {
    return super.on(event as string | symbol, listener);
  }

  override emit<K extends keyof T>(
    event: K & (string | symbol),
    ...args: T[K] extends (...args: infer P) => any ? P : never
  ): boolean {
    return super.emit(event as string | symbol, ...args);
  }
}
