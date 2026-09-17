import { prisma } from '../prisma';
import type { ApplicationStatus, Prisma } from '../generated';

export const teamApplicationRepo = {
  async create(data: {
    userId: string;
    teamName: string;
    landmarkName: string;
    description: string;
    hints: Prisma.JsonObject;
  }) {
    return prisma.teamApplication.create({ data });
  },

  async findByUser(userId: string) {
    return prisma.teamApplication.findUnique({
      where: { userId },
      include: { team: true },
    });
  },

  async findAll() {
    return prisma.teamApplication.findMany({
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.teamApplication.findUnique({
      where: { id },
      include: { team: true },
    });
  },

  async updateStatus(id: string, status: ApplicationStatus) {
    return prisma.teamApplication.update({
      where: { id },
      data: { status },
    });
  },

  async attachToTeam(id: string, teamId: string) {
    return prisma.teamApplication.update({
      where: { id },
      data: { teamId },
    });
  },
};
