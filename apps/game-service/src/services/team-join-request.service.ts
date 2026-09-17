import { prisma } from '../db/prisma';
import { teamJoinRequestRepo } from '../db/repositories/team-join-request.repo';

export const teamJoinService = {
  // Подать запрос на вступление в команду
  async requestJoin(teamId: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new Error('Команда не найдена');
    }

    // Уже участник?
    const alreadyMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (alreadyMember) {
      throw new Error('Вы уже в этой команде');
    }

    // Есть ли уже запрос?
    const existing = await teamJoinRequestRepo.findByTeamAndUser(teamId, userId);

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new Error('Запрос уже отправлен');
      }

      if (existing.status === 'APPROVED') {
        throw new Error('Запрос уже одобрен');
      }

      // REJECTED — разрешаем повторную подачу
      return teamJoinRequestRepo.updateStatus(existing.id, 'PENDING');
    }

    return teamJoinRequestRepo.create(teamId, userId);
  },

  // Одобрить запрос
  async approve(requestId: string, actorId: string, actorRole: string) {
    const request = await teamJoinRequestRepo.findById(requestId);

    if (!request) {
      throw new Error('Запрос не найден');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Запрос уже обработан');
    }

    // Проверка прав: капитан или ADMIN
    const isCaptain = request.team.captainId === actorId;
    const isAdmin = actorRole === 'ADMIN';

    if (!isCaptain && !isAdmin) {
      throw new Error('Нет прав на одобрение запроса');
    }

    // Добавляем в команду
    await prisma.teamMember.create({
      data: {
        teamId: request.teamId,
        userId: request.userId,
      },
    });

    await teamJoinRequestRepo.updateStatus(requestId, 'APPROVED');

    return request;
  },

  // Отклонить запрос
  async reject(requestId: string, actorId: string, actorRole: string) {
    const request = await teamJoinRequestRepo.findById(requestId);

    if (!request) {
      throw new Error('Запрос не найден');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Запрос уже обработан');
    }

    const isCaptain = request.team.captainId === actorId;
    const isAdmin = actorRole === 'ADMIN';

    if (!isCaptain && !isAdmin) {
      throw new Error('Нет прав на отклонение запроса');
    }

    await teamJoinRequestRepo.updateStatus(requestId, 'REJECTED');
  },

  // Отменить свой запрос
  async cancel(teamId: string, userId: string) {
    const request = await teamJoinRequestRepo.findByTeamAndUser(teamId, userId);

    if (!request || request.status !== 'PENDING') {
      throw new Error('Активный запрос не найден');
    }

    await teamJoinRequestRepo.delete(request.id);
  },
};
