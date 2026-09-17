import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';
import { teamRepo } from '../db/repositories/team.repo';
import { teamJoinRequestRepo } from '../db/repositories/team-join-request.repo';
import { teamJoinService } from '../services/team-join-request.service';
import { fetchUsersFromAuthService } from '../services/auth-client.service';
import { teamService } from '../services/team.service';

export const teamRouter = Router();

// Мои команды
teamRouter.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json(await teamRepo.getTeamMembers(req.user!.id));
  }),
);

// Мои активные запросы на вступление
teamRouter.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await teamJoinRequestRepo.findByUser(req.user!.id);
    res.json(requests);
  } catch (error) {
    console.error('Ошибка загрузки запросов', error);
    res.status(500).json({ message: 'Ошибка загрузки запросов' });
  }
});

// Все команды — доступно всем авторизованным
teamRouter.get('/all', authMiddleware, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        landmarks: true,
      },
      orderBy: { name: 'asc' },
    });

    const result = teams.map((team) => ({
      id: team.id,
      name: team.name,
      captainId: team.captainId,
      membersCount: team.members.length,
      landmarkName: team.landmarks[0]?.name ?? null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Ошибка загрузки всех команд', error);
    res.status(500).json({ message: 'Ошибка загрузки команд' });
  }
});

// Получить все команды (админ)
teamRouter.get(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req, res) => {
    const teams = await teamRepo.findAll();
    const formatted = teams.map((t) => ({
      id: t.id,
      name: t.name,
      landmarks: t.landmarks,
      captainId: t.captainId,
      gamesCount: t._count.gameTeams,
    }));

    res.json(formatted);
  }),
);

// Создать команду (админ)
teamRouter.post(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { captainId, name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Название команды обязательно' });
    }

    if (!captainId || typeof captainId !== 'string') {
      return res.status(400).json({ message: 'Не задан капитан команды' });
    }

    const existing = await teamRepo.findByName(name.trim());

    if (existing) {
      return res.status(409).json({ message: 'Команда с таким названием уже существует' });
    }

    const team = await teamRepo.create(name.trim(), captainId);

    res.status(201).json(team);
  }),
);

// Участники команды (для выбора нового капитана)
teamRouter.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({ message: 'Команда не найдена' });
    }

    const isMember = team.members.some((m) => m.userId === req.user!.id);
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    const userIds = team.members.map((m) => m.userId);
    const users = await fetchUsersFromAuthService(userIds);

    const enriched = team.members.map((member) => {
      const user = users.find((u) => u.id === member.userId);
      return {
        userId: member.userId,
        fullName: user?.fullName ?? 'Пользователь',
        email: user?.email ?? '',
        isCaptain: member.userId === team.captainId,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Ошибка загрузки участников', error);
    res.status(500).json({ message: 'Ошибка загрузки участников' });
  }
});

// Сменить капитана (ADMIN или текущий капитан)
teamRouter.post('/:id/change-captain', authMiddleware, async (req, res) => {
  try {
    const { newCaptainId } = req.body;

    if (!newCaptainId) {
      return res.status(400).json({ message: 'Укажите нового капитана' });
    }

    await teamService.changeCaptain(req.params.id, newCaptainId, req.user!.id, req.user!.role);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Подать запрос на вступление
teamRouter.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const request = await teamJoinService.requestJoin(req.params.id, req.user!.id);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Отменить свой запрос на вступление
teamRouter.delete('/:id/join', authMiddleware, async (req, res) => {
  try {
    await teamJoinService.cancel(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Список запросов команды на вступление (капитан или ADMIN)
teamRouter.get('/:id/join-requests', authMiddleware, async (req, res) => {
  try {
    const team = await teamRepo.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Команда не найдена' });
    }

    const isCaptain = team.captainId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCaptain && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав на просмотр запросов' });
    }

    const requests = await teamJoinRequestRepo.findByTeam(req.params.id);

    // Запрашиваем данные пользователей из auth-service
    const userIds = requests.map((r) => r.userId);
    const users = await fetchUsersFromAuthService(userIds);

    const enriched = requests.map((request) => {
      const user = users.find((u: any) => u.id === request.userId);
      return {
        ...request,
        user: user ?? null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Ошибка загрузки запросов команды', error);
    res.status(500).json({ message: 'Ошибка загрузки запросов' });
  }
});

// Одобрить запрос на вступление
teamRouter.post('/:id/join-requests/:requestId/approve', authMiddleware, async (req, res) => {
  try {
    await teamJoinService.approve(req.params.requestId, req.user!.id, req.user!.role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Отклонить запрос на вступление
teamRouter.post('/:id/join-requests/:requestId/reject', authMiddleware, async (req, res) => {
  try {
    await teamJoinService.reject(req.params.requestId, req.user!.id, req.user!.role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Получить команду по ID
teamRouter.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        landmarks: true,
        gameTeams: {
          include: { game: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ message: 'Команда не найдена' });
    }

    res.json({
      id: team.id,
      name: team.name,
      captainId: team.captainId,
      isCaptain: team.captainId === req.user!.id,
      games: team.gameTeams.map((gt) => ({
        id: gt.game.id,
        status: gt.game.status,
        startedAt: gt.game.startedAt,
        finishedAt: gt.game.finishedAt,
      })),
    });
  }),
);
