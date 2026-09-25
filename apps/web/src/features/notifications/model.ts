import { createEffect, createEvent, createStore, sample } from 'effector';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  text: string;
  dedupeKey?: string;
}

export interface NotifyParams {
  type: ToastType;
  text: string;
  /** Повторный тост с тем же ключом заменяет предыдущий и заново запускает таймер */
  dedupeKey?: string;
}

export const TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 4;

// === СОБЫТИЯ ===
export const notify = createEvent<NotifyParams>();
export const toastDismissed = createEvent<number>();
export const toastsPaused = createEvent(); // Курсор над списком уведомлений
export const toastsResumed = createEvent(); // Курсор ушёл

const toastAdded = createEvent<Toast>();

// === СТОРЫ ===
export const $toasts = createStore<Toast[]>([]);
export const $isPaused = createStore(false);

let nextToastId = 1;

sample({
  clock: notify,
  fn: (params): Toast => ({ id: nextToastId++, ...params }),
  target: toastAdded,
});

$toasts.on(toastAdded, (toasts, toast) => {
  const withoutDuplicate = toast.dedupeKey ? toasts.filter((t) => t.dedupeKey !== toast.dedupeKey) : toasts;

  return [...withoutDuplicate, toast].slice(-MAX_VISIBLE_TOASTS);
});

$toasts.on(toastDismissed, (toasts, id) => toasts.filter((t) => t.id !== id));

$isPaused.on(toastsPaused, () => true).on(toastsResumed, () => false);

// Если список опустел под курсором, mouseleave уже не придёт — снимаем паузу сами
$isPaused.on($toasts, (paused, toasts) => (toasts.length === 0 ? false : paused));

// === ТАЙМЕРЫ ===
interface TimerEntry {
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

const timers = new Map<number, TimerEntry>();

const runTimer = (id: number, entry: TimerEntry) => {
  entry.startedAt = Date.now();
  entry.timer = setTimeout(() => {
    timers.delete(id);
    toastDismissed(id);
  }, entry.remainingMs);
};

const pauseTimer = (entry: TimerEntry) => {
  if (entry.timer === null) {
    return;
  }

  clearTimeout(entry.timer);
  entry.timer = null;
  entry.remainingMs = Math.max(0, entry.remainingMs - (Date.now() - entry.startedAt));
};

/* Приводит таймеры в соответствие со списком тостов и состоянием паузы */
const syncTimersFx = createEffect(({ toasts, paused }: { toasts: Toast[]; paused: boolean }) => {
  const alive = new Set(toasts.map((t) => t.id));

  // Тост убрали (закрыли, вытеснили или заменили дубликатом) — таймер больше не нужен
  for (const [id, entry] of timers) {
    if (!alive.has(id)) {
      pauseTimer(entry);
      timers.delete(id);
    }
  }

  for (const { id } of toasts) {
    let entry = timers.get(id);

    if (!entry) {
      entry = { timer: null, remainingMs: TOAST_DURATION_MS, startedAt: 0 };
      timers.set(id, entry);
    }

    if (paused) {
      pauseTimer(entry);
    } else if (entry.timer === null) {
      runTimer(id, entry);
    }
  }
});

sample({
  clock: [$toasts, $isPaused],
  source: { toasts: $toasts, paused: $isPaused },
  target: syncTimersFx,
});
