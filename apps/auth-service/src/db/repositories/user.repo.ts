import { prisma } from '../prisma';

import type { User, Role } from '../generated';

export const userRepo = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: { email: string; fullName: string; phone: string; password: string; role?: Role }): Promise<User> {
    return prisma.user.create({ data });
  },

  async updatePassword(id: string, password: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { password },
    });
  },

  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
};
