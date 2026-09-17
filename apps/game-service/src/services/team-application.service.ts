import { AppError } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { teamApplicationRepo } from '../db/repositories/team-application.repo';
import { Hint, HintGroup } from '@shared';

export const teamApplicationService = {
  async submitApplication(data: {
    userId: string;
    teamName: string;
    landmarkName: string;
    description: string;
    hints: any[];
  }) {
    const existing = await teamApplicationRepo.findByUser(data.userId);

    if (existing) {
      throw new AppError('У вас уже есть активная заявка', 409, 'DUPLICATE_APPLICATION');
    }

    return teamApplicationRepo.create({
      userId: data.userId,
      teamName: data.teamName,
      landmarkName: data.landmarkName,
      description: data.description,
      hints: data.hints as any,
    });
  },

  async approveApplication(applicationId: string) {
    const application = await teamApplicationRepo.findById(applicationId);

    if (!application) {
      throw new AppError('Заявка не найдена', 404, 'APPLICATION_NOT_FOUND');
    }

    if (application.status !== 'PENDING') {
      throw new AppError('Заявка уже обработана', 400, 'ALREADY_PROCESSED');
    }

    // Создаём команду с капитаном
    const team = await prisma.team.create({
      data: {
        name: application.teamName,
        captainId: application.userId,
        members: {
          create: [{ userId: application.userId }],
        },
      },
    });

    // Нормализуем подсказки — добавляем id
    const rawHints = application.hints as Array<{
      group: number;
      text: string;
    }>;

    const normalizedHints: Hint[] = rawHints.map((hint) => ({
      id: crypto.randomUUID(),
      group: hint.group as HintGroup,
      text: hint.text,
    }));

    // Создаём достопримечательность
    await prisma.landmark.create({
      data: {
        teamId: team.id,
        name: application.landmarkName,
        description: application.description,
        hints: normalizedHints as any,
        status: 'APPROVED',
      },
    });

    // Обновляем заявку
    await teamApplicationRepo.updateStatus(applicationId, 'APPROVED');
    await teamApplicationRepo.attachToTeam(applicationId, team.id);

    return team;
  },

  async rejectApplication(applicationId: string) {
    const application = await teamApplicationRepo.findById(applicationId);

    if (!application) {
      throw new AppError('Заявка не найдена', 404, 'APPLICATION_NOT_FOUND');
    }

    await teamApplicationRepo.updateStatus(applicationId, 'REJECTED');
  },
};
