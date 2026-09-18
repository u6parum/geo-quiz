import { createEvent, createStore, sample } from 'effector';
import type { Hint, Guess, ClientEvent, SubmitGuessEvent } from '@shared/contracts';

interface GuessingConfig {
  hints: Hint[];
  hintsSchedule: number[]; // [60, 180, 300] — секунды раскрытия
  totalDuration: number; // Длительность игры
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createGuessingSession = (targetTeamId: string, targetTeamName: string, _config: GuessingConfig) => {
  const sendToServer = createEvent<ClientEvent>(); // Событие-триггер для отправки в сокет

  // === СОБЫТИЯ ===
  const addHint = createEvent<Hint>(); // Добавить подсказку
  const submitGuess = createEvent<string>(); // Запускается при попытке догадки
  const markCompleted = createEvent<number>(); // Дан правильный ответ
  const addFailedAttempt = createEvent<string>();

  // === СТОРЫ ===
  const $earnedScore = createStore(0);
  const $revealedHints = createStore<Hint[]>([]);
  const $guessHistory = createStore<Guess[]>([]);
  const $isCompleted = createStore(false).on(markCompleted, () => true);

  /* Добавляем подсказку в список доступных подсказок */
  sample({
    clock: addHint,
    source: $revealedHints,
    fn: (hints, newHint) => {
      // Избегаем дубликатов
      if (hints.some((h) => h.id === newHint.id)) {
        return hints;
      }

      return [...hints, newHint];
    },
    target: $revealedHints,
  });

  sample({
    clock: addFailedAttempt,
    source: $guessHistory,
    fn: (history, text) => [...history, { text, isCorrect: false, time: 0 }],
    target: $guessHistory,
  });

  /* При попытке догадки - отправляем серверу сообщение */
  sample({
    clock: submitGuess,
    fn: (text) =>
      ({
        type: 'SUBMIT_GUESS',
        payload: { targetTeamId, text },
      }) as SubmitGuessEvent,
    target: sendToServer,
  });

  /* Если запустили markCompleted - значит был дан правильный ответ */
  sample({
    clock: markCompleted,
    target: $earnedScore,
  });

  return {
    // Мета
    targetTeamId,
    targetTeamName,

    // События
    submitGuess,
    addHint,
    markCompleted,
    addFailedAttempt,

    // Сторы
    $revealedHints,
    $guessHistory,
    $earnedScore,
    $isCompleted,

    sendToServer,
  };
};

export type GuessingSession = ReturnType<typeof createGuessingSession>;
