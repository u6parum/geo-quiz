import type { Hint } from '../landmark';

export type JoinGameEvent = {
  type: 'JOIN_GAME';
  payload: { gameId: string; teamId: string; teamName: string };
};

export type SubmitLandmarkEvent = {
  type: 'SUBMIT_LANDMARK';
  payload: { name: string; hints: Hint[]; description: string };
};

export type SubmitGuessEvent = {
  type: 'SUBMIT_GUESS';
  payload: { targetTeamId: string; text: string };
};

export type AskQuestionEvent = {
  type: 'ASK_QUESTION';
  payload: { toTeamId: string; text: string; questionId: string };
};

export type AnswerQuestionEvent = {
  type: 'ANSWER_QUESTION';
  payload: { questionId: string; answer: 'yes' | 'no' };
};

export type PingEvent = { type: 'PING'; payload: { clientTime: number } };

export type AdminApproveLandmarkEvent = {
  type: 'ADMIN_APPROVE_LANDMARK';
  payload: { teamId: string };
};

export type AdminStartGameEvent = {
  type: 'ADMIN_START_GAME';
};

// === События КЛИЕНТ → СЕРВЕР ===
export type ClientEvent =
  | JoinGameEvent
  | SubmitLandmarkEvent
  | SubmitGuessEvent
  | AskQuestionEvent
  | AnswerQuestionEvent
  | PingEvent
  | AdminApproveLandmarkEvent
  | AdminStartGameEvent;
