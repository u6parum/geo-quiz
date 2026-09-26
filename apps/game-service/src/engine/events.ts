import type {
  AssignedLandmark,
  GuessResultEvent,
  HintsRevealedPayload,
  SubPhaseChangedEvent,
} from '@shared/contracts/websocket/server';
import type { Answer, Question } from '@shared/contracts/question';

import type { FinalScores, TeamState } from './types';

export enum EngineEvent {
  TimeSync = 'time_sync',
  SubPhaseChanged = 'sub_phase_changed',
  HintsRevealed = 'hints_revealed',
  GuessResult = 'guess_result',
  QuestionAsked = 'question_asked',
  QuestionAnswered = 'question_answered',
  GameStarted = 'game_started',
  GameEnded = 'game_ended',
  LandmarksAssigned = 'landmarks_assigned',
  LandmarkSubmitted = 'landmark_submitted',
  LandmarkLoaded = 'landmark_loaded',
  AllLandmarksApproved = 'all_landmarks_approved',
  QuestionCountersReset = 'question_counters_reset',
}

/**
 * Карта событий движка: событие → аргументы слушателя.
 * Используется как generic-параметр EventEmitter, поэтому on/emit/once проверяют payload.
 */
export interface EngineEventMap {
  [EngineEvent.TimeSync]: [payload: { serverTime: number; elapsedSeconds: number }];
  [EngineEvent.SubPhaseChanged]: [payload: SubPhaseChangedEvent['payload']];
  [EngineEvent.HintsRevealed]: [payload: HintsRevealedPayload & { forTeamId: string }];
  [EngineEvent.GuessResult]: [payload: GuessResultEvent['payload'] & { teamId: string }];
  [EngineEvent.QuestionAsked]: [payload: Question];
  [EngineEvent.QuestionAnswered]: [payload: Answer];
  [EngineEvent.GameStarted]: [payload: { startTime: number; durationSeconds: number }];
  [EngineEvent.GameEnded]: [payload: { finalScores: FinalScores }];
  [EngineEvent.LandmarksAssigned]: [payload: { forTeamId: string; landmarks: AssignedLandmark[] }];
  [EngineEvent.LandmarkSubmitted]: [payload: { teamId: string; landmark: NonNullable<TeamState['landmark']> }];
  [EngineEvent.LandmarkLoaded]: [payload: { teamId: string }];
  [EngineEvent.AllLandmarksApproved]: [payload: { teamCount: number }];
  [EngineEvent.QuestionCountersReset]: [payload: { questionsRemaining: number }];
}
