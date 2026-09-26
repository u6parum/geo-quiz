import EventEmitter from 'events';

import { logger } from '@shared/utils/logger';

import type { HintsRevealedPayload } from '@shared/contracts/websocket/server';
import type { Answer, AnswerVariant, Question } from '@shared/contracts/question';
import type { GamePhase, ActiveGameSubPhase } from '@shared/contracts/game';
import type { Hint, HintGroup } from '@shared/contracts/landmark';

import type { EngineConfig, FinalScores, GameState, LandmarkData, TeamState } from './types';

import { calculateScore } from './scoring';

import { gameRepo } from '../db/repositories/game.repo';
import { EngineEvent, type EngineEventMap } from './events';

export class GameEngine extends EventEmitter<EngineEventMap> {
  private state: GameState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  static questionCounter: number = 3;
  static autoSaveIntervalMs: number = 30000;

  constructor(gameId: string, config: EngineConfig) {
    super();

    this.state = {
      id: gameId,
      phase: 'LOBBY',
      subPhase: 'before_hints_1',
      elapsedSeconds: 0,
      startTime: null,
      teams: new Map(),
      landmarks: new Map(),
      questions: [],
      ...config,
    };
  }

  // ==================
  // УПРАВЛЕНИЕ КОМАНДАМИ
  // ==================

  addTeam(id: string, name: string): TeamState {
    const existing = this.state.teams.get(id);

    if (existing) {
      return existing;
    }

    const team: TeamState = {
      id,
      name,
      score: 0,
      answers: [],
      questions: [],
      guesses: new Map(),
      questionsRemaining: new Map(),
    };

    // Инициализируем счётчики вопросов для каждой другой команды
    this.state.teams.forEach((other) => {
      team.questionsRemaining.set(other.id, GameEngine.questionCounter);
      other.questionsRemaining.set(id, GameEngine.questionCounter);
    });

    this.state.teams.set(id, team);

    return team;
  }

  removeTeam(id: string) {
    this.state.teams.delete(id);
  }

  // ==================
  // ЗАГАДКИ
  // ==================

  submitLandmark(teamId: string, data: LandmarkData) {
    const team = this.state.teams.get(teamId);

    if (!team) {
      throw new Error(`Команда ${teamId} не найдена`);
    }

    team.landmark = { ...data, status: 'PENDING' };

    this.emit(EngineEvent.LandmarkSubmitted, { teamId, landmark: team.landmark });
  }

  loadLandmark(teamId: string, data: LandmarkData) {
    const team = this.state.teams.get(teamId);

    if (!team) {
      throw new Error(`Команда ${teamId} не найдена`);
    }

    team.landmark = { ...data, status: 'APPROVED' };

    // Регистрируем в общем списке загадок
    this.state.landmarks.set(teamId, {
      hints: data.hints,
      name: data.name,
      teamId,
    });

    this.emit(EngineEvent.LandmarkLoaded, { teamId });
  }

  approveLandmark(teamId: string) {
    const team = this.state.teams.get(teamId);

    if (!team?.landmark) {
      throw new Error('Нет загадки для одобрения');
    }

    team.landmark.status = 'APPROVED';

    this.state.landmarks.set(teamId, {
      hints: team.landmark.hints,
      name: team.landmark.name,
      teamId,
    });

    // Если все команды одобрены — можно начинать игру
    const allApproved = Array.from(this.state.teams.values()).every((t) => t.landmark?.status === 'APPROVED');

    if (allApproved) {
      this.emit(EngineEvent.AllLandmarksApproved, { teamCount: this.state.teams.size });
    }
  }

  // ==================
  // ФАЗЫ И ТАЙМЕР
  // ==================

  startGame() {
    if (this.state.phase !== 'LOBBY' && this.state.phase !== 'MODERATION') {
      throw new Error('Игру нельзя запустить из текущей фазы');
    }

    // Одобряем все pending-загадки
    this.state.teams.forEach((team) => {
      if (team.landmark && team.landmark.status === 'PENDING') {
        this.approveLandmark(team.id);
      }
    });

    this.state.phase = 'ACTIVE';
    this.state.subPhase = 'before_hints_1';
    this.state.startTime = Date.now();
    this.state.elapsedSeconds = 0;

    this.distributeLandmarks();
    this.startTimer();

    this.emit(EngineEvent.GameStarted, {
      startTime: this.state.startTime,
      durationSeconds: this.state.durationSeconds,
      // phase: this.state.phase,
      // elapsedSeconds: this.state.elapsedSeconds,
    });

    this.emit(EngineEvent.TimeSync, {
      serverTime: Date.now(),
      elapsedSeconds: 0,
    });
  }

