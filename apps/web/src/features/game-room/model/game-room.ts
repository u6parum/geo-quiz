import { sample, createStore, createEvent, createEffect, type Event } from 'effector';

import type {
  GamePhase,
  ActiveGameSubPhase,
  LeaderboardEntry,
  TeamPublicInfo,
  Hint,
  ClientEvent,
  AdminStartGameEvent,
  Question,
  Answer,
  AssignedLandmark,
  GameStatePayload,
  RestoredGuess,
  PendingQuestion,
} from '@shared/contracts';

import type { ServerEvents } from './types';
import { createTeamSession, type TeamSession } from './team-session';

interface GameRoomParams {
  startGameEvent: Event<unknown>;
  serverEvents: ServerEvents;
  localTeamId: string; // ID нашей команды
}

export function createGameRoom(params: GameRoomParams) {
  const { startGameEvent, serverEvents, localTeamId } = params;

  // === СОБЫТИЯ КОМАНДЫ ===
  const sendMessage = createEvent<ClientEvent>(); // Отправка сообщений через сокет

  const $connectionError = createStore<string | null>(null); // Стор для ошибки дубликата

  /* Конфиг игры */
  const $config = createStore<GameStatePayload['config']>({
    durationSeconds: 0,
    hintsSchedule: [],
    questionWindows: [],
  }).on(serverEvents.gameStateReceived, (_, { config }) => config);

  // === ФАЗЫ ИГРЫ ===
  const $phase = createStore<GamePhase>('LOBBY')
    .on([serverEvents.gameStateReceived, serverEvents.phaseChangeReceived], (_, { phase }) => phase)
    .on(serverEvents.gameEnded, () => 'FINISHED');
  const $subPhase = createStore<ActiveGameSubPhase>('before_hints_1')
    .on([serverEvents.gameStateReceived, serverEvents.subPhaseChangeReceived], (_, { subPhase }) => subPhase)
    .on(serverEvents.gameEnded, () => 'final_guessing');
  const $elapsedSeconds = createStore(0).on(serverEvents.timeSyncReceived, (_, { elapsedSeconds }) => elapsedSeconds);

  // === КОМАНДЫ (только мета-информация) ===
  const $teams = createStore<TeamSession[]>([]);
  const $currentTeam = createStore<TeamSession | null>(null);

  /* serverEvents.errorReceived */
  sample({
    clock: serverEvents.errorReceived,
    fn: (error) => (error.code === 'DUPLICATE_CONNECTION' ? error.message : null),
    target: $connectionError,
  });

  /* На gameStateReceived - создаем локальные сессии */
  sample({
    clock: serverEvents.gameStateReceived,
    source: $teams,
    filter: (teams, { teams: incomingTeams }) => teams.length === 0 && incomingTeams.length > 0, // Для первого непустого GAME_STATE
    fn: (_, state) => {
      return state.teams
        .filter((team) => team.id !== localTeamId) // Не текущая команда
        .map((team) =>
          createTeamSession({
            teamId: team.id,
            teamName: team.name,
            allTeams: state.teams.map((t) => ({ id: t.id, name: t.name })),
            gameConfig: {
              durationSeconds: state.config.durationSeconds,
              hintsSchedule: state.config.hintsSchedule,
            },
          }),
        );
    },
    target: $teams,
  });

  /* Создаем свою сессию в отдельном сторе */
  sample({
    clock: serverEvents.gameStateReceived,
    source: $currentTeam,
    filter: (team, state) => !team && state.teams.some((t) => t.id === localTeamId),
    fn: (_, state) => {
      const myInfo = state.teams.find((t: TeamPublicInfo) => t.id === localTeamId)!;

      return createTeamSession({
        teamId: myInfo.id,
        teamName: myInfo.name,
        allTeams: state.teams.map((t) => ({ id: t.id, name: t.name })),
        gameConfig: {
          durationSeconds: state.config.durationSeconds,
          hintsSchedule: state.config.hintsSchedule,
        },
      });
    },
    target: $currentTeam,
  });

  /* При рыскрытии группы подсказок - добавляем их в нужную guessing-сессию */
  const hintsRevealedFx = createEffect(
    ({ team, targetTeamId, hints }: { team: TeamSession; targetTeamId: string; hints: Hint[] }) => {
      const guessingSession = team.getGuessingSession(targetTeamId);

      if (guessingSession) {
        // 🔥 Обновляем подсказки в guessing-сессии
        // Для этого в createGuessingSession нужно добавить событие addHints
        hints.forEach((hint) => {
          guessingSession.addHint(hint);
        });
      }
    },
  );

  sample({
    clock: serverEvents.hintsRevealedReceived,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { targetTeamId, hints }) => ({
      team: team!,
      targetTeamId,
      hints,
    }),
    target: hintsRevealedFx,
  });

  /* */

  /* При получении результата догадки - обновляем guessing-сессию и помечаем ее как выполненную, если догадка верная */
  const guessResultReceivedFx = createEffect(
    ({
      team,
      targetTeamId,
      isCorrect,
      earnedScore,
    }: {
      team: TeamSession;
      targetTeamId: string;
      isCorrect: boolean;
      earnedScore: number;
    }) => {
      const session = team.getGuessingSession(targetTeamId);

      if (session && isCorrect) {
        session.markCompleted(earnedScore);
      }
    },
  );

  sample({
    clock: serverEvents.guessResultReceived,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, result) => ({ team: team!, ...result }),
    target: guessResultReceivedFx,
  });

  /* */

  /* При получении вопроса от другой команды - передаем его в нашу team-сессию */
  const questionReceivedFx = createEffect(({ team, question }: { team: TeamSession; question: Question }) => {
    team.incomingQuestion(question);
  });

  sample({
    clock: serverEvents.questionReceived,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, question) => ({ team: team!, question }),
    target: questionReceivedFx,
  });

  /* */

  /* При получении ответа от другой команды на наш вопрос - передаем его в нашу team-сессию */
  const answerReceivedFx = createEffect(({ team, answer }: { team: TeamSession; answer: Answer }) => {
    team.answerReceived(answer);
  });

  sample({
    clock: serverEvents.answerReceived,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, answer) => ({ team: team!, answer }),
    target: answerReceivedFx,
  });

  // Старт игры (из админки)
  sample({
    clock: startGameEvent,
    fn: () => ({ type: 'ADMIN_START_GAME', payload: {} }) as AdminStartGameEvent,
    target: sendMessage,
  });

  // === ЛИДЕРБОРД ===
  const $leaderboard = createStore<LeaderboardEntry[]>([]);

  sample({
    clock: serverEvents.leaderboardReceived,
    target: $leaderboard,
  });

  sample({
    clock: serverEvents.gameEnded,
    fn: ({ finalScores }) => finalScores,
    target: $leaderboard,
  });

  /* При получении загадок — создаём GuessingSession для каждой */
  const landmarksAssignedFx = createEffect(
    ({ team, landmarks }: { team: TeamSession; landmarks: AssignedLandmark[] }) => {
      landmarks.forEach((landmark: AssignedLandmark) => {
        // Вызываем registerEnemyLandmark для каждой чужой загадки
        team.registerEnemyLandmark({
          teamId: landmark.teamId,
          teamName: landmark.teamName,
          landmark: {
            hints: landmark.landmark.hints,
          },
        });
      });

      console.log(`Создано ${landmarks.length} guessing-сессий`);
    },
  );

  sample({
    clock: serverEvents.landmarksAssigned,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { landmarks }) => ({ team: team!, landmarks }),
    target: landmarksAssignedFx,
  });

  /* */

  /* При переподключении восстанавливаем догадки */
  const guessesRestoreFx = createEffect(({ team, guesses }: { team: TeamSession; guesses: RestoredGuess[] }) => {
    guesses.forEach((guess) => {
      const session = team.getGuessingSession(guess.targetTeamId);

      if (session) {
        // Восстанавливаем попытки
        guess.attempts.forEach((text) => {
          // Добавляем в историю
          session.addFailedAttempt(text);
        });

        // Если угадано — отмечаем
        if (guess.isCorrect) {
          session.markCompleted(guess.earnedScore);
        }
      }
    });
  });

  sample({
    clock: serverEvents.guessesRestore,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { guesses }) => ({ team: team!, guesses }),
    target: guessesRestoreFx,
  });

  /* */

  /* Восстанавливаем историю вопросов и ответов */
  const restoreQuestionsHistoryFx = createEffect(
    ({ team, questions }: { team: TeamSession; questions: PendingQuestion[] }) => {
      team.restoreQuestionHistory(questions);
    },
  );

  sample({
    clock: serverEvents.questionHistoryRestore,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { questions }) => ({ team: team!, questions }),
    target: restoreQuestionsHistoryFx,
  });

  /* */

  /* Сброс счетчиков вопросов */
  const questionCountersResetFx = createEffect(
    ({ team, questionsRemaining }: { team: TeamSession; questionsRemaining: number }) => {
      team.resetQuestionsRemaining(questionsRemaining);
    },
  );

  sample({
    clock: serverEvents.questionCountersReset,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { questionsRemaining }) => ({ team: team!, questionsRemaining }),
    target: questionCountersResetFx,
  });

  /* */

  //TODO: Убрать, т.к. нет добавления команд в процессе игры
  const teamJoinedFx = createEffect(
    ({ team, teamId, teamName }: { team: TeamSession; teamId: string; teamName: string }) => {
      team.registerNewTeam({ id: teamId, name: teamName });
    },
  );

  sample({
    clock: serverEvents.teamJoined,
    source: $currentTeam,
    filter: (team) => !!team,
    fn: (team, { teamId, teamName }) => ({ team: team!, teamId, teamName }),
    target: teamJoinedFx,
  });

  // === ЭКСПОРТ ===
  return {
    // События
    sendMessage,

    // Состояние
    $phase,
    $subPhase,
    $elapsedSeconds,
    $teams,
    $currentTeam,
    $leaderboard,

    $connectionError,

    // Конфиг
    $config,
  };
}
