import { prisma } from '../prisma';

export const teamRepo = {
  async findAll() {
    return prisma.team.findMany({
      include: {
        _count: {
          select: { gameTeams: true },
        },
        landmarks: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        landmarks: true,
      },
    });
  },

  async findByName(name: string) {
    return prisma.team.findUnique({ where: { name } });
  },

  async create(name: string, captainId: string) {
    return prisma.team.create({
      data: { name, captainId },
    });
  },

  async getTeamMembers(userId: string) {
    const members = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            gameTeams: {
              include: { game: true },
            },
          },
        },
      },
    });

    return members.map((member) => ({
      id: member.team.id,
      name: member.team.name,
      captainId: member.team.captainId,
      isCaptain: member.team.captainId === userId,
      games: member.team.gameTeams.map((gt) => ({
        id: gt.game.id,
        status: gt.game.status,
        startedAt: gt.game.startedAt,
      })),
    }));
  },
};
