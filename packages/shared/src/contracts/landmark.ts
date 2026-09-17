export type HintGroup = 1 | 2 | 3;
export type LandmarkStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Hint {
  id: string;
  text: string;
  group: HintGroup;
}

export interface Landmark {
  id: string;
  status: LandmarkStatus;
  teamId: string; // Какая команда загадала
  name: string; // Правильный ответ
  description: string; // Для модерации: ссылка на вики/описание
  hints: Hint[];
}
