import { prisma } from '../prisma';
import type { Prisma } from '../generated';

export const gameRepo = {
  async findById(id: string) {
    return prisma.game.findUnique({ where: { id } });
  },

  async findAll() {
    return prisma.game.findMany({
      include: {
        teams: { include: { team: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getGameWithTeams(id: string) {
    return prisma.game.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            team: {
              include: {
                landmarks: true,
              },
            },
          },
        },
        questions: {
          include: { answer: true },
        },
        guesses: true,
      },
    });
  },

  async getActiveGames() {
    return prisma.game.findMany({
      where: { status: 'ACTIVE' },
      include: {
        teams: {
          include: { team: { include: { landmarks: true } } },
        },
        questions: {
          include: { answer: true },
        },
        guesses: true,
      },
    });
  },

  async create(data: {
    durationSeconds: number;
    hintsSchedule: number[];
    questionWindows: number[];
    createdById: string;
    teamIds: string[];
  }) {
    return prisma.game.create({
      data: {
        durationSeconds: data.durationSeconds,
        hintsSchedule: data.hintsSchedule,
        questionWindows: data.questionWindows,
        createdById: data.createdById,
        status: 'MODERATION',
        teams: {
          create: data.teamIds.map((teamId) => ({ teamId })),
        },
      },
      include: {
        teams: {
          include: { team: true },
        },
      },
    });
  },

  async updateStatus(id: string, status: 'LOBBY' | 'MODERATION' | 'ACTIVE' | 'FINISHED') {
    return prisma.game.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACTIVE' && { startedAt: new Date() }),
        ...(status === 'FINISHED' && { finishedAt: new Date() }),
      },
    });
  },

  async saveQuestion(args: { gameId: string; fromTeamId: string; toTeamId: string; text: string; askedAt: number }) {
    return prisma.question.create({ data: { ...args } });
  },

  async isTeamParticipant(gameId: string, teamId: string) {
    const gameTeam = await prisma.gameTeam.findUnique({
      where: { gameId_teamId: { gameId, teamId } },
    });

    return !!gameTeam;
  },

  async getGamesForTeam(teamId: string) {
    return prisma.game.findMany({
      where: {
        teams: { some: { teamId } },
      },
      include: {
        teams: {
          include: { team: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async saveSnapshot(gameId: string, state: Prisma.JsonObject) {
    return prisma.gameSnapshot.upsert({
      where: { gameId },
      update: { state, updatedAt: new Date() },
      create: { gameId, state, updatedAt: new Date() },
    });
  },

  async getLatestSnapshot(gameId: string) {
    return prisma.gameSnapshot.findUnique({
      where: { gameId },
    });
  },

  async deleteSnapshot(gameId: string) {
    return prisma.gameSnapshot.delete({ where: { gameId } }).catch(() => null);
  },

  async saveFinalScores(gameId: string, finalScores: Array<{ teamId: string; score: number }>) {
    return prisma.$transaction(
      finalScores.map((entry) =>
        prisma.gameTeam.update({
          where: { gameId_teamId: { gameId, teamId: entry.teamId } },
          data: { score: entry.score },
        }),
      ),
    );
  },

  // Результаты игры напрямую из БД
  async getGameResults(gameId: string) {
    const gameTeams = await prisma.gameTeam.findMany({
      where: { gameId },
      include: { team: true },
      orderBy: { score: 'desc' },
    });

    return gameTeams.map((gt, index) => ({
      teamId: gt.teamId,
      teamName: gt.team.name,
      score: gt.score,
      rank: index + 1,
    }));
  },
};
