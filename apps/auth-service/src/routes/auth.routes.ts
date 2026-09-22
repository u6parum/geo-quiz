import { Router } from 'express';
import { authService } from '../services/auth.service';
import { userRepo } from '../db/repositories/user.repo';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRouter = Router();

// ==================
// РЕГИСТРАЦИЯ
// ==================
authRouter.post('/register', async (req, res) => {
  try {
    const { email, fullName, phone, password } = req.body;

    if (!email || !fullName || !phone || !password) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Некорректный email' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль минимум 6 символов' });
    }

    const { user, accessToken, refreshToken } = await authService.register({
      email,
      fullName,
      phone,
      password,
    });

    authService.setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user: authService.toPublicUser(user),
      accessToken,
    });
  } catch (error: any) {
    const status = error.message.includes('уже существует') ? 409 : 400;
    res.status(status).json({ message: error.message });
  }
});

// ==================
// ЛОГИН
// ==================
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    const { user, accessToken, refreshToken } = await authService.login(email, password);

    authService.setRefreshCookie(res, refreshToken);

    res.json({
      user: authService.toPublicUser(user),
      accessToken,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

// ==================
// ОБНОВЛЕНИЕ ACCESS-ТОКЕНА
// ==================
authRouter.post('/refresh', async (req, res) => {
  try {
    const refreshToken = authService.getRefreshTokenFromCookie(req.headers.cookie);

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh-токен отсутствует' });
    }

    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    authService.setRefreshCookie(res, newRefreshToken);

    res.json({
      user: authService.toPublicUser(user),
      accessToken,
    });
  } catch (error: any) {
    authService.clearRefreshCookie(res);
    res.status(401).json({ message: error.message });
  }
});

// ==================
// ПОЛУЧЕНИЕ СЕССИИ
// ==================
authRouter.get('/session', async (req, res) => {
  try {
    const refreshToken = authService.getRefreshTokenFromCookie(req.headers.cookie);

    if (!refreshToken) {
      return res.status(401).json({ message: 'Нет сессии' });
    }

    const { user, accessToken } = await authService.getSession(refreshToken);

    res.json({
      user: authService.toPublicUser(user),
      accessToken,
    });
  } catch (error: any) {
    authService.clearRefreshCookie(res);
    res.status(401).json({ message: error.message });
  }
});

// ==================
// ВЫХОД
// ==================
authRouter.post('/logout', async (req, res) => {
  const refreshToken = authService.getRefreshTokenFromCookie(req.headers.cookie);

  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken);
  }

  authService.clearRefreshCookie(res);
  res.json({ success: true });
});

// ==================
// ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
// ==================
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = await userRepo.findById(req.user!.id);

  if (!user) {
    return res.status(401).json({ message: 'Пользователь не найден' });
  }

  res.json({ user: authService.toPublicUser(user) });
});
