import { http } from '@api/http';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

export interface RegisterPayload {
  email: string;
  fullName: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthUser> {
    const response = await http<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.user;
  },

  async login(payload: LoginPayload): Promise<AuthUser> {
    const response = await http<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.user;
  },

  async me(): Promise<AuthUser> {
    return await http<AuthUser>('/auth/me');
  },

  async logout(): Promise<void> {
    await http<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};
