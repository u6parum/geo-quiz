// === Фазы игры ===
export type GamePhase =
  | 'LOBBY' // Ожидание регистрации команд
  | 'MODERATION' // Админ проверяет загаданное
  | 'ACTIVE' // Идёт игра
  | 'FINISHED'; // Завершена

// === Фазы внутри активной игры ===
export type ActiveGameSubPhase =
  | 'before_hints_1' // До 1-й группы подсказок
  | 'hints_1' // Открыта 1-я группа
  | 'between_1_and_2' // Окно вопросов
  | 'hints_2' // Открыта 2-я группа
  | 'between_2_and_3' // Окно вопросов
  | 'hints_3' // Открыта 3-я группа
  | 'final_guessing'; // Последний шанс угадать

export interface GameConfig {
  id: string;
  durationSeconds: number; // Общая длительность
  hintsSchedule: number[]; // [60, 180, 300] — секунды раскрытия групп
  questionWindows: number[]; // [120, 240, 360] — начало окон вопросов
  minTeams: number;
  maxTeams: number;
}

export interface Guess {
  time: number;
  text: string;
  isCorrect: boolean;
}
