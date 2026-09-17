const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

export async function fetchUsersFromAuthService(userIds: string[]): Promise<AuthUser[]> {
  if (userIds.length === 0) {
    return [];
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/users/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: userIds }),
    });

    if (!response.ok) {
      console.error('Ошибка запроса пользователей:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка запроса пользователей:', error);
    return [];
  }
}
