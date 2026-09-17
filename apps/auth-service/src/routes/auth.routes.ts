import { Router } from 'express';
import { authService } from '../services/auth.service';
import { userRepo } from '../db/repositories/user.repo';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRouter = Router();

// Регистрация
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        message: 'Email, пароль и имя обязательны',
        code: 'VALIDATION_ERROR',
      });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        message: 'Некорректный email',
        code: 'VALIDATION_ERROR',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Пароль должен быть не менее 6 символов',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await authService.register({ email, password, fullName, phone });

    authService.setAuthCookie(res, result.token);

    res.status(201).json(result);
  } catch (error: any) {
    const status = error.message.includes('уже существует') ? 409 : 400;
    res.status(status).json({ message: error.message });
  }
});

// Вход
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email и пароль обязательны',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await authService.login(email, password);

    authService.setAuthCookie(res, result.token);

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

// Логаут
authRouter.post('/logout', (_req, res) => {
  try {
    authService.clearAuthCookie(res);
    res.status(200).json({});
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

// Получить текущего пользователя
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = await userRepo.findById(req.user!.id);

  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  res.json(authService.toPublicUser(user));
});
