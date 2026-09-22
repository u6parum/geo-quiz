import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../db/prisma';
import { userRepo } from '../db/repositories/user.repo';

import type { Response } from 'express';
import type { Prisma } from '../db/generated';

type PrismaTransaction = Prisma.TransactionClient;
type User = { id: string; email: string; role: string };

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_COOKIE_MAX_AGE,
  path: '/api/auth',
} as const;

export const authService = {
  // ==================
  // РЕГИСТРАЦИЯ
  // ==================
  async register(data: { email: string; fullName: string; phone: string; password: string }) {
    const existing = await userRepo.findByEmail(data.email);

    if (existing) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await userRepo.create({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      password: hashedPassword,
    });

    const tokens = await this.issueTokens(user);

    return { ...tokens, user };
  },

  // ==================
  // ЛОГИН
  // ==================
  async login(email: string, password: string) {
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Неверный email или пароль');
    }

    const tokens = await this.issueTokens(user);

    return { ...tokens, user };
  },

  issueAccessToken(user: User) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  },

  // ==================
  // ВЫДАЧА ПАРЫ ТОКЕНОВ
  // ==================
  async issueTokens(user: User, transaction?: PrismaTransaction) {
    const accessToken = this.issueAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');

    await (transaction ?? prisma).refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  },

  // ==================
  // ОБНОВЛЕНИЕ ТОКЕНОВ (с ротацией)
  // ==================
  async refresh(refreshToken: string) {
    return prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!stored) {
        throw new Error('Refresh-токен не найден');
      }

      if (stored.revokedAt) {
        throw new Error('Refresh-токен отозван');
      }

      if (stored.expiresAt < new Date()) {
        throw new Error('Refresh-токен истёк');
      }

      const user = await tx.user.findUnique({
        where: { id: stored.userId },
      });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Ротация: удаляем старый, создаём новый
      await tx.refreshToken.delete({ where: { token: refreshToken } });

      const tokens = await this.issueTokens(user);

      return { ...tokens, user };
    });
  },

  // ==================
  // ОТЗЫВ REFRESH-ТОКЕНА
  // ==================
  async revokeRefreshToken(refreshToken: string) {
    await prisma.refreshToken
      .update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      })
      .catch(() => null);
  },

  // ==================
  // ПРОВЕРКА ТЕКУЩЕЙ СЕССИИ
  // ==================
  async getSession(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored) {
      throw new Error('Сессия не найдена');
    }

    if (stored.revokedAt) {
      throw new Error('Сессия отозвана');
    }

    if (stored.expiresAt < new Date()) {
      throw new Error('Сессия истекла');
    }

    const user = await userRepo.findById(stored.userId);

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    return { user, accessToken: this.issueAccessToken(user) };
  },

  // ==================
  // JWT
  // ==================
  verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };
    } catch {
      return null;
    }
  },

  // ==================
  // COOKIE
  // ==================
  setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
  },

  clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  },

  getRefreshTokenFromCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
      const [key, value] = item.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    return cookies[REFRESH_COOKIE_NAME] || null;
  },

  toPublicUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    };
  },
};
