import type { Event } from 'effector';

import type {
  ServerEvent,
  TimeSyncEvent,
  HintsRevealedEvent,
  GuessResultEvent,
  GameEndedEvent,
  ErrorEvent,
  LeaderboardUpdateEvent,
  GameStateEvent,
  QuestionReceivedEvent,
  AnswerReceivedEvent,
  PhaseChangedEvent,
  SubPhaseChangedEvent,
  LandmarksAssignedEvent,
  GuessesRestoreEvent,
  QuestionHistoryRestoreEvent,
  QuestionCountersResetEvent,
  TeamJoinedEvent,
} from '@shared/contracts';

type Payload<T extends ServerEvent> = T['payload'];

// === ТИПЫ ДЛЯ СОБЫТИЙ ОТ СЕРВЕРА ===
export interface ServerEvents {
  timeSyncReceived: Event<Payload<TimeSyncEvent>>;
  hintsRevealedReceived: Event<Payload<HintsRevealedEvent>>;
  guessResultReceived: Event<Payload<GuessResultEvent>>;
  leaderboardReceived: Event<Payload<LeaderboardUpdateEvent>>;
  phaseChangeReceived: Event<Payload<PhaseChangedEvent>>;
  subPhaseChangeReceived: Event<Payload<SubPhaseChangedEvent>>;
  gameEnded: Event<Payload<GameEndedEvent>>;
  errorReceived: Event<Payload<ErrorEvent>>;
  gameStateReceived: Event<Payload<GameStateEvent>>;
  questionReceived: Event<Payload<QuestionReceivedEvent>>;
  answerReceived: Event<Payload<AnswerReceivedEvent>>;
  landmarksAssigned: Event<Payload<LandmarksAssignedEvent>>;
  guessesRestore: Event<Payload<GuessesRestoreEvent>>;
  questionHistoryRestore: Event<Payload<QuestionHistoryRestoreEvent>>;
  questionCountersReset: Event<Payload<QuestionCountersResetEvent>>;
  teamJoined: Event<Payload<TeamJoinedEvent>>;
}