  private startTimer() {
    if (this.timerInterval) {
      return;
    }

    this.scheduleAutoSave();

    this.timerInterval = setInterval(() => {
      this.checkSubPhase();
      this.checkHints();
      this.checkQuestionCounters();

      this.emit(EngineEvent.TimeSync, {
        serverTime: Date.now(),
        elapsedSeconds: this.state.elapsedSeconds,
      });

      if (this.state.elapsedSeconds >= this.state.durationSeconds) {
        return this.endGame();
      }

      this.state.elapsedSeconds++;
    }, 1000);
  }

  private resumeTimer() {
    if (this.timerInterval) {
      return;
    }

    this.startTimer();
  }

  private checkSubPhase() {
    const prev = this.state.subPhase;
    const t = this.state.elapsedSeconds;
    const [h1, h2, h3] = this.state.hintsSchedule;
    const [q1, q2, q3] = this.state.questionWindows;

    let next: ActiveGameSubPhase = 'before_hints_1';

    if (t >= this.state.durationSeconds) {
      next = 'final_guessing';
    } else if (t >= h3) {
      next = 'hints_3';
    } else if (t >= q2) {
      next = 'between_2_and_3';
    } else if (t >= h2) {
      next = 'hints_2';
    } else if (t >= q1) {
      next = 'between_1_and_2';
    } else if (t >= h1) {
      next = 'hints_1';
    }

    if (prev !== next) {
      this.state.subPhase = next;
      this.emit(EngineEvent.SubPhaseChanged, {
        subPhase: next,
        elapsedSeconds: t,
      });
    }
  }

  private checkHints() {
    const t = this.state.elapsedSeconds;
    const hintGroups: [HintGroup & 1, HintGroup & 2, HintGroup & 3] = [1, 2, 3];

    hintGroups.forEach((group) => {
      if (t === this.state.hintsSchedule[group - 1]) {
        this.revealHints(group);
      }
    });
  }

  private revealHints(group: HintGroup) {
    this.state.teams.forEach((team) => {
      this.state.landmarks.forEach((landmark, landmarkTeamId) => {
        if (landmarkTeamId === team.id) {
          return;
        }

        const groupHints = landmark.hints.filter((hint) => hint.group === group);

        if (groupHints.length === 0) {
          return;
        }

        this.emit(EngineEvent.HintsRevealed, {
          forTeamId: team.id,
          targetTeamId: landmarkTeamId,
          hints: groupHints,
          group,
        });
      });
    });
  }

  private checkQuestionCounters() {
    const t = this.state.elapsedSeconds;
    const isNewHintGroup = this.state.hintsSchedule.includes(t);

    if (!isNewHintGroup) {
      return;
    }

    this.resetQuestionCounters();
  }

  private resetQuestionCounters() {
    const questionsRemaining = GameEngine.questionCounter;

    this.state.teams.forEach((team) => {
      team.questionsRemaining.forEach((_, targetTeamId) => {
        team.questionsRemaining.set(targetTeamId, questionsRemaining);
      });
    });

    // Оповещаем клиентов
    this.emit(EngineEvent.QuestionCountersReset, { questionsRemaining });
  }

  private distributeLandmarks() {
    // Для каждой команды собираем загадки всех других команд
    this.state.teams.forEach((team) => {
      const otherLandmarks = Array.from(this.state.landmarks.entries())
        .filter(([id]) => id !== team.id)
        .map(([id, _landmark]) => ({
          teamId: id,
          teamName: this.state.teams.get(id)?.name ?? 'Unknown_Team',
          landmark: { hints: [] as Hint[] },
        }));

      // Отправляем конкретной команде её набор загадок
      this.emit(EngineEvent.LandmarksAssigned, {
        forTeamId: team.id,
        landmarks: otherLandmarks,
      });
    });
  }

  private endGame() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.state.phase = 'FINISHED';

