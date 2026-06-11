import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useAdminApi() {
  const { getAccessTokenSilently } = useAuth0();

  const adminFetch = useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        let message = body;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error ?? body;
        } catch {
          // use raw body
        }
        throw new Error(message || 'Request failed');
      }

      const json = await res.json();
      return json.data as T;
    },
    [getAccessTokenSilently]
  );

  const adminFetchList = useCallback(
    async <T>(path: string, options?: RequestInit): Promise<{ data: T; count: number }> => {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        let message = body;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error ?? body;
        } catch {
          // use raw body
        }
        throw new Error(message || 'Request failed');
      }

      const json = await res.json();
      const data = json.data as T;
      const count = json.meta?.count ?? (Array.isArray(data) ? data.length : 0);
      return { data, count };
    },
    [getAccessTokenSilently]
  );

  return { adminFetch, adminFetchList };
}
