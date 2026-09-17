import type { ServerEvents } from '../../game-room';
import type { CreateSocketConnection } from './socket.factory';

export function mapEventsToSocket(socket: CreateSocketConnection): ServerEvents {
  return {
    gameStateReceived: socket.gameStateReceived,
    timeSyncReceived: socket.timeSyncReceived,
    hintsRevealedReceived: socket.hintsRevealedReceived,
    guessResultReceived: socket.guessResultReceived,
    questionReceived: socket.questionReceived,
    answerReceived: socket.answerReceived,
    leaderboardReceived: socket.leaderboardReceived,
    gameEnded: socket.gameEndedReceived,
    errorReceived: socket.errorReceived,
    phaseChangeReceived: socket.phaseChangeReceived,
    subPhaseChangeReceived: socket.subPhaseChangeReceived,
    landmarksAssigned: socket.landmarksAssigned,
    guessesRestore: socket.guessesRestore,
    questionHistoryRestore: socket.questionHistoryRestore,
    questionCountersReset: socket.questionCountersReset,
    teamJoined: socket.teamJoinedReceived,
  };
}
