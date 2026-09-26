import type { ActiveGameSubPhase, GamePhase } from '../game';
import type { Hint, HintGroup } from '../landmark';
import type { Answer, PendingQuestion, Question } from '../question';
import type { ScoreBreakdown } from '../scoring';
import type { TeamBase } from '../team';

export type FatalErrorCode =
  | 'DUPLICATE_CONNECTION'
  | 'CONNECTION_REPLACED'
  | 'NOT_PARTICIPANT'
  | 'GAME_NOT_FOUND'
  | 'UNAUTHORIZED';

export type GameErrorCode = 'QUESTION_ERROR' | 'GUESS_ERROR' | 'ANSWER_ERROR' | 'PARSE_ERROR';
export interface TeamPublicInfo extends TeamBase {
  score: number;
}

export interface HintsRevealedPayload {
  targetTeamId: string;
  hints: Hint[];
  group: HintGroup;
}

export interface GameStatePayload {
  phase: GamePhase;
  subPhase: ActiveGameSubPhase;
  elapsedSeconds: number;
  serverTime: number;
  teams: TeamPublicInfo[];
  yourTeamId: string;
  config: {
    // 🔥 Добавляем конфиг
    durationSeconds: number;
    hintsSchedule: number[];
    questionWindows: number[];
  };
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
}

export interface RestoredGuess {
  targetTeamId: string;
  isCorrect: boolean;
  earnedScore: number;
  attempts: string[];
  breakdown: ScoreBreakdown | null;
}

export interface AssignedLandmark {
  teamId: string; // Кто загадал
  teamName: string; // Имя команды
  landmark: {
    hints: Hint[]; // Только подсказки
  };
}

/**
 * Событие с информацией о текущем состоянии игры
 */
export type GameStateEvent = {
  type: 'GAME_STATE';
  payload: GameStatePayload;
};

/**
 * Событие синхронизации
 */
export type TimeSyncEvent = {
  type: 'TIME_SYNC';
  payload: { serverTime: number; clientTime?: number; elapsedSeconds: number };
};

export type HintsRevealedEvent = {
  type: 'HINTS_REVEALED';
  payload: HintsRevealedPayload;
};

/**
 * Срабатывает после того как сервер обработал отправленную догадку
 */
export type GuessResultEvent = {
  type: 'GUESS_RESULT';
  payload: {
    targetTeamId: string;
    isCorrect: boolean;
    earnedScore: number;
    elapsedSeconds: number;
    teamScore: number;
    breakdown: ScoreBreakdown | null;
  };
};

export type QuestionReceivedEvent = {
  type: 'QUESTION_RECEIVED';
  payload: Question;
};

export type QuestionConfirmationEvent = {
  type: 'QUESTION_SENT_CONFIRMATION';
  payload: Question;
};

export type AnswerReceivedEvent = {
  type: 'ANSWER_RECEIVED';
  payload: Answer;
};

export type LandmarkApprovedEvent = {
  type: 'LANDMARK_APPROVED';
  payload: { teamId: string };
};

export type ErrorEvent = {
  type: 'ERROR';
  payload: {
    message: string;
    code: GameErrorCode | FatalErrorCode;
  };
};

export type LeaderboardUpdateEvent = {
  type: 'LEADERBOARD_UPDATE';
  payload: LeaderboardEntry[];
};

export type SubPhaseChangedEvent = {
  type: 'SUB_PHASE_CHANGED';
  payload: {
    subPhase: ActiveGameSubPhase;
    elapsedSeconds: number;
  };
};

export type PhaseChangedEvent = {
  type: 'PHASE_CHANGED';
  payload: { phase: GamePhase; elapsedSeconds: number };
};

export type GameEndedEvent = {
  type: 'GAME_ENDED';
  payload: { finalScores: LeaderboardEntry[] };
};

export type TeamJoinedEvent = {
  type: 'TEAM_JOINED';
  payload: { teamId: string; teamName: string };
};

export type LandmarksAssignedEvent = {
  type: 'LANDMARKS_ASSIGNED';
  payload: {
    landmarks: AssignedLandmark[];
  };
};

export type LandmarkSubmittedEvent = {
  type: 'LANDMARK_SUBMITTED';
  payload: {
    status: string;
  };
};

export type GuessesRestoreEvent = {
  type: 'GUESSES_RESTORE';
  payload: {
    guesses: RestoredGuess[];
  };
};

export type QuestionHistoryRestoreEvent = {
  type: 'QUESTION_HISTORY_RESTORE';
  payload: {
    questions: PendingQuestion[];
  };
};

export type QuestionCountersResetEvent = {
  type: 'QUESTION_COUNTERS_RESET';
  payload: {
    questionsRemaining: number;
  };
};

// === События СЕРВЕР → КЛИЕНТ ===
export type ServerEvent =
  | GameStateEvent
  | TimeSyncEvent
  | HintsRevealedEvent
  | GuessResultEvent
  | QuestionReceivedEvent
  | QuestionConfirmationEvent
  | AnswerReceivedEvent
  | ErrorEvent
  | LeaderboardUpdateEvent
  | SubPhaseChangedEvent
  | PhaseChangedEvent
  | GameEndedEvent
  | TeamJoinedEvent
  | LandmarkApprovedEvent
  | LandmarksAssignedEvent
  | LandmarkSubmittedEvent
  | GuessesRestoreEvent
  | QuestionHistoryRestoreEvent
  | QuestionCountersResetEvent;
