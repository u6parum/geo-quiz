import { createEffect, createEvent, createStore, sample } from 'effector';
import type {
  Landmark,
  Question,
  Answer,
  GameConfig,
  AskQuestionEvent,
  AnswerQuestionEvent,
  ClientEvent,
  PendingQuestion,
  OutgoingQuestion,
  TeamBase,
} from '@shared/contracts';
import type { GuessingSession } from './guessing-session';
import { createGuessingSession } from './guessing-session';

type TeamSessionParams = {
  teamId: string;
  teamName: string;
  allTeams: TeamBase[];
  gameConfig: Pick<GameConfig, 'durationSeconds' | 'hintsSchedule'>;
};

type EnemyLandmarkData = {
  teamId: string;
  teamName: string;
  landmark: Pick<Landmark, 'hints'>;
};

export const createTeamSession = (params: TeamSessionParams) => {
  const { teamId, teamName, gameConfig, allTeams } = params;

  const sendToServer = createEvent<ClientEvent>(); // Событие-триггер для отправки в сокет
  const registerEnemyLandmark = createEvent<EnemyLandmarkData>(); // Событие: когда сервер присылает загадку другой команды
  const addGuessingSession = createEvent<GuessingSession>();

  const $guessingSessions = createStore<Map<string, GuessingSession>>(new Map());

  // При создании guessing-сессии - добавляем ее в список сессий
  $guessingSessions.on(addGuessingSession, (sessions, newSession) => {
    const newSessions = new Map(sessions);

    newSessions.set(newSession.targetTeamId, newSession);

    return newSessions;
  });

  /* Связываем guessing-сессию с sendToServer сокета */
  const subscribeGuessingSessionToSocketFx = createEffect((session: GuessingSession) => {
    sample({
      clock: session.sendToServer,
      target: sendToServer,
    });
  });

  // Создаем новую guessing-сессию при регистрации вражеской загадки
  sample({
    clock: registerEnemyLandmark,
    source: $guessingSessions,
    filter: (sessions, { teamId }) => !sessions.has(teamId),
    fn: (_, { teamId, teamName, landmark }) =>
      createGuessingSession(teamId, teamName, {
        hints: landmark.hints,
        hintsSchedule: gameConfig.hintsSchedule,
        totalDuration: gameConfig.durationSeconds,
      }),
    target: [addGuessingSession, subscribeGuessingSessionToSocketFx],
  });

  // ======= ВОПРОСЫ =======
  const resetQuestionsRemaining = createEvent<number>(); // Событие: сброс счётчиков вопросов при новой группе подсказок
  const restoreQuestionHistory = createEvent<PendingQuestion[]>();
  const askQuestion = createEvent<Pick<Question, 'toTeamId' | 'text'>>(); // событие «команда хочет задать вопрос»
  const questionAsked = createEvent<OutgoingQuestion[]>(); // событие «команда задала вопрос»
  const incomingQuestion = createEvent<Question>(); // событие «команде пришёл вопрос»
  const answerQuestion = createEvent<Pick<Answer, 'questionId' | 'answer'>>(); // событие «команда хочет ответить на вопрос»
  const answerReceived = createEvent<Answer>(); // событие «команда получила ответ» (для цепочки назад)
  const answerGiven = createEvent<Answer>(); // событие «команда ответила на вопрос»

  const $questionsRemaining = createStore<Map<string, number>>(
    new Map(allTeams.filter((t) => t.id !== teamId).map((t) => [t.id, 3])),
  );
  const $incomingQuestions = createStore<Question[]>([]); // стор с входящими вопросами
  const $outgoingQuestions = createStore<OutgoingQuestion[]>([]); // стор с исходящими вопросами

  /* При получении ответа от другой команды - обновляем связанный исходящий вопрос */
  sample({
    clock: answerReceived,
    source: $outgoingQuestions,
    fn: (outgoing, answer) =>
      outgoing.map((question) =>
        question.id === answer.questionId
          ? {
              ...question,
              answer: answer.answer,
              status: 'answered' as const,
            }
          : question,
      ),
    target: $outgoingQuestions,
  });

  /* При получении вопроса - добавляем его в список входящих вопросов */
  sample({
    clock: incomingQuestion,
    source: $incomingQuestions,
    fn: (questions, question) => [...questions, question],
    target: $incomingQuestions,
  });

  /* На askQuestion - проверяем, что можем задать вопрос команде и создаем исходящий вопрос */
  sample({
    clock: askQuestion,
    source: {
      remaining: $questionsRemaining,
      outgoing: $outgoingQuestions,
    },
    filter: ({ remaining }, { toTeamId }) => (remaining.get(toTeamId) || 0) > 0, // Есть ли вопросы этой команде?
    fn: ({ outgoing }, { toTeamId, text }) => [
      ...outgoing,
      {
        id: crypto.randomUUID(), // Генерим айдишник вопроса на фронте для простоты
        toTeamId,
        text,
        askedAt: Date.now(),
        status: 'pending' as const,
      },
    ],
    target: [$outgoingQuestions, questionAsked],
  });

  /* На questionAsked - отправляем сообщение серверу, что мы задали вопрос */
  sample({
    clock: questionAsked,
    source: $outgoingQuestions,
    fn: (outgoing) => {
      const { id: questionId, text, toTeamId } = outgoing.at(-1) ?? { id: '', toTeamId: '', text: '' };

      return {
        type: 'ASK_QUESTION',
        payload: { toTeamId, text, questionId },
      } as AskQuestionEvent;
    },
    target: sendToServer,
  });

  /* На askQuestion - уменьшаем счетчик вопросов для целевой команды */
  sample({
    clock: askQuestion,
    source: $questionsRemaining,
    fn: (remaining, { toTeamId }) => {
      const currentCount = remaining.get(toTeamId) || 0;
      const newRemaining = new Map(remaining);

      // 🔥 Уменьшаем счётчик для конкретной команды
      newRemaining.set(toTeamId, currentCount - 1);

      return newRemaining;
    },
    target: $questionsRemaining,
  });

  /* На resetQuestionsRemaining - устанавливаем для них дефолтные значения */
  sample({
    clock: resetQuestionsRemaining,
    source: $questionsRemaining,
    fn: (map, defaultValue) => {
      const newRemaining = new Map(map);

      // Сбрасываем все значения на defaultValue
      for (const key of newRemaining.keys()) {
        newRemaining.set(key, defaultValue);
      }

      return newRemaining;
    },
    target: $questionsRemaining,
  });

  // При ответе на вопрос - формируем ответ и триггерим answerGiven
  sample({
    clock: answerQuestion,
    fn: ({ questionId, answer }) => {
      const newAnswer: Answer = {
        questionId,
        answer,
        fromTeamId: teamId,
        answeredAt: Date.now(),
      };

      return newAnswer;
    },
    target: answerGiven,
  });

  // На answerGiven - отправляем сообщение серверу, что мы дали ответ на вопрос
  sample({
    clock: answerGiven,
    fn: ({ questionId, answer }) =>
      ({
        type: 'ANSWER_QUESTION',
        payload: { questionId, answer },
      }) as AnswerQuestionEvent,
    target: sendToServer,
  });

  // Когда дали ответ на вопрос - помечаем его как отвеченный
  $incomingQuestions.on(answerGiven, (questions, { questionId }) =>
    questions.map((q) => (q.id === questionId ? { ...q, answered: true } : q)),
  );

  /* При восстановлении истории вопросов - заполняем список вопросов, заданных нам */
  sample({
    clock: restoreQuestionHistory,
    fn: (allQuestions) => {
      const incoming: Question[] = [];

      allQuestions.forEach(({ question }) => {
        // 🔥 Входящие — адресованы НАМ
        if (question.toTeamId === teamId) {
          incoming.push(question);
        }
      });

      return incoming;
    },
    target: $incomingQuestions,
  });

  /* При восстановлении истории вопросов - заполняем список вопросов, заданных нами */
  sample({
    clock: restoreQuestionHistory,
    fn: (allQuestions) => {
      const outgoing: OutgoingQuestion[] = [];

      allQuestions.forEach(({ question, answer }) => {
        // 🔥 Исходящие — заданы НАМИ
        if (question.fromTeamId === teamId) {
          outgoing.push({
            id: question.id,
            toTeamId: question.toTeamId,
            text: question.text,
            askedAt: question.askedAt,
            status: question.answered ? 'answered' : 'pending',
            answer: answer?.answer,
          });
        }
      });

      return outgoing;
    },
    target: $outgoingQuestions,
  });

  /* При восстановлении истории вопросов - восстанавливаем счетчики вопросов для каждой команды */
  sample({
    clock: restoreQuestionHistory,
    fn: (allQuestions) => {
      const newRemaining = new Map<string, number>();

      allTeams.filter((t) => t.id !== teamId).forEach((t) => newRemaining.set(t.id, 3));

      // Вычитаем уже заданные вопросы
      allQuestions.forEach(({ question }) => {
        if (question.fromTeamId === teamId) {
          const current = newRemaining.get(question.toTeamId) || 3;

          newRemaining.set(question.toTeamId, Math.max(0, current - 1));
        }
      });

      return newRemaining;
    },
    target: $questionsRemaining,
  });

  /* TODO: Это убрать, поскольку команды не добавляются "на лету". Список команд всегда известен с самого начала */
  const registerNewTeam = createEvent<{ id: string; name: string }>();

  sample({
    clock: registerNewTeam,
    source: $questionsRemaining,
    filter: (remaining, { id }) => !remaining.has(id),
    fn: (remaining, { id }) => {
      const newRemaining = new Map(remaining);

      newRemaining.set(id, 3); // Начальное значение для новой команды

      return newRemaining;
    },
    target: $questionsRemaining,
  });
  /* TODO */

  // ======= ЭКСПОРТ =======
  return {
    // Мета
    teamId,
    teamName,

    // Чужие загадки
    registerEnemyLandmark,

    // Сессии угадывания
    $guessingSessions,
    getAllGuessingSessions: () => [...$guessingSessions.getState().values()],
    getGuessingSession: (teamId: string) => $guessingSessions.getState().get(teamId),

    // Вопросы
    $questionsRemaining,
    $incomingQuestions,
    $outgoingQuestions,
    incomingQuestion,
    answerQuestion,
    answerReceived,
    askQuestion,
    restoreQuestionHistory,
    resetQuestionsRemaining,
    registerNewTeam,

    sendToServer,
  };
};

export type TeamSession = ReturnType<typeof createTeamSession>;