    this.emit(EngineEvent.GameEnded, {
      finalScores: this.getLeaderboard(),
    });
  }

  // ==================
  // АВТОСОХРАНЕНИЕ
  // ==================

  private scheduleAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveSnapshot().catch((err) => {
        logger.error('Ошибка сохранения снапшота', err);
      });
    }, GameEngine.autoSaveIntervalMs); // Сохранение каждые 30 секунд

    // События, при которых сохраняем состояние
    this.on(EngineEvent.GameStarted, () => this.saveSnapshot());
    this.on(EngineEvent.SubPhaseChanged, () => this.saveSnapshot());
    this.on(EngineEvent.GuessResult, () => this.saveSnapshot());
    this.on(EngineEvent.QuestionAnswered, () => this.saveSnapshot());
    this.on(EngineEvent.GameEnded, () => this.saveSnapshot());
  }

  async saveSnapshot(): Promise<void> {
    const state = this.state;

    await gameRepo.saveSnapshot(this.state.id, {
      phase: state.phase,
      subPhase: state.subPhase,
      elapsedSeconds: state.elapsedSeconds,
      startTime: state.startTime,
      durationSeconds: state.durationSeconds,
      hintsSchedule: state.hintsSchedule,
      questionWindows: state.questionWindows,
      teams: Array.from(state.teams.values()).map((team) => ({
        id: team.id,
        name: team.name,
        score: team.score,
        questionsRemaining: team.questionsRemaining,
        landmark: team.landmark,
        guesses: Object.fromEntries(team.guesses),
      })) as any[], //TODO any
      questions: state.questions as any[], //TODO any
    });
  }

  // ==================
  // ДОГАДКИ
  // ==================

  submitGuess(teamId: string, targetTeamId: string, text: string) {
    const team = this.state.teams.get(teamId);

    if (!team) {
      throw new Error('Команда не найдена');
    }

    if (this.state.phase !== 'ACTIVE') {
      throw new Error('Игра не активна');
    }

    const landmark = this.state.landmarks.get(targetTeamId);

    if (!landmark) {
      throw new Error('Загадка не найдена');
    }

    // Проверяем, не угадала ли уже команда
    const existing = team.guesses.get(targetTeamId);

    if (existing?.isCorrect) {
      throw new Error('Загадка уже угадана');
    }

    const isCorrect = text.trim().toLowerCase() === landmark.name.toLowerCase();
    const earnedScore = isCorrect ? calculateScore(this.state.elapsedSeconds, this.state.durationSeconds) : 0;

    // Сохраняем догадку
    team.guesses.set(targetTeamId, {
      isCorrect,
      earnedScore,
      elapsedAt: this.state.elapsedSeconds,
      attempts: [...(existing?.attempts ?? []), text],
    });

    if (isCorrect) {
      team.score += earnedScore;
    }

    this.emit(EngineEvent.GuessResult, {
      teamId,
      targetTeamId,
      isCorrect,
      earnedScore,
      elapsedSeconds: this.state.elapsedSeconds,
      teamScore: team.score,
    });
  }

  // ==================
  // ВОПРОСЫ
  // ==================

  async askQuestion(fromTeamId: string, toTeamId: string, text: string, questionId: string): Promise<Question> {
    if (this.state.phase !== 'ACTIVE') {
      throw new Error('Игра не активна');
    }

    const fromTeam = this.state.teams.get(fromTeamId);

    if (!fromTeam) {
      throw new Error('Команда не найдена');
    }

    const remaining = fromTeam.questionsRemaining.get(toTeamId) ?? 0;

    if (remaining <= 0) {
      throw new Error('Нет доступных вопросов для этой команды');
    }

    // Проверяем, что сейчас окно вопросов
    const isQuestionWindow =
      this.state.subPhase === 'between_1_and_2' ||
      this.state.subPhase === 'between_2_and_3' ||
      this.state.subPhase === 'before_hints_1';

    if (!isQuestionWindow) {
      throw new Error('Сейчас нельзя задавать вопросы');
    }

    const question: Question = {
      id: questionId,
      fromTeamId,
      toTeamId,
      text,
      askedAt: this.state.elapsedSeconds,
      phase: this.state.subPhase,
      answered: false,
    };

    fromTeam.questionsRemaining.set(toTeamId, remaining - 1);
    fromTeam.questions.push(question);
    this.state.questions.push(question);

    this.emit(EngineEvent.QuestionAsked, question);

    return question;
  }

  answerQuestion(teamId: string, questionId: string, answer: AnswerVariant): Answer {
    const question = this.state.questions.find((q) => q.id === questionId);

    if (!question) {
      throw new Error('Вопрос не найден');
    }

    if (question.toTeamId !== teamId) {
      throw new Error('Вопрос адресован другой команде');
    }

    if (question.answered) {
      throw new Error('На вопрос уже ответили');
    }

    const answerObj: Answer = {
      questionId,
      answer,
      fromTeamId: teamId,
      answeredAt: this.state.elapsedSeconds,
    };

    question.answered = true;

    const answeringTeam = this.state.teams.get(teamId);

    if (answeringTeam) {
      answeringTeam.answers.push(answerObj);
    }

    this.emit(EngineEvent.QuestionAnswered, answerObj);

    return answerObj;
  }

  // ==================
  // ЛИДЕРБОРД
  // ==================

  getLeaderboard(): FinalScores {
    return Array.from(this.state.teams.values())
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        score: team.score,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  // ==================
  // ВОССТАНОВЛЕНИЕ
  // ==================

  getReconnectState(teamId: string) {
    const team = this.state.teams.get(teamId);

    if (!team) {
      return null;
    }

    // Базовое состояние игры
    const gameState = {
      phase: this.state.phase,
      subPhase: this.state.subPhase,
      elapsedSeconds: this.state.elapsedSeconds,
      serverTime: Date.now(),
      teams: Array.from(this.state.teams.values()).map((t) => ({
        id: t.id,
        name: t.name,
        score: t.score,
      })),
      yourTeamId: teamId,
      questionsRemaining: team.questionsRemaining,
      config: {
        durationSeconds: this.state.durationSeconds,
        hintsSchedule: this.state.hintsSchedule,
        questionWindows: this.state.questionWindows,
      },
    };

    // Все чужие загадки
    const landmarks = Array.from(this.state.teams.entries())
      .filter(([id]) => id !== teamId)
      .map(([id, t]) => ({
        teamId: id,
        teamName: t.name,
        landmark: { hints: [] as Hint[] }, // 🔥 Пустой массив! Подсказки приходят отдельно
      }));

    // Какие подсказки уже открыты на текущий момент
    const revealedHints: HintsRevealedPayload[] = [];

    this.state.hintsSchedule.forEach((revealTime, index) => {
      if (this.state.elapsedSeconds >= revealTime) {
        const group = (index + 1) as HintGroup;

        // Для каждой чужой команды собираем подсказки этой группы
        this.state.teams.forEach((otherTeam, otherTeamId) => {
          if (otherTeamId === teamId) {
            return;
          }

          const landmark = otherTeam.landmark;

          if (!landmark || landmark.status !== 'APPROVED') {
            return;
          }

          const groupHints = landmark.hints.filter((h) => h.group === group);

          if (groupHints.length > 0) {
            revealedHints.push({
              targetTeamId: otherTeamId,
              hints: groupHints,
              group,
            });
          }
        });
      }
    });

    // Вопросы и ответы
    const questions = this.state.questions
      .filter(({ fromTeamId, toTeamId }) => fromTeamId === teamId || toTeamId === teamId)
      .map((question) => {
        const answering = this.state.teams.get(question.toTeamId);
        const answer = answering?.answers.find((a) => a.questionId === question.id) ?? null;

        return { question, answer };
      });

    // Догадки команды
    const guesses = Array.from(team.guesses.entries()).map(([targetTeamId, guess]) => ({
      targetTeamId,
      isCorrect: guess.isCorrect,
      earnedScore: guess.earnedScore,
      attempts: guess.attempts,
    }));

    return {
      gameState,
      landmarks,
      revealedHints,
      questions,
      guesses,
    };
  }

  static async restore(gameId: string): Promise<GameEngine> {
    const snapshot = await gameRepo.getLatestSnapshot(gameId);

    if (!snapshot) {
      throw new Error(`Нет снапшота для игры ${gameId}`);
    }

    const state = snapshot.state as any;

    const engine = new GameEngine(gameId, {
      durationSeconds: state.durationSeconds,
      hintsSchedule: state.hintsSchedule,
      questionWindows: state.questionWindows,
    });

    // Восстанавливаем фазу
    engine.state.phase = state.phase;
    engine.state.subPhase = state.subPhase;
    engine.state.elapsedSeconds = state.elapsedSeconds;
    engine.state.startTime = state.startTime;

    // Восстанавливаем команды
    for (const teamData of state.teams) {
      const team: TeamState = {
        id: teamData.id,
        name: teamData.name,
        score: teamData.score,
        guesses: new Map(Object.entries(teamData.guesses ?? {})),
        questionsRemaining: new Map(Object.entries(teamData.questionsRemaining ?? {}).map(([k, v]) => [k, Number(v)])),
        questions: teamData.questions ?? [],
        answers: teamData.answers ?? [],
        landmark: teamData.landmark,
      };

      engine.state.teams.set(teamData.id, team);
    }

    // Восстанавливаем вопросы
    engine.state.questions = state.questions || [];

    // Перезапускаем таймер, если игра активна
    if (engine.state.phase === 'ACTIVE') {
      engine.resumeTimer();
    }

    return engine;
  }

  // ==================
  // ГЕТТЕРЫ
  // ==================

  getState(): GameState {
    return this.state;
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getSubPhase(): ActiveGameSubPhase {
    return this.state.subPhase;
  }
}
