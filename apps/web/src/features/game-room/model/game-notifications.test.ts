import { afterEach, describe, expect, it } from 'vitest';
import { createEvent } from 'effector';

import type {
  AnswerReceivedEvent,
  ErrorEvent,
  GameEndedEvent,
  GameStateEvent,
  GuessResultEvent,
  PhaseChangedEvent,
  QuestionReceivedEvent,
  SubPhaseChangedEvent,
} from '@shared/contracts';

import { $toasts, toastDismissed } from '../../notifications/model';
import { createGameNotifications } from './game-notifications';

type Payload<T extends { payload: unknown }> = T['payload'];

const setup = () => {
  const serverEvents = {
    gameStateReceived: createEvent<Payload<GameStateEvent>>(),
    phaseChangeReceived: createEvent<Payload<PhaseChangedEvent>>(),
    subPhaseChangeReceived: createEvent<Payload<SubPhaseChangedEvent>>(),
    guessResultReceived: createEvent<Payload<GuessResultEvent>>(),
    questionReceived: createEvent<Payload<QuestionReceivedEvent>>(),
    answerReceived: createEvent<Payload<AnswerReceivedEvent>>(),
    gameEnded: createEvent<Payload<GameEndedEvent>>(),
    errorReceived: createEvent<Payload<ErrorEvent>>(),
  };

  createGameNotifications({ serverEvents });

  serverEvents.gameStateReceived({
    phase: 'ACTIVE',
    subPhase: 'hints_1',
    elapsedSeconds: 100,
    serverTime: 0,
    yourTeamId: 'a',
    teams: [
      { id: 'a', name: 'Альфа', score: 0 },
      { id: 'b', name: 'Бета', score: 0 },
    ],
    config: { durationSeconds: 600, hintsSchedule: [60, 180, 300], questionWindows: [120, 240] },
  } as Payload<GameStateEvent>);

  return serverEvents;
};

const toasts = () => $toasts.getState().map(({ type, text }) => ({ type, text }));

describe('уведомления об игровых событиях', () => {
  afterEach(() => {
    $toasts.getState().forEach((t) => toastDismissed(t.id));
  });

  it('GAME_STATE (в том числе при переподключении) уведомлений не создаёт', () => {
    setup();

    expect(toasts()).toEqual([]);
  });

  it('старт игры: PHASE_CHANGED в фазу ACTIVE', () => {
    const events = setup();

    events.phaseChangeReceived({ phase: 'ACTIVE', elapsedSeconds: 0 });

    expect(toasts()).toEqual([{ type: 'success', text: 'Игра началась!' }]);
  });

  it('смена фазы не на ACTIVE уведомления не даёт', () => {
    const events = setup();

    events.phaseChangeReceived({ phase: 'MODERATION', elapsedSeconds: 0 });

    expect(toasts()).toEqual([]);
  });

  it('открытие группы подсказок и окна вопросов', () => {
    const events = setup();

    events.subPhaseChangeReceived({ subPhase: 'hints_2', elapsedSeconds: 180 });
    expect(toasts()).toEqual([{ type: 'info', text: 'Открыта 2-я группа подсказок' }]);

    events.subPhaseChangeReceived({ subPhase: 'between_2_and_3', elapsedSeconds: 240 });
    expect(toasts()).toEqual([{ type: 'info', text: 'Открыто окно вопросов: можно задавать вопросы другим командам' }]);
  });

  it('подфаза before_hints_1 уведомления не даёт', () => {
    const events = setup();

    events.subPhaseChangeReceived({ subPhase: 'before_hints_1', elapsedSeconds: 0 });

    expect(toasts()).toEqual([]);
  });

  it('результат догадки: верно и неверно', () => {
    const events = setup();
    const base = { targetTeamId: 'b', elapsedSeconds: 10, teamScore: 0 };

    events.guessResultReceived({ ...base, isCorrect: true, earnedScore: 80 });
    events.guessResultReceived({ ...base, isCorrect: false, earnedScore: 0 });

    expect(toasts()).toEqual([
      { type: 'success', text: 'Верно! Загадка команды «Бета»: +80 очков' },
      { type: 'warning', text: 'Неверно. Загадка команды «Бета»' },
    ]);
  });

  it('вопрос и ответ подставляют имя команды', () => {
    const events = setup();

    events.questionReceived({
      id: 'q1',
      fromTeamId: 'b',
      toTeamId: 'a',
      text: '?',
      askedAt: 1,
      phase: 'between_1_and_2',
      answered: false,
    });
    events.answerReceived({ questionId: 'q1', answer: 'yes', fromTeamId: 'b', answeredAt: 2 });

    expect(toasts()).toEqual([
      { type: 'info', text: 'Команда «Бета» задала вам вопрос' },
      { type: 'info', text: 'Команда «Бета» ответила на ваш вопрос' },
    ]);
  });

  it('неизвестная команда не ломает текст', () => {
    const events = setup();

    events.guessResultReceived({
      targetTeamId: 'unknown',
      isCorrect: false,
      earnedScore: 0,
      elapsedSeconds: 1,
      teamScore: 0,
    });

    expect(toasts()).toEqual([{ type: 'warning', text: 'Неверно. Загадка команды «другой команды»' }]);
  });

  it('конец игры', () => {
    const events = setup();

    events.gameEnded({ finalScores: [] });

    expect(toasts()).toEqual([{ type: 'info', text: 'Игра завершена' }]);
  });

  it('обычные ошибки показываются, фатальные — нет', () => {
    const events = setup();

    events.errorReceived({ code: 'GUESS_ERROR', message: 'Загадка уже угадана' });
    events.errorReceived({ code: 'DUPLICATE_CONNECTION', message: 'Команда уже в игре' });
    events.errorReceived({ code: 'UNAUTHORIZED', message: 'Нет доступа' });

    expect(toasts()).toEqual([{ type: 'error', text: 'Загадка уже угадана' }]);
  });
});
