import { prisma } from '../db/prisma';

export const teamService = {
  // Сменить капитана команды
  async changeCaptain(teamId: string, newCaptainId: string, actorId: string, actorRole: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new Error('Команда не найдена');
    }

    const isCaptain = team.captainId === actorId;
    const isAdmin = actorRole === 'ADMIN';

    if (!isCaptain && !isAdmin) {
      throw new Error('Нет прав на смену капитана');
    }

    const isMember = team.members.some((m) => m.userId === newCaptainId);

    if (!isMember) {
      throw new Error('Новый капитан должен быть участником команды');
    }

    if (team.captainId === newCaptainId) {
      throw new Error('Этот пользователь уже капитан');
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { captainId: newCaptainId },
    });

    return updated;
  },
};
