/**
 * Разбор начисления очков за угаданную достопримечательность.
 * Итог = timeScore (за скорость) × questionFactor (за потраченные вопросы).
 */
export interface ScoreBreakdown {
  total: number; // Итоговые очки
  timeScore: number; // Очки за скорость угадывания
  questionFactor: number; // Итоговый коэффициент за вопросы
  questionsUsed: number; // Сколько вопросов команда задала этой цели за игру
  questionsBudget: number; // Сколько вопросов команда могла задать этой цели за игру
}
