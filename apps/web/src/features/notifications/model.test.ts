import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  $toasts,
  MAX_VISIBLE_TOASTS,
  TOAST_DURATION_MS,
  notify,
  toastDismissed,
  toastsPaused,
  toastsResumed,
} from './model';

const texts = () => $toasts.getState().map((t) => t.text);

describe('уведомления', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    $toasts.getState().forEach((t) => toastDismissed(t.id));
    toastsResumed();
    vi.useRealTimers();
  });

  it('показывает тост и убирает его через 5 секунд', () => {
    notify({ type: 'info', text: 'Привет' });

    expect(texts()).toEqual(['Привет']);

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(texts()).toEqual(['Привет']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('у каждого тоста свой таймер', () => {
    notify({ type: 'info', text: 'Первый' });
    vi.advanceTimersByTime(2000);
    notify({ type: 'info', text: 'Второй' });

    vi.advanceTimersByTime(3000);
    expect(texts()).toEqual(['Второй']);

    vi.advanceTimersByTime(2000);
    expect(texts()).toEqual([]);
  });

  it('закрывается вручную', () => {
    notify({ type: 'info', text: 'Закрой меня' });
    toastDismissed($toasts.getState()[0].id);

    expect(texts()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ставит таймер на паузу при наведении и продолжает с оставшегося времени', () => {
    notify({ type: 'info', text: 'Пауза' });

    vi.advanceTimersByTime(3000);
    toastsPaused();

    vi.advanceTimersByTime(60_000);
    expect(texts()).toEqual(['Пауза']);

    toastsResumed();
    vi.advanceTimersByTime(1999);
    expect(texts()).toEqual(['Пауза']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('тост, появившийся во время паузы, не стартует до её снятия', () => {
    toastsPaused();
    notify({ type: 'info', text: 'Новый' });

    vi.advanceTimersByTime(TOAST_DURATION_MS * 2);
    expect(texts()).toEqual(['Новый']);

    toastsResumed();
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(texts()).toEqual([]);
  });

  it('снимает паузу, если список опустел под курсором', () => {
    notify({ type: 'info', text: 'Один' });
    toastsPaused();
    toastDismissed($toasts.getState()[0].id);

    notify({ type: 'info', text: 'Следующий' });
    vi.advanceTimersByTime(TOAST_DURATION_MS);

    expect(texts()).toEqual([]);
  });

  it('заменяет тост с тем же dedupeKey и перезапускает таймер', () => {
    notify({ type: 'info', text: 'Старый', dedupeKey: 'key' });
    vi.advanceTimersByTime(4000);
    notify({ type: 'info', text: 'Новый', dedupeKey: 'key' });

    expect(texts()).toEqual(['Новый']);

    vi.advanceTimersByTime(4000);
    expect(texts()).toEqual(['Новый']);

    vi.advanceTimersByTime(1000);
    expect(texts()).toEqual([]);
  });

  it('ограничивает число видимых тостов, вытесняя старые', () => {
    for (let i = 1; i <= MAX_VISIBLE_TOASTS + 2; i++) {
      notify({ type: 'info', text: `№${i}` });
    }

    expect(texts()).toEqual(['№3', '№4', '№5', '№6']);

    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(texts()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
