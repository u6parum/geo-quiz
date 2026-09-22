import { $accessToken } from './access-token';
import { tryRefresh } from './refresh';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);

    this.status = status;
  }
}

export async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `/api${url}`;

  const doRequest = (token: string | null) =>
    fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    });

  let token = $accessToken.getState();
  let response = await doRequest(token);

  // Если 401 — пробуем refresh и повторяем
  // НЕ пытаемся обновлять для /auth/* — там своя логика
  if (response.status === 401 && !url.startsWith('/auth/')) {
    const newToken = await tryRefresh();

    if (newToken) {
      response = await doRequest(newToken);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message ?? 'Произошла ошибка');
  }

  return response.json();
}
