import type { ActiveGameSubPhase } from './game';

export interface Question {
  id: string;
  fromTeamId: string; // От кого
  toTeamId: string; // Кому
  text: string; // Вопрос
  askedAt: number; // elapsedSeconds от начала игры
  phase: ActiveGameSubPhase;
  answered: boolean;
}

export interface Answer {
  questionId: string;
  answer: AnswerVariant;
  fromTeamId: string; // Кто ответил
  answeredAt: number;
}

export interface PendingQuestion {
  question: Question;
  answer: Answer | null;
}

export type AnswerVariant = 'yes' | 'no';
export type AnswerStatus = 'answered' | 'pending';

export type OutgoingQuestion = Pick<Question, 'id' | 'toTeamId' | 'text' | 'askedAt'> & {
  status: AnswerStatus;
  answer?: AnswerVariant;
};
