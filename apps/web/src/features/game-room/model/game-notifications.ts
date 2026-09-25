import { createStore, sample } from 'effector';
import type { ActiveGameSubPhase } from '@shared/contracts';

import { notify, type NotifyParams } from '../../notifications';
import type { ServerEvents } from './types';

type NotificationEvents = Pick<
  ServerEvents,
  | 'gameStateReceived'
  | 'phaseChangeReceived'
  | 'subPhaseChangeReceived'
  | 'guessResultReceived'
  | 'questionReceived'
  | 'answerReceived'
  | 'gameEnded'
  | 'errorReceived'
>;

interface GameNotificationsParams {
  serverEvents: NotificationEvents;
}

/* Ошибки, о которых сообщаем тостом. Фатальные закрываются полноэкранными заглушками на странице игры */
const GAME_ERROR_CODES: readonly string[] = ['QUESTION_ERROR', 'GUESS_ERROR', 'ANSWER_ERROR', 'PARSE_ERROR'];

const SUB_PHASE_NOTIFICATIONS: Partial<Record<ActiveGameSubPhase, NotifyParams>> = {
  hints_1: { type: 'info', text: 'Открыта 1-я группа подсказок', dedupeKey: 'sub-phase' },
  hints_2: { type: 'info', text: 'Открыта 2-я группа подсказок', dedupeKey: 'sub-phase' },
  hints_3: { type: 'info', text: 'Открыта 3-я группа подсказок', dedupeKey: 'sub-phase' },
  between_1_and_2: {
    type: 'info',
    text: 'Открыто окно вопросов: можно задавать вопросы другим командам',
    dedupeKey: 'sub-phase',
  },
  between_2_and_3: {
    type: 'info',
    text: 'Открыто окно вопросов: можно задавать вопросы другим командам',
    dedupeKey: 'sub-phase',
  },
  final_guessing: { type: 'warning', text: 'Последний шанс угадать!', dedupeKey: 'sub-phase' },
};

/**
 * Превращает игровые события сервера во всплывающие уведомления игрока.
 * Восстановительные события (GAME_STATE, GUESSES_RESTORE и т. п.) уведомлений не создают —
 * иначе при переподключении игрок получил бы «повтор» всего, что уже видел.
 */
export function createGameNotifications({ serverEvents }: GameNotificationsParams) {
  // В событиях только teamId — имена берём из списка команд игры
  const $teamNames = createStore<Record<string, string>>({}).on(serverEvents.gameStateReceived, (_, { teams }) =>
    Object.fromEntries(teams.map((team) => [team.id, team.name])),
  );

  const teamName = (names: Record<string, string>, teamId: string) => names[teamId] ?? 'другой команды';

  /* Начало игры */
  sample({
    clock: serverEvents.phaseChangeReceived,
    filter: ({ phase }) => phase === 'ACTIVE',
    fn: (): NotifyParams => ({ type: 'success', text: 'Игра началась!' }),
    target: notify,
  });

  /* Открытие подсказок, окон вопросов, финал. Берём подфазу, а не HINTS_REVEALED: тот приходит по разу на каждую чужую загадку */
  sample({
    clock: serverEvents.subPhaseChangeReceived.filterMap(({ subPhase }) => SUB_PHASE_NOTIFICATIONS[subPhase]),
    target: notify,
  });

  sample({
    clock: serverEvents.guessResultReceived,
    source: $teamNames,
    fn: (names, { targetTeamId, isCorrect, earnedScore }): NotifyParams => {
      const name = teamName(names, targetTeamId);

      return isCorrect
        ? { type: 'success', text: `Верно! Загадка команды «${name}»: +${earnedScore} очков` }
        : { type: 'warning', text: `Неверно. Загадка команды «${name}»` };
    },
    target: notify,
  });

  sample({
    clock: serverEvents.questionReceived,
    source: $teamNames,
    fn: (names, { fromTeamId }): NotifyParams => ({
      type: 'info',
      text: `Команда «${teamName(names, fromTeamId)}» задала вам вопрос`,
    }),
    target: notify,
  });

  sample({
    clock: serverEvents.answerReceived,
    source: $teamNames,
    fn: (names, { fromTeamId }): NotifyParams => ({
      type: 'info',
      text: `Команда «${teamName(names, fromTeamId)}» ответила на ваш вопрос`,
    }),
    target: notify,
  });

  sample({
    clock: serverEvents.gameEnded,
    fn: (): NotifyParams => ({ type: 'info', text: 'Игра завершена' }),
    target: notify,
  });

  sample({
    clock: serverEvents.errorReceived,
    filter: ({ code }) => GAME_ERROR_CODES.includes(code),
    fn: ({ message }): NotifyParams => ({ type: 'error', text: message }),
    target: notify,
  });

  return { $teamNames };
}
