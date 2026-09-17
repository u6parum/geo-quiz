import { prisma } from '../prisma';
import type { JoinRequestStatus } from '../generated';

export const teamJoinRequestRepo = {
  // Создать запрос на вступление
  async create(teamId: string, userId: string) {
    return prisma.teamJoinRequest.create({
      data: { teamId, userId },
    });
  },

  // Все PENDING-запросы команды
  async findByTeam(teamId: string) {
    return prisma.teamJoinRequest.findMany({
      where: { teamId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Все запросы пользователя (любого статуса)
  async findByUser(userId: string) {
    return prisma.teamJoinRequest.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Запрос по ID (с командой)
  async findById(id: string) {
    return prisma.teamJoinRequest.findUnique({
      where: { id },
      include: { team: true },
    });
  },

  // Запрос конкретного пользователя в конкретную команду
  async findByTeamAndUser(teamId: string, userId: string) {
    return prisma.teamJoinRequest.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
  },

  // Обновить статус
  async updateStatus(id: string, status: JoinRequestStatus) {
    return prisma.teamJoinRequest.update({
      where: { id },
      data: { status },
    });
  },

  // Удалить запрос
  async delete(id: string) {
    return prisma.teamJoinRequest.delete({ where: { id } });
  },
};
