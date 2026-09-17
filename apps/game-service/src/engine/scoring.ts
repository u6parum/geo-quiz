// Функция расчета очков. Чем быстрее угадали, тем больше очков начисляем.
export function calculateScore(elapsedSeconds: number, totalSeconds: number): number {
  if (elapsedSeconds <= 0) {
    return 1000;
  }

  const ratio = 1 - elapsedSeconds / totalSeconds;

  return Math.round(100 + 900 * ratio);
}
