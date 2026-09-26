import type { GamePhase, ActiveGameSubPhase } from '@shared/contracts/game';
import type { Landmark, LandmarkStatus } from '@shared/contracts/landmark';
import type { Question, Answer } from '@shared/contracts/question';
import type { ScoreBreakdown } from '@shared/contracts/scoring';

export type LandmarkData = Pick<Landmark, 'description' | 'hints' | 'name'>;
export type LandmarkStateData = Pick<Landmark, 'teamId' | 'hints' | 'name'>;

export interface TeamState {
  id: string;
  name: string;
  score: number;
  landmark?: LandmarkData & { status: LandmarkStatus };
  guesses: Map<
    string,
    {
      isCorrect: boolean;
      earnedScore: number;
      elapsedAt: number;
      attempts: string[];
      breakdown: ScoreBreakdown | null;
    }
  >;
  questionsRemaining: Map<string, number>; // teamId → сколько вопросов осталось
  questions: Question[];
  answers: Answer[];
}

export interface GameState {
  id: string;
  phase: GamePhase;
  subPhase: ActiveGameSubPhase;
  elapsedSeconds: number;
  startTime: number | null;
  durationSeconds: number;
  hintsSchedule: number[];
  questionWindows: number[];
  teams: Map<string, TeamState>;
  landmarks: Map<string, LandmarkStateData>;
  questions: Question[];
}

export interface EngineConfig {
  durationSeconds: number;
  hintsSchedule: number[]; // [0, 40, 80]
  questionWindows: number[]; // [20, 60, 100]
}

export interface FinalScore {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
}

export type FinalScores = FinalScore[];
