import { Router } from 'express';
import { teamApplicationRepo } from '../db/repositories/team-application.repo';
import { teamApplicationService } from '../services/team-application.service';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';

export const teamApplicationRouter = Router();

// Подать заявку (USER)
teamApplicationRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      const [{ teamName, landmarkName, description, hints }, userId] = [req.body, req.user!.id];

      const application = await teamApplicationService.submitApplication({
        userId,
        teamName,
        landmarkName,
        description,
        hints,
      });

      res.status(201).json(application);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }),
);

// Получить свою заявку
teamApplicationRouter.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const application = await teamApplicationRepo.findByUser(req.user!.id);
    res.json(application);
  }),
);

// Получить все заявки (ADMIN)
teamApplicationRouter.get(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req, res) => {
    const applications = await teamApplicationRepo.findAll();
    res.json(applications);
  }),
);

// Одобрить заявку (ADMIN)
teamApplicationRouter.post(
  '/:id/approve',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const team = await teamApplicationService.approveApplication(req.params.id);
    res.json(team);
  }),
);

// Отклонить заявку (ADMIN)
teamApplicationRouter.post(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    await teamApplicationService.rejectApplication(req.params.id);
    res.json({ success: true });
  }),
);
