import { http } from '@api/http';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
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
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return await http<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return await http<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async refresh(): Promise<AuthResponse> {
    return http<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
  },

  async session(): Promise<AuthResponse> {
    return http<AuthResponse>('/auth/session');
  },

  async me(): Promise<{ user: AuthUser }> {
    return await http<{ user: AuthUser }>('/auth/me');
  },

  async logout(): Promise<void> {
    await http<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};
