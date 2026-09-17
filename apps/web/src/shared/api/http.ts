export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);

    this.status = status;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message ?? 'Произошла ошибка');
  }

  return response.json();
}
