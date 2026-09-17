import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepo } from '../db/repositories/user.repo';

import type { Response } from 'express';
import type { User } from '../db/generated';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 часа

export const authService = {
  async register(data: UserRegisterData) {
    const existing = await userRepo.findByEmail(data.email);

    if (existing) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepo.create({ ...data, password: hashedPassword });
    const token = this.generateToken(user);

    return { user: this.toPublicUser(user), token };
  },

  async login(email: string, password: string) {
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Неверный email или пароль');
    }

    const token = this.generateToken(user);

    return { user: this.toPublicUser(user), token };
  },

  generateToken(user: UserPrimaryData) {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  },

  verifyToken(token: string): JWTVerificationResult | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTVerificationResult;
    } catch {
      return null;
    }
  },

  setAuthCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  },

  clearAuthCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  },

  getTokenFromCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
      const [key, value] = item.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    return cookies[COOKIE_NAME] || null;
  },

  toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    };
  },
};

type UserPrimaryData = Pick<User, 'id' | 'email' | 'role'>;
type UserRegisterData = Pick<User, 'email' | 'fullName' | 'phone' | 'password'>;

type JWTVerificationResult = UserPrimaryData;
