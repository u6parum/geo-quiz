import type { ScoreBreakdown } from '@shared/contracts/scoring';

// Пороги расчёта очков
export const SCORING = {
  // Гарантированные очки за любое угадывание
  MIN_SCORE: 100,
  // Максимум за скорость (угадали в самом начале)
  MAX_TIME_BONUS: 900,
  // Коэффициент, если команда не задала ни одного вопроса этой цели
  MAX_QUESTION_FACTOR: 1.1,
  // Коэффициент, если команда выбрала весь бюджет вопросов
  MIN_QUESTION_FACTOR: 0.7,
  // Используется, если бюджет вопросов равен нулю
  NEUTRAL_QUESTION_FACTOR: 1,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Очки за скорость угадывания
function calculateTimeScore(elapsedSeconds: number, totalSeconds: number): number {
  if (elapsedSeconds <= 0) {
    return SCORING.MIN_SCORE + SCORING.MAX_TIME_BONUS;
  }

  const ratio = 1 - clamp(elapsedSeconds / totalSeconds, 0, 1);

  return SCORING.MIN_SCORE + SCORING.MAX_TIME_BONUS * ratio;
}

// Чем меньше вопросов потратила команда на эту достопримечательность, тем выше коэффициент
function calculateQuestionFactor(questionsUsed: number, questionsBudget: number): number {
  if (questionsBudget <= 0) {
    return SCORING.NEUTRAL_QUESTION_FACTOR;
  }

  const usedRatio = clamp(questionsUsed / questionsBudget, 0, 1);
  const span = SCORING.MAX_QUESTION_FACTOR - SCORING.MIN_QUESTION_FACTOR;

  return SCORING.MAX_QUESTION_FACTOR - span * usedRatio;
}

/**
 * Расчёт очков за угаданную достопримечательность.
 * Итог = очки за скорость × коэффициент за количество заданных этой цели вопросов.
 */
export function calculateScore(
  elapsedSeconds: number,
  totalSeconds: number,
  questionsUsed: number,
  questionsBudget: number,
): ScoreBreakdown {
  const timeScore = calculateTimeScore(elapsedSeconds, totalSeconds);
  const questionFactor = calculateQuestionFactor(questionsUsed, questionsBudget);

  return {
    total: Math.round(timeScore * questionFactor),
    timeScore: Math.round(timeScore),
    questionFactor: Math.round(questionFactor * 100) / 100,
    questionsUsed,
    questionsBudget,
  };
}
