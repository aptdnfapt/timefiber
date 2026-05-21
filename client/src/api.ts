import type { Entry } from './types';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/verify') {
    localStorage.removeItem('auth_token');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (password: string) =>
    apiRequest<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  verifyPassword: (password: string) =>
    apiRequest<{ valid: boolean }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getEntries: (): Promise<Entry[]> => apiRequest<Entry[]>('/entries'),

  createEntry: (data: Record<string, string>): Promise<Entry> =>
    apiRequest<Entry>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEntry: (id: number, column: string, value: string): Promise<Entry> =>
    apiRequest<Entry>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ column, value }),
    }),

  deleteEntry: (id: number) =>
    apiRequest(`/entries/${id}`, {
      method: 'DELETE',
    }),

  getImages: (): Promise<{ images: { uuid: string; url: string }[] }> =>
    apiRequest<{ images: { uuid: string; url: string }[] }>('/uploads'),

  deleteImage: (uuid: string) =>
    apiRequest(`/uploads/${uuid}`, {
      method: 'DELETE',
    }),
};
